import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { MenuSelectEventDetail } from '@c2n/components/menu';
import type {
  TodoHeadingChangeEventDetail,
  TodoList,
  TodoListLook,
  TodoLookChangeEventDetail,
  TodoTasksChangeEventDetail,
} from '@c2n/components/todo-list';
import { filter } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { ArtBoardItem } from '../store/models';
import { DataType } from '../store/models/data-type';
import { parseTasks, serializeTasks, TodoTask } from '../todo/todo-doc';

/**
 * The list loads with the first list on the board: c2-todo-list brings every task icon with it, which a board without
 * a list has no use for.
 */
let elements: Promise<unknown> | undefined;
function loadElements(): Promise<unknown> {
  elements ??= Promise.all([import('@c2n/components/todo-list'), import('@c2n/feather-icons/icons/edit-2.js')]);
  return elements;
}

/**
 * A to-do list, worked through right on the board: a c2-todo-list whose tasks and title are stored as they change,
 * with the tile's actions (move, its menu) in the list's header, after its palette button as on a note. The
 * title is renamed in place, and a new list opens with its title ready for writing.
 * Rendered inside the c2-masonry-item that places it.
 */
@Component({
  selector: 'ntm-todo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './todo-card.html',
  styleUrl: './todo-card.scss',
  host: {
    class: 'todo',
    '[class.todo--blink]': 'blinking()',
    '(animationend)': 'onAnimationEnd($event)',
  },
})
export class TodoCard {
  private readonly dataService = inject(DataService);
  private readonly instanceId = inject(INSTANCE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly list = viewChild<ElementRef<TodoList>>('list');

  readonly item = input.required<ArtBoardItem>();
  /** Pinned: it stays on the board, in its place, until unpinned. */
  readonly pinned = input(false);
  /** A list that was just created: it asks for its title. */
  readonly autofocus = input(false);

  readonly archive = output<void>();
  readonly remove = output<void>();
  readonly pin = output<void>();
  readonly unpin = output<void>();

  readonly title = signal('');
  readonly tasks = signal<TodoTask[]>([]);
  readonly blinking = signal(false);

  private readonly itemId = computed(() => this.item().id);
  /** The look picked in the list's customize panel, kept with the note as a text note keeps its paper. */
  readonly look = computed(() => (this.item().properties['look'] as TodoListLook | undefined) ?? {});

  constructor() {
    void loadElements();
    // Bind the stored list once, then only apply changes made elsewhere (another tab or device): handing the list its
    // own saves back would redraw it under the pointer.
    let firstBinding = true;
    effect((onCleanup) => {
      const id = this.itemId();
      const subscription = this.dataService
        .getItemData(id)
        .pipe(filter((itemData) => firstBinding || itemData.sourceId !== this.instanceId))
        .subscribe((itemData) => {
          firstBinding = false;
          this.title.set(itemData.properties?.title ?? '');
          this.tasks.set(parseTasks(itemData.data));
        });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      if (this.autofocus()) {
        afterNextRender(() => void this.rename(), { injector: this.injector });
      }
    });
  }

  /** Scroll the list into view and run a light around its border, after picking it from the search results. */
  highlight(): void {
    this.host.nativeElement.closest('c2-masonry-item')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.blinking.set(true);
  }

  onAnimationEnd(event: AnimationEvent): void {
    // By its element: Angular scopes the keyframes' names to the component.
    if ((event.target as Element).classList.contains('todo__beam')) {
      this.blinking.set(false);
    }
  }

  onTasksChange(event: Event): void {
    const { tasks } = (event as CustomEvent<TodoTasksChangeEventDetail>).detail;
    this.tasks.set(tasks);
    this.dataService.updateDataItem({ id: this.item().id, data: serializeTasks(tasks), dataType: DataType.TODO });
  }

  onLookChange(event: Event): void {
    const { look } = (event as CustomEvent<TodoLookChangeEventDetail>).detail;
    const item = this.item();
    this.dataService.updateArtBoardItem({ ...item, properties: { ...item.properties, look } });
  }

  onMenu(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    if (value === 'rename') {
      void this.rename();
    } else if (value === 'archive') {
      this.archive.emit();
    } else if (value === 'delete') {
      this.remove.emit();
    } else if (value === 'pin') {
      this.pin.emit();
    } else if (value === 'unpin') {
      this.unpin.emit();
    }
  }

  /** Open the title for writing, once the list is defined (a new list renders before its module has loaded). */
  async rename(): Promise<void> {
    await loadElements();
    await this.list()?.nativeElement.editHeading();
  }

  onHeadingChange(event: Event): void {
    const { heading: title } = (event as CustomEvent<TodoHeadingChangeEventDetail>).detail;
    this.title.set(title);
    // With the tasks: a new list's data is a placeholder until then, and the search reads it by its type.
    this.dataService.updateDataItem({
      id: this.item().id,
      data: serializeTasks(this.tasks()),
      dataType: DataType.TODO,
      properties: { title },
    });
  }
}
