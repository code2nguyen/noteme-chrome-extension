import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import type { AutocompleteSelectEventDetail } from '@c2n/components/autocomplete';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { FULL_SCREEN, SearchSuggestion, searchShortcut, searchSuggestions } from '../services/search-results';
import { selectItemDataEntities } from '../store/reducers';

import { formatDate, formatTime, hasFeature } from '../settings/settings';
import { SettingsPanel } from '../settings/settings-panel';
import { SettingsService } from '../settings/settings.service';
import { BackgroundOptions, BackgroundService, ShownPhoto } from './background.service';
import { Quote, QUOTE_MARKS } from './quotes';
import { QuoteService } from './quotes.service';
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
  private readonly quotes = inject(QuoteService);
  private readonly topSites = inject(TopSitesService);
  private readonly router = inject(Router);
  private readonly dataService = inject(DataService);
  private readonly store = inject(Store);
  private readonly now = signal(new Date());
  private readonly searchField = viewChild<ElementRef<HTMLElement>>('searchField');

  readonly settings = this.settingsService.settings;
  readonly time = computed(() => formatTime(this.now(), this.settings().clock));
  readonly date = computed(() => formatDate(this.now(), this.settings().dateFormat));
  readonly quote = signal<Quote | null>(null);
  /** The quotation marks of the quote's language. */
  readonly quoteMarks = computed(() => QUOTE_MARKS[this.quote()?.lang ?? 'en']);
  /** Bumped by every quote shown, so turning the quote off wins over one still loading. */
  private quoteRun = 0;
  /** Plan is optional: its link shows only while it is switched on in Settings. */
  readonly planOn = computed(() => hasFeature(this.settings(), 'plan'));

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
  /** Bumped by every refresh, so a slower earlier one cannot publish over the latest. */
  private shortcutsRun = 0;
  /** What the search field holds, as typed. */
  readonly query = signal('');
  private readonly results = toSignal(this.dataService.getSearchResults(), { initialValue: [] });
  /** The results as rows; none while a search is pending, so a quick pick never opens a match of the last query. */
  readonly suggestions = toSignal(
    combineLatest([
      this.dataService.getSearchResults(),
      this.store.select(selectItemDataEntities),
      this.dataService.selectArtBoardItemSearchLoading(),
    ]).pipe(map(([items, data, loading]) => (loading ? [] : searchSuggestions(items, data)))),
    { initialValue: [] as SearchSuggestion[] },
  );
  /** The store already searched (fuse.js); the autocomplete shows every result it is given. */
  readonly matchAll = () => true;
  /** The search shortcut as this keyboard writes it; onKey takes both. */
  readonly searchKey = searchShortcut();

  readonly settingsOpen = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.has('settings'))), {
    initialValue: false,
  });

  constructor() {
    toObservable(computed(() => this.query().trim())).subscribe((query) => this.dataService.searchArtBoardItem(query));

    const timer = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // The photo shows from the cache at once (at start-up, and when the themes change); the next ones download
    // once the page is up, so opening a tab never waits on the network.
    effect(() => {
      const options = this.photoOptions();
      untracked(() => void this.showPhoto(options));
    });

    const quoteOn = computed(() => this.settings().quote);
    effect(() => {
      const on = quoteOn();
      untracked(() => this.showQuote(on));
    });

    effect(() => {
      const wanted = this.settings().shortcuts;
      untracked(() => void this.refreshShortcuts(wanted));
    });
  }

  async refreshShortcuts(wanted = this.settings().shortcuts): Promise<void> {
    const run = ++this.shortcutsRun;
    if (!wanted || !this.topSites.supported) {
      this.shortcuts.set('hidden');
      return;
    }
    const granted = await this.topSites.granted();
    if (run !== this.shortcutsRun) {
      return;
    }
    if (!granted) {
      this.shortcuts.set('ask');
      return;
    }
    const sites = await this.topSites.sites();
    if (run !== this.shortcutsRun) {
      return;
    }
    this.sites.set(sites);
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
    await this.present(this.backgrounds.next(options), options, (task) => void task());
  }

  /**
   * The quote kept from the last ten minutes shows at once; a new one waits until the page has settled, so loading the
   * lists never holds up the first paint, and fades in a moment later. None while it is switched off.
   */
  private showQuote(on: boolean): void {
    const run = ++this.quoteRun;
    const kept = on ? this.quotes.kept() : null;
    this.quote.set(kept);
    if (!on || kept) {
      return;
    }
    afterIdle(async () => {
      const quote = await this.quotes.next().catch(() => null);
      if (run === this.quoteRun) {
        this.quote.set(quote);
      }
    });
  }

  private showPhoto(options: BackgroundOptions): Promise<void> {
    return this.present(this.backgrounds.current(options), options, afterIdle);
  }

  /**
   * Show a photo chosen for `options`, unless the settings changed while it loaded (the call for the new ones shows
   * the right photo), then top the queue up when `schedule` says.
   */
  private async present(
    photo: Promise<ShownPhoto | null>,
    options: BackgroundOptions,
    schedule: (task: () => Promise<void>) => void,
  ): Promise<void> {
    const shown = await photo;
    const current = () => this.photoOptions() === options;
    if (!current()) {
      return;
    }
    this.photo.set(shown);
    if (options.themes.length === 0) {
      return;
    }
    schedule(async () => {
      await this.backgrounds.refill(options);
      // Nothing was downloaded yet for these themes (first run, themes just changed, or "Change now" ran the queue
      // dry): a bundled photo stood in. Move on to the first real one as soon as it is ready.
      const standIn = shown?.bundled && !options.themes.includes('noteme');
      if (standIn && this.photo() === shown && current()) {
        const next = await this.backgrounds.next(options);
        if (next && !next.bundled && this.photo() === shown && current()) {
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

  search(event: Event): void {
    this.query.set((event as CustomEvent<{ query: string }>).detail.query);
  }

  /** A page or a flow opens full screen; a note opens the board, which brings it into view and lights it up. */
  selectSearchResult(event: Event): void {
    const id = ((event as CustomEvent<AutocompleteSelectEventDetail>).detail.item as SearchSuggestion).id;
    const found = this.results().find((item) => item.id === id);
    this.query.set('');
    if (!found) {
      return;
    }
    const route = FULL_SCREEN[found.extensionId];
    if (route) {
      // An archived one says so before it is read, as when it is opened from the Archive.
      this.router.navigate([route, id], found.boardId ? {} : { queryParams: { from: 'archive' } });
      return;
    }
    // An archived note comes back to the board, first.
    if (!found.boardId) {
      this.dataService.restoreArtBoardItem(found);
    }
    this.router.navigate(['/main-board'], { queryParams: { show: id } });
  }

  onKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchField()?.nativeElement.focus();
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
