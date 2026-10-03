import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { formatDate, formatTime } from '../settings/settings';
import { SettingsPanel } from '../settings/settings-panel';
import { SettingsService } from '../settings/settings.service';
import { DailyPhoto } from './daily-photo';
import { DailyPhotoService } from './daily-photo.service';
import { quoteOfTheDay } from './quotes';
import { Site, TopSitesService } from './top-sites.service';

type ShortcutsState = 'hidden' | 'ask' | 'shown';

/**
 * The new tab. Light on purpose: most new tabs are opened to go somewhere else, so the photo, the clock and the
 * shortcuts take the room, and Noteme itself is three links in the top bar.
 */
@Component({
  selector: 'ntm-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink, SettingsPanel],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class Home {
  private readonly settingsService = inject(SettingsService);
  private readonly photos = inject(DailyPhotoService);
  private readonly topSites = inject(TopSitesService);
  private readonly router = inject(Router);
  private readonly now = signal(new Date());

  readonly settings = this.settingsService.settings;
  readonly time = computed(() => formatTime(this.now(), this.settings().clock));
  readonly date = computed(() => formatDate(this.now(), this.settings().dateFormat));
  readonly quote = computed(() => (this.settings().quote ? quoteOfTheDay(this.now()) : null));

  readonly photo = signal<DailyPhoto | null>(this.photos.immediate(this.settings().photoSource));
  readonly sites = signal<Site[]>([]);
  readonly shortcuts = signal<ShortcutsState>('hidden');

  readonly settingsOpen = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.has('settings'))), {
    initialValue: false,
  });

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // Reload the photo when its source changes (and once at start-up).
    effect(() => {
      const source = this.settings().photoSource;
      untracked(() => {
        this.photo.set(this.photos.immediate(source));
        void this.photos.load(source).then((photo) => this.photo.set(photo));
      });
    });

    effect(() => {
      const wanted = this.settings().shortcuts;
      untracked(() => void this.refreshShortcuts(wanted));
    });
  }

  async refreshShortcuts(wanted = this.settings().shortcuts): Promise<void> {
    if (!wanted || !this.topSites.supported) {
      this.shortcuts.set('hidden');
      return;
    }
    if (!(await this.topSites.granted())) {
      this.shortcuts.set('ask');
      return;
    }
    this.sites.set(await this.topSites.sites());
    this.shortcuts.set('shown');
  }

  async allowShortcuts(): Promise<void> {
    if (await this.topSites.request()) {
      await this.refreshShortcuts(true);
    }
  }

  declineShortcuts(): void {
    this.settingsService.update({ shortcuts: false });
  }

  async changePhoto(): Promise<void> {
    this.photo.set(await this.photos.load(this.settings().photoSource, true));
  }

  openSettings(): void {
    this.router.navigate([], { queryParams: { settings: 1 } });
  }

  closeSettings(): void {
    this.router.navigate([], { queryParams: {} });
  }

  onKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.router.navigate(['/main-board'], { queryParams: { search: 1 } });
    }
  }
}
