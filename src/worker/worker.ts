/**
 * Noteme's background service worker (manifest `background`), built on its own by scripts/build-worker.ts: no Angular,
 * no DOM. It answers the address bar ("nm words" searches the notes) and shows the reminders of the plans. Chrome
 * stops it when idle and starts it again for an event, so it keeps nothing in memory that it cannot read again, and
 * registers every listener right away.
 */
import type Fuse from 'fuse.js';

import { localeTag, resolveLanguage } from '../app/i18n/language';
import { message } from '../app/i18n/messages';
import { parsePlans, PlanItem } from '../app/plan/plan';
import { isReminderDue, REMINDER_PREFIX, reminderPlan, reminderText, upcomingReminders } from '../app/plan/reminders';
import { DEVICE_SETTINGS_KEY, DeviceSettings, parseDeviceSettings } from '../app/services/device-settings';
import { escapeXml, omniboxIndex, OmniboxNote, omniboxNotes, omniboxSuggestions, omniboxTarget } from './omnibox';

/** The one record holding every plan (plan.service.ts). */
const PLAN_KEY = 'PLAN__ITEMS';
const BASE = chrome.runtime.getURL('index.html');
const ICON = chrome.runtime.getURL('assets/icons/noteme-icon-128.png');

async function deviceSettings(): Promise<DeviceSettings> {
  const stored = await chrome.storage.local.get(DEVICE_SETTINGS_KEY);
  return parseDeviceSettings(stored[DEVICE_SETTINGS_KEY]);
}

function parseJson(text: unknown): unknown {
  try {
    return typeof text === 'string' ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function plans(): Promise<PlanItem[]> {
  const stored = await chrome.storage.local.get(PLAN_KEY);
  return parsePlans(parseJson(stored[PLAN_KEY]));
}

// --- The address bar ---

/** The notes as last read, for as long as Chrome keeps the worker; read again once a note changes. */
let index: Promise<Fuse<OmniboxNote>> | undefined;

function notesIndex(): Promise<Fuse<OmniboxNote>> {
  index ??= chrome.storage.local.get(null).then(
    (stored) => omniboxIndex(omniboxNotes(stored)),
    (error: unknown) => {
      index = undefined;
      throw error;
    },
  );
  return index;
}

chrome.omnibox.onInputStarted.addListener(() => {
  // Read ahead: the first letters typed already find notes.
  void notesIndex().catch(() => undefined);
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  void (async () => {
    const language = resolveLanguage((await deviceSettings()).language);
    const query = text.trim();
    if (query) {
      void chrome.omnibox.setDefaultSuggestion({
        description: message(language, 'omnibox.search', `<match>${escapeXml(query)}</match>`),
      });
    }
    suggest(omniboxSuggestions(await notesIndex(), text, BASE, language));
  })().catch((error: unknown) => console.error('Noteme could not search the notes', error));
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const url = omniboxTarget(text, BASE);
  if (disposition === 'currentTab') {
    void chrome.tabs.update({ url });
  } else {
    void chrome.tabs.create({ url, active: disposition === 'newForegroundTab' });
  }
});

// --- Reminders ---

/**
 * One alarm per plan still to come, named after it. Run whenever the plans or the settings change, when Chrome
 * starts and after each reminder: alarms no plan asks for any more are cleared, the others set to their time.
 */
async function scheduleReminders(): Promise<void> {
  const [settings, items, alarms] = await Promise.all([deviceSettings(), plans(), chrome.alarms.getAll()]);
  const now = Date.now();
  const wanted = settings.plan && settings.reminders ? upcomingReminders(items, settings.reminderLead, now) : [];
  const names = new Set(wanted.map((reminder) => reminder.name));
  const set = new Map(alarms.map((alarm) => [alarm.name, alarm.scheduledTime]));
  await Promise.all([
    ...alarms
      // One already due is left to go off: it decides by itself whether its plan is still worth announcing.
      .filter((alarm) => alarm.name.startsWith(REMINDER_PREFIX) && !names.has(alarm.name) && alarm.scheduledTime > now)
      .map((alarm) => chrome.alarms.clear(alarm.name)),
    ...wanted
      .filter((reminder) => set.get(reminder.name) !== reminder.when)
      .map((reminder) => chrome.alarms.create(reminder.name, { when: reminder.when })),
  ]);
}

async function remind(name: string): Promise<void> {
  const [settings, items] = await Promise.all([deviceSettings(), plans()]);
  const item = reminderPlan(name, items);
  // Switched off, deleted or moved since the alarm was set: nothing to say (a moved plan has its new alarm).
  if (
    item &&
    settings.plan &&
    settings.reminders &&
    chrome.notifications &&
    isReminderDue(item, settings.reminderLead, Date.now())
  ) {
    const language = resolveLanguage(settings.language);
    await chrome.notifications.create(name, {
      type: 'basic',
      iconUrl: ICON,
      title: item.title,
      message: reminderText(item, settings.clock, localeTag(language), message(language, 'plan.allDay')),
    });
  }
  await scheduleReminders();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(REMINDER_PREFIX)) {
    void remind(alarm.name).catch((error: unknown) => console.error('Noteme could not show a reminder', error));
  }
});

/** A click on a reminder opens the plan's week. */
async function openPlan(name: string): Promise<void> {
  const item = reminderPlan(name, await plans());
  await chrome.tabs.create({ url: `${BASE}#/plan?view=week${item ? `&date=${item.date}` : ''}` });
  await chrome.notifications.clear(name);
}

let listeningToNotifications = false;

/** chrome.notifications is only there once its permission is granted (Settings › Plan › Reminders). */
function listenToNotifications(): void {
  if (listeningToNotifications || !chrome.notifications) {
    return;
  }
  listeningToNotifications = true;
  chrome.notifications.onClicked.addListener((name) => {
    if (name.startsWith(REMINDER_PREFIX)) {
      void openPlan(name).catch((error: unknown) => console.error('Noteme could not open the plan', error));
    }
  });
}

listenToNotifications();
chrome.permissions.onAdded.addListener(listenToNotifications);

const reschedule = () =>
  void scheduleReminders().catch((error: unknown) => console.error('Noteme could not set the reminders', error));

chrome.runtime.onInstalled.addListener(reschedule);
chrome.runtime.onStartup.addListener(reschedule);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') {
    return;
  }
  const keys = Object.keys(changes);
  if (keys.includes(PLAN_KEY) || keys.includes(DEVICE_SETTINGS_KEY)) {
    reschedule();
  }
  if (keys.some((key) => key.startsWith('ITEM_DATA__') || key.startsWith('ART_BOARD_ITEM__'))) {
    index = undefined;
  }
});
