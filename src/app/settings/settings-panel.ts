import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import './settings-elements';
import type { Select } from '@c2n/components/select';
import { formatRelativeTime } from '@c2n/components/relative-time';
import type { Switch } from '@c2n/components/switch';
import { PHOTO_THEMES, PhotoTheme } from '../home/background';
import { I18n } from '../i18n/i18n.service';
import { LANGUAGE_NAMES, LANGUAGES } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';
import type { ShownPhoto } from '../home/background.service';
import { TopSitesService } from '../home/top-sites.service';
import { REMINDER_LEADS, ReminderLead } from '../services/device-settings';
import { DeviceSettingsService } from '../services/device-settings.service';
import { SyncStatusService } from '../services/sync-status.service';
import { Feature, FEATURES, formatDate, hasFeature, Settings } from './settings';
import { SettingsService } from './settings.service';
import { formatBytes, readStorageUsage, StorageUsage } from './storage-usage';

/**
 * Settings, in a sheet over Home: the page stays visible behind it, so each change shows at once. Everything saves
 * by itself.
 */
@Component({
  selector: 'ntm-settings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.scss',
})
export class SettingsPanel {
  private readonly service = inject(SettingsService);
  private readonly topSites = inject(TopSitesService);
  private readonly device = inject(DeviceSettingsService);
  private readonly syncStatus = inject(SyncStatusService);
  private readonly i18n = inject(I18n);
  readonly t = this.i18n.t;

  readonly open = input(false);
  readonly photo = input<ShownPhoto | null>(null);
  readonly closed = output<void>();
  readonly changePhoto = output<void>();

  readonly settings = this.service.settings;
  readonly shortcutsSupported = this.topSites.supported;
  readonly themes = PHOTO_THEMES.map((theme) => ({
    id: theme.id,
    label: `settings.photoTheme.${theme.id}` as MessageKey,
  }));
  readonly features = FEATURES.map((feature) => ({
    id: feature.id,
    label: `settings.feature.${feature.id}` as MessageKey,
    description: `settings.feature.${feature.id}.description` as MessageKey,
  }));
  /** Each language in its own name: whoever looks for theirs can read it. */
  readonly languages = LANGUAGES.map((id) => ({ id, name: LANGUAGE_NAMES[id] }));
  readonly planOn = computed(() => hasFeature(this.settings(), 'plan'));
  /** Each date format, shown with today's date in the current language. */
  readonly dateFormats = computed(() =>
    (['long', 'short', 'numeric'] as const).map((format) => ({
      format,
      label: formatDate(new Date(), format, this.i18n.locale()),
    })),
  );

  /** Reminders of the plans: in the extension only, where the background worker shows them. */
  readonly remindersSupported = this.device.supported;
  readonly reminders = this.device.reminders;
  readonly reminderLead = this.device.reminderLead;
  readonly reminderLeads = REMINDER_LEADS;

  /** The sync with the Chrome profile, in the extension only: when it last went through, and what went wrong. */
  readonly syncSupported = this.syncStatus.supported;
  readonly syncing = this.syncStatus.syncing;
  /** The time "5 minutes ago" is counted from: when the sheet opened, or the status last changed. */
  private readonly now = signal(Date.now());
  readonly syncText = computed(() => {
    if (this.syncing()) {
      return this.t('settings.sync.status.syncing');
    }
    const at = this.syncStatus.status().at;
    return at === undefined
      ? this.t('settings.sync.status.never')
      : this.t(
          'settings.sync.status.synced',
          // Never "in 2 seconds": a status written a moment after the sheet opened is now.
          formatRelativeTime(new Date(at), new Date(Math.max(this.now(), at)), { locale: this.i18n.locale() }),
        );
  });
  readonly syncError = computed(() => {
    const error = this.syncStatus.status().error;
    if (!error) {
      return null;
    }
    return error.kind === 'full'
      ? this.t('settings.sync.error.full')
      : error.kind === 'busy'
        ? this.t('settings.sync.error.busy')
        : this.t('settings.sync.error.other', error.detail);
  });

  /** How much room Noteme takes, measured each time the sheet opens and when sync is switched. */
  private readonly usage = signal<StorageUsage>({});
  readonly storage = computed(() => {
    const { notes, files, sync } = this.usage();
    const size = (bytes: number) => formatBytes(bytes, this.i18n.locale());
    return {
      notes: notes === undefined ? null : size(notes),
      files: files === undefined ? null : size(files),
      sync: sync && {
        used: sync.used,
        quota: sync.quota,
        text: this.t('settings.storage.sync.value', size(sync.used), size(sync.quota)),
        waiting: sync.waiting,
      },
    };
  });
  readonly hasStorage = computed(() => {
    const { notes, files, sync } = this.storage();
    return notes !== null || files !== null || !!sync;
  });

  constructor() {
    effect(() => {
      // Counted again when the sheet opens and when the status changes.
      this.open();
      this.syncStatus.status();
      this.now.set(Date.now());
    });
    effect((onCleanup) => {
      if (!this.open()) {
        return;
      }
      // Measured again once a sync has gone through.
      this.syncStatus.status();
      let current = true;
      onCleanup(() => (current = false));
      // The answer of an earlier measure (sync since switched) is dropped.
      void readStorageUsage(this.settings().sync).then((usage) => current && this.usage.set(usage));
    });
  }

  choose<K extends keyof Settings>(key: K, event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    if (value) {
      this.service.update({ [key]: value } as Partial<Settings>);
    }
  }

  select<K extends keyof Settings>(key: K, event: Event): void {
    const [value] = (event.target as Select).value;
    if (value) {
      this.service.update({ [key]: value } as Partial<Settings>);
    }
  }

  /** At least one theme stays chosen: unticking the last one puts it back. */
  chooseThemes(event: Event): void {
    const control = event.target as Select;
    const themes = control.value as PhotoTheme[];
    if (themes.length === 0) {
      control.value = [...this.settings().photoThemes];
      return;
    }
    this.service.update({ photoThemes: themes });
  }

  /** Any number of features, none included. */
  chooseFeatures(event: Event): void {
    this.service.update({ features: (event.target as Select).value as Feature[] });
  }

  toggle(key: 'quote' | 'photos' | 'sync', event: Event): void {
    this.service.update({ [key]: (event.target as Switch).checked });
  }

  /** Turning shortcuts on asks Chrome for the topSites permission; a refusal leaves them off. */
  async toggleShortcuts(event: Event): Promise<void> {
    const control = event.target as Switch;
    if (!control.checked) {
      this.service.update({ shortcuts: false });
      return;
    }
    const granted = await this.topSites.request();
    control.checked = granted;
    this.service.update({ shortcuts: granted });
  }

  /** Turning reminders on asks Chrome for the notifications permission; a refusal leaves them off. */
  async toggleReminders(event: Event): Promise<void> {
    const control = event.target as Switch;
    control.checked = await this.device.setReminders(control.checked);
  }

  syncNow(): void {
    void this.syncStatus.syncNow();
  }

  chooseReminderLead(event: Event): void {
    const minutes = Number((event.target as Select).value[0]);
    if (REMINDER_LEADS.includes(minutes as ReminderLead)) {
      this.device.setReminderLead(minutes as ReminderLead);
    }
  }
}
