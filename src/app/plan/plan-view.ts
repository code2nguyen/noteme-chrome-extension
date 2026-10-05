// The c2 elements of the plan, loaded with its route.
import '@c2n/components/week-planner';
import '@c2n/components/month-planner';
import '@c2n/components/modal';
import '@c2n/components/sheet';
import '@c2n/components/text-field';
import '@c2n/components/time-input';
import '@c2n/components/button-group';
import '@c2n/feather-icons/icons/arrow-left.js';
import '@c2n/feather-icons/icons/trash-2.js';

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  MonthPlannerDayClickDetail,
  MonthPlannerEventChangeDetail,
  MonthPlannerEventClickDetail,
  MonthPlannerMonthChangeDetail,
  MonthPlannerRangeSelectDetail,
} from '@c2n/components/month-planner';
import type { TextField } from '@c2n/components/text-field';
import type { TimeInput } from '@c2n/components/time-input';
import type {
  WeekPlannerEventChangeDetail,
  WeekPlannerEventClickDetail,
  WeekPlannerSlotClickDetail,
  WeekPlannerWeekChangeDetail,
} from '@c2n/components/week-planner';

import { SettingsService } from '../settings/settings.service';
import {
  allDayInWeek,
  fromIsoDay,
  isoDay,
  isTimed,
  isValidDay,
  moveInMonth,
  moveInWeek,
  parseQuickAdd,
  PlanItem,
  plansOn,
  planTimes,
  toMonthEvents,
  toWeekEvents,
  weekStartOf,
} from './plan';
import { PlanService } from './plan.service';

type PlanView = 'week' | 'month';

/** A plan being written or changed in the dialog. */
interface Draft {
  id?: string;
  title: string;
  date: string;
  endDate?: string;
  start?: string;
  end?: string;
}

/**
 * Plan: the week (an hour grid) or the month, both editable in place. Click an empty hour or a day to add, drag to
 * move or to change how long something lasts. The view and the day shown are in the URL, so a reload stays put.
 */
