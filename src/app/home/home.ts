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
import { BackgroundOptions, BackgroundService, ShownPhoto } from './background.service';
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
  private readonly backgrounds = inject(BackgroundService);
  private readonly topSites = inject(TopSitesService);
  private readonly router = inject(Router);
  private readonly now = signal(new Date());

  readonly settings = this.settingsService.settings;
  readonly time = computed(() => formatTime(this.now(), this.settings().clock));
  readonly date = computed(() => formatDate(this.now(), this.settings().dateFormat));
  readonly quote = computed(() => (this.settings().quote ? quoteOfTheDay(this.now()) : null));

  readonly photo = signal<ShownPhoto | null>(null);
  /** The photo fades in once decoded, rather than painting top to bottom. */
  readonly photoLoaded = signal<string | null>(null);
  private readonly photoOptions = computed<BackgroundOptions>(
    () => {
      const settings = this.settings();
      return { themes: settings.photos ? settings.photoThemes : [], change: settings.photoChange };
    },
    { equal: (a, b) => a.change === b.change && a.themes.join() === b.themes.join() },
  );
  readonly sites = signal<Site[]>([]);
  readonly shortcuts = signal<ShortcutsState>('hidden');

  readonly settingsOpen = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.has('settings'))), {
    initialValue: false,
  });

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // The photo shows from the cache at once (at start-up, and when the themes change); the next ones download
    // once the page is up, so opening a tab never waits on the network.
    effect(() => {
      const options = this.photoOptions();
      untracked(() => void this.showPhoto(options));
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
    const options = this.photoOptions();
    this.photo.set(await this.backgrounds.next(options));
    void this.backgrounds.refill(options);
  }

  private async showPhoto(options: BackgroundOptions): Promise<void> {
    const shown = await this.backgrounds.current(options);
    this.photo.set(shown);
    if (options.themes.length === 0) {
      return;
    }
    afterIdle(async () => {
      await this.backgrounds.refill(options);
      // Nothing was downloaded yet for these themes (first run, or themes just changed): a bundled photo stood in.
      // Move on to the first real one as soon as it is ready.
      const standIn = shown?.bundled && !options.themes.includes('noteme');
      if (standIn && this.photo() === shown && this.photoOptions() === options) {
        const next = await this.backgrounds.next(options);
        if (next && !next.bundled) {
          this.photo.set(next);
        }
        // That one came out of the queue: top it up again.
        await this.backgrounds.refill(options);
      }
    });
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

/** After the page has settled: the downloads never compete with the first paint. */
function afterIdle(task: () => unknown): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout: 2000 });
  } else {
    setTimeout(task, 500);
  }
}
