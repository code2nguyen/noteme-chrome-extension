import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, input, output } from '@angular/core';
import './settings-elements';
import type { Select } from '@c2n/select';
import type { Switch } from '@c2n/switch';
import { DailyPhoto } from '../home/daily-photo';
import { TopSitesService } from '../home/top-sites.service';
import { formatDate, Settings } from './settings';
import { SettingsService } from './settings.service';

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

  readonly open = input(false);
  readonly photo = input<DailyPhoto | null>(null);
  readonly closed = output<void>();
  readonly changePhoto = output<void>();

  readonly settings = this.service.settings;
  readonly shortcutsSupported = this.topSites.supported;
  /** Each date format, shown with today's date. */
  readonly dateFormats = (['long', 'short', 'numeric'] as const).map((format) => ({
    format,
    label: formatDate(new Date(), format),
  }));

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

  toggle(key: 'quote', event: Event): void {
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
}
