/**
 * Noteme's background service worker (manifest `background`), built on its own by scripts/build-worker.ts: no Angular,
 * no DOM. It answers the address bar ("nm words" searches the notes) and shows the reminders of the plans. Chrome
 * stops it when idle and starts it again for an event, so it keeps nothing in memory that it cannot read again, and
 * registers every listener right away.
 */
import type Fuse from 'fuse.js';

import { localeTag, resolveLanguage } from '../app/i18n/language';
import { message } from '../app/i18n/messages';
// A worker cannot wait for a language to load: every one comes with it.
import '../app/i18n/messages/all';
import { parsePlans, PlanItem } from '../app/plan/plan';
import {
  isReminderDue,
  REMINDER_PREFIX,
  reminderKey,
  reminderPlan,
  reminderText,
  upcomingReminders,
} from '../app/plan/reminders';
import { DEVICE_SETTINGS_KEY, DeviceSettings, parseDeviceSettings } from '../app/services/device-settings';
import { ART_BOARD_ITEM_PREFIX, ITEM_DATA_PREFIX, PLAN_KEY } from '../app/services/storage-keys';
import { escapeXml, omniboxIndex, OmniboxNote, omniboxNotes, omniboxSuggestions, omniboxTarget } from './omnibox';

const BASE = chrome.runtime.getURL('index.html');
const ICON = chrome.runtime.getURL('assets/icons/noteme-icon-128.png');

/** The settings as last read, for as long as Chrome keeps the worker; read again once they change. */
let cachedSettings: Promise<DeviceSettings> | undefined;

function deviceSettings(): Promise<DeviceSettings> {
  cachedSettings ??= chrome.storage.local.get(DEVICE_SETTINGS_KEY).then(
    (stored) => parseDeviceSettings(stored[DEVICE_SETTINGS_KEY]),
    (error: unknown) => {
      cachedSettings = undefined;
      throw error;
    },
  );
  return cachedSettings;
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

/** Counts what is typed: an answer found for letters typed before the latest ones is dropped. */
let typed = 0;

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const current = ++typed;
  void (async () => {
    const [{ language: setting }, notes] = await Promise.all([deviceSettings(), notesIndex()]);
    if (current !== typed) {
      return;
    }
    const language = resolveLanguage(setting);
    const query = text.trim();
    // Chrome's own row: what Enter searches for, or with nothing typed yet, what "nm" does.
    void chrome.omnibox.setDefaultSuggestion({
      description: query
        ? message(language, 'omnibox.search', `<match>${escapeXml(query)}</match>`)
        : escapeXml(message(language, 'board.search')),
    });
    suggest(omniboxSuggestions(notes, text, BASE, language));
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
  const [settings, items, alarms, announced] = await Promise.all([
    deviceSettings(),
    plans(),
    chrome.alarms.getAll(),
    reminded(),
  ]);
  const now = Date.now();
  const wanted =
    settings.plan && settings.reminders
      ? upcomingReminders(items, settings.reminderLead, now, undefined, new Set(announced))
      : [];
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

/**
 * The plans announced, each at the time it is set for (`reminderKey`), so one announced before it starts is not
 * announced again when it does. Kept for the browser session (chrome.storage.session): the worker itself comes and
 * goes.
 */
const REMINDED_KEY = 'reminded';

async function reminded(): Promise<string[]> {
  const stored = await chrome.storage.session.get(REMINDED_KEY);
  const keys: unknown = stored[REMINDED_KEY];
  return Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string') : [];
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
    // Only the plans still there are kept, so the list stays as short as the plans are few.
    const current = new Set(items.map(reminderKey));
    const announced = [...(await reminded()).filter((key) => current.has(key)), reminderKey(item)];
    await chrome.storage.session.set({ [REMINDED_KEY]: [...new Set(announced)] });
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
  if (keys.includes(DEVICE_SETTINGS_KEY)) {
    cachedSettings = undefined;
  }
  if (keys.includes(PLAN_KEY) || keys.includes(DEVICE_SETTINGS_KEY)) {
    reschedule();
  }
  if (keys.some((key) => key.startsWith(ITEM_DATA_PREFIX) || key.startsWith(ART_BOARD_ITEM_PREFIX))) {
    index = undefined;
  }
});