@Component({
  selector: 'ntm-plan-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink],
  templateUrl: './plan-view.html',
  styleUrl: './plan-view.scss',
})
export class PlanViewComponent {
  private readonly plans = inject(PlanService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly settings = inject(SettingsService).settings;
  private readonly titleField = viewChild<ElementRef<TextField>>('titleField');
  private readonly dayField = viewChild<ElementRef<TextField>>('dayField');

  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  readonly view = computed<PlanView>(() => (this.params().get('view') === 'month' ? 'month' : 'week'));
  readonly date = computed(() => {
    const day = this.params().get('date') ?? '';
    return isValidDay(day) ? day : isoDay(new Date());
  });
  readonly month = computed(() => this.date().slice(0, 7));
  readonly weekStart = computed(() => this.settings().weekStart);

  readonly items = this.plans.items;
  readonly weekEvents = computed(() => toWeekEvents(this.items()));
  readonly monthEvents = computed(() => toMonthEvents(this.items()));
  readonly allDay = computed(() => allDayInWeek(this.items(), weekStartOf(this.date(), this.weekStart())));

  /** The plan open in the dialog. */
  readonly draft = signal<Draft | null>(null);
  /** The day open in the side panel (month view). */
  readonly day = signal<string | null>(null);
  readonly dayItems = computed(() => {
    const day = this.day();
    return day ? plansOn(this.items(), day) : [];
  });

  readonly formatDay = (day: string, long = true) =>
    fromIsoDay(day).toLocaleDateString(
      undefined,
      long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric' },
    );

  readonly dateRange = (draft: Draft) =>
    draft.endDate ? `${this.formatDay(draft.date)} – ${this.formatDay(draft.endDate)}` : this.formatDay(draft.date);

  show(view: PlanView, date = this.date()): void {
    this.router.navigate([], { queryParams: { view, date }, replaceUrl: true });
  }

  onViewChange(event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    if (value === 'week' || value === 'month') {
      this.show(value);
    }
  }

  // --- Week ---

  onWeekChange(event: Event): void {
    this.show('week', (event as CustomEvent<WeekPlannerWeekChangeDetail>).detail.start);
  }

  onSlotClick(event: Event): void {
    const { date, start, end } = (event as CustomEvent<WeekPlannerSlotClickDetail>).detail;
    this.edit({ title: '', date: date ?? this.date(), start, end });
  }

  onWeekEventChange(event: Event): void {
    const { event: moved, changes } = (event as CustomEvent<WeekPlannerEventChangeDetail>).detail;
    const item = this.plans.find(moved.id);
    if (item) {
      this.plans.update(moveInWeek(item, { date: changes.date, start: changes.start, end: changes.end }));
    }
  }

  onWeekEventClick(event: Event): void {
    this.open(this.plans.find((event as CustomEvent<WeekPlannerEventClickDetail>).detail.event.id));
  }

  // --- Month ---

  onMonthChange(event: Event): void {
    this.show('month', `${(event as CustomEvent<MonthPlannerMonthChangeDetail>).detail.month}-01`);
  }

  onDayClick(event: Event): void {
    this.day.set((event as CustomEvent<MonthPlannerDayClickDetail>).detail.date);
    afterNextRender(() => void this.focus(this.dayField()), { injector: this.injector });
  }

  onRangeSelect(event: Event): void {
    const { start, end } = (event as CustomEvent<MonthPlannerRangeSelectDetail>).detail;
    this.edit({ title: '', date: start, endDate: end > start ? end : undefined });
  }

  onMonthEventChange(event: Event): void {
    const { event: moved, changes } = (event as CustomEvent<MonthPlannerEventChangeDetail>).detail;
    const item = this.plans.find(moved.id);
    if (item) {
      this.plans.update(moveInMonth(item, changes));
    }
  }

  onMonthEventClick(event: Event): void {
    this.open(this.plans.find((event as CustomEvent<MonthPlannerEventClickDetail>).detail.event.id));
  }

  /** "Add to this day": a title, and a time if one is typed with it. */
  addToDay(event: KeyboardEvent): void {
    const field = event.target as TextField;
    const day = this.day();
    if (event.key !== 'Enter' || !day || !field.value.trim()) {
      return;
    }
    const { title, start, end } = parseQuickAdd(field.value);
    this.plans.add({ title: title || field.value.trim(), date: day, ...(start && end ? { start, end } : {}) });
    field.value = '';
  }

  // --- The dialog ---

  open(item: PlanItem | undefined): void {
    if (item) {
      this.edit({ ...item });
    }
  }

  edit(draft: Draft): void {
    this.draft.set(draft);
    afterNextRender(() => void this.focus(this.titleField()), { injector: this.injector });
  }

  onTitleInput(event: Event): void {
    const title = (event.target as TextField).value;
    this.draft.update((draft) => draft && { ...draft, title });
  }

  onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.save();
    }
  }

  onTimeChange(which: 'start' | 'end', event: Event): void {
    const value = (event.target as TimeInput).value;
    this.draft.update((draft) => draft && { ...draft, [which]: value });
  }

  save(): void {
    const draft = this.draft();
    if (!draft || !draft.title.trim()) {
      return;
    }
    const item: Omit<PlanItem, 'id'> = {
      title: draft.title.trim(),
      date: draft.date,
      ...(draft.endDate ? { endDate: draft.endDate } : {}),
      ...planTimes(draft.start, draft.end),
    };
    if (draft.id) {
      this.plans.update({ ...item, id: draft.id });
    } else {
      this.plans.add(item);
    }
    this.draft.set(null);
  }

  remove(): void {
    const id = this.draft()?.id;
    if (id) {
      this.plans.remove(id);
    }
    this.draft.set(null);
  }

  readonly timed = (item: PlanItem) => isTimed(item);

  private async focus(field: ElementRef<TextField> | undefined): Promise<void> {
    const element = field?.nativeElement;
    if (!element) {
      return;
    }
    await customElements.whenDefined('c2-text-field');
    await element.updateComplete;
    element.focus();
  }
}
