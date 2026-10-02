import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

const BACKGROUND_COUNT = 12;

/**
 * Start page: the time and date over a photo; a click (or Enter) opens the notes. App-owned because c2n has no
 * clock component — it is styled with the @c2n/theme tokens only.
 */
@Component({
  selector: 'ntm-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
  host: {
    '[style.--ntm-welcome-background]': 'background',
  },
})
export class Welcome {
  private readonly router = inject(Router);
  private readonly now = signal(new Date());

  readonly background = `url('assets/bg/bg-${Math.floor(Math.random() * BACKGROUND_COUNT)}-small.jpg')`;
  readonly time = computed(() => this.now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  readonly date = computed(() =>
    this.now().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  );

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  open(): void {
    this.router.navigate(['/main-board']);
  }
}
