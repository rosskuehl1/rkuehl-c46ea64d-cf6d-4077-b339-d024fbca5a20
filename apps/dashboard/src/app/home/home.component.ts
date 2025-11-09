import { AsyncPipe, CommonModule, DatePipe, DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TaskDraft, TaskRecord, TaskStatus, TASK_STATUSES } from '../tasks/task.model';
import { TaskStoreService } from '../tasks/task-store.service';

type ViewMode = 'board' | 'list';

interface SortOption {
  readonly id: string;
  readonly label: string;
}

interface StatusBreakdown {
  readonly status: TaskStatus;
  readonly count: number;
  readonly percentage: number;
}

interface StatusSummary {
  readonly total: number;
  readonly completed: number;
  readonly completionPercent: number;
  readonly statusCounts: StatusBreakdown[];
}

const SORT_OPTIONS: SortOption[] = [
  { id: 'created-desc', label: 'Newest first' },
  { id: 'created-asc', label: 'Oldest first' },
  { id: 'title-asc', label: 'Title A → Z' },
  { id: 'title-desc', label: 'Title Z → A' },
  { id: 'due-asc', label: 'Due date (soonest)' },
  { id: 'due-desc', label: 'Due date (latest)' },
];

const THEME_STORAGE_KEY = 'task-dashboard-theme';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, CommonModule, DatePipe, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly taskStore = inject(TaskStoreService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly storage: Storage | null =
    typeof window !== 'undefined' ? window.localStorage : null;

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  readonly token$ = this.authService.token$;
  readonly statuses = TASK_STATUSES;
  readonly sortOptions = SORT_OPTIONS;

  readonly theme = signal<'light' | 'dark'>(this.initialTheme());
  readonly themeLabel = computed(() =>
    this.theme() === 'dark'
      ? 'Switch to light mode (⇧⌘D / ⇧Ctrl+D)'
      : 'Switch to dark mode (⇧⌘D / ⇧Ctrl+D)'
  );
  readonly themeIcon = computed(() => (this.theme() === 'dark' ? '🌙' : '☀️'));

  readonly viewMode = signal<ViewMode>('board');
  readonly searchTerm = signal('');
  readonly categoryFilter = signal<'all' | string>('all');
  readonly statusFilter = signal<'all' | TaskStatus>('all');
  readonly sortSelection = signal(SORT_OPTIONS[0].id);

  readonly statusSummary = computed<StatusSummary>(() => {
    const tasks = this.boardMatches();
    const total = tasks.length;
    const counts = new Map<TaskStatus, number>();

    for (const status of this.statuses) {
      counts.set(status, 0);
    }

    for (const task of tasks) {
      counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
    }

    const statusCounts = this.statuses.map((status) => {
      const count = counts.get(status) ?? 0;
      return {
        status,
        count,
        percentage: total === 0 ? 0 : Math.round((count / total) * 100),
      } satisfies StatusBreakdown;
    });

    const completionStatus =
      this.statuses.find((status) => status.toLowerCase().includes('complete')) ??
      this.statuses[this.statuses.length - 1];

    const completed = counts.get(completionStatus) ?? 0;
    const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      completed,
      completionPercent,
      statusCounts,
    } satisfies StatusSummary;
  });

  readonly categories = computed(() => {
    const defaults = new Set(['Work', 'Personal']);

    for (const task of this.taskStore.tasks()) {
      defaults.add(task.category);
    }

    return Array.from(defaults).sort((a, b) => a.localeCompare(b));
  });

  private readonly boardMatches = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.categoryFilter();

    return this.taskStore
      .tasks()
      .filter((task) => {
        const matchesTerm =
          term.length === 0 ||
          task.title.toLowerCase().includes(term) ||
          (task.description ?? '').toLowerCase().includes(term);

        const matchesCategory =
          category === 'all' || task.category === category;

        return matchesTerm && matchesCategory;
      });
  });

  readonly boardColumns = computed(() =>
    this.statuses.map((status) => ({
      status,
      tasks: this.boardMatches()
        .filter((task) => task.status === status)
        .sort((a, b) => a.position - b.position),
    }))
  );

  readonly listTasks = computed(() => {
    const status = this.statusFilter();
    const sort = this.sortSelection();

    let tasks = this.boardMatches();

    if (status !== 'all') {
      tasks = tasks.filter((task) => task.status === status);
    }

    return this.sortTasks([...tasks], sort);
  });

  readonly taskForm = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    category: ['Work', Validators.required],
    status: [TASK_STATUSES[0] as TaskStatus, Validators.required],
    dueDate: [''],
  });

  readonly isTaskFormOpen = signal(false);
  readonly editingTask = signal<TaskRecord | null>(null);
  readonly trackByTaskId = (_: number, task: TaskRecord) => task.id;
  readonly trackByStatus = (
    _: number,
    column: { status: TaskStatus }
  ) => column.status;
  readonly draggingTaskId = signal<string | null>(null);
  readonly dragSourceStatus = signal<TaskStatus | null>(null);

  constructor() {
    effect(() => {
      const current = this.theme();
      const root = this.document?.documentElement;

      if (!root) {
        return;
      }

      root.classList.toggle('dark', current === 'dark');

      if (this.storage) {
        try {
          this.storage.setItem(THEME_STORAGE_KEY, current);
        } catch {
          // Ignore storage write failures (private browsing, quota, etc.)
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  toggleTheme(): void {
    this.theme.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  updateSearch(term: string): void {
    this.searchTerm.set(term);
  }

  updateCategory(category: string): void {
    this.categoryFilter.set(category as 'all' | string);
  }

  updateStatus(status: string): void {
    this.statusFilter.set(status as 'all' | TaskStatus);
  }

  updateSort(sortId: string): void {
    this.sortSelection.set(sortId);
  }

  openCreateTask(): void {
    this.editingTask.set(null);
    this.taskForm.reset({
      title: '',
      description: '',
      category: this.categories()[0] ?? 'Work',
      status: TASK_STATUSES[0],
      dueDate: '',
    });
    this.isTaskFormOpen.set(true);
  }

  openEditTask(task: TaskRecord): void {
    this.editingTask.set(task);
    this.taskForm.setValue({
      title: task.title,
      description: task.description ?? '',
      category: task.category,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
    });
    this.isTaskFormOpen.set(true);
  }

  closeTaskForm(): void {
    this.taskForm.reset();
    this.isTaskFormOpen.set(false);
  }

  saveTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const formValue = this.taskForm.getRawValue();
    const draft: TaskDraft = {
      title: formValue.title,
      description: formValue.description || null,
      category: formValue.category,
      status: formValue.status as TaskStatus,
      dueDate: formValue.dueDate ? `${formValue.dueDate}T00:00:00.000Z` : null,
    };

    const editing = this.editingTask();

    if (editing) {
      this.taskStore.updateTaskDetails(editing.id, {
        title: draft.title,
        description: draft.description,
        category: draft.category,
        dueDate: draft.dueDate,
      });

      if (draft.status !== editing.status) {
        this.taskStore.moveToStatus(editing.id, draft.status);
      }
    } else {
      this.taskStore.createTask(draft);
    }

    this.closeTaskForm();
  }

  deleteTask(task: TaskRecord): void {
    this.taskStore.deleteTask(task.id);
  }

  onDragStart(task: TaskRecord, event: DragEvent): void {
    this.draggingTaskId.set(task.id);
    this.dragSourceStatus.set(task.status);
    event.dataTransfer?.setData('text/plain', task.id);
    if (typeof document !== 'undefined') {
      event.dataTransfer?.setDragImage(this.createDragImage(task.title), 10, 10);
    }
  }

  onDragEnd(): void {
    this.draggingTaskId.set(null);
    this.dragSourceStatus.set(null);
  }

  onTaskDrop(status: TaskStatus, index: number, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const taskId = this.readDragData(event);

    if (!taskId) {
      return;
    }

    const sourceStatus = this.dragSourceStatus();

    if (!sourceStatus) {
      return;
    }

    if (sourceStatus === status) {
      const fromIndex = this.indexForTask(taskId, status);

      if (fromIndex === -1) {
        return;
      }

      this.taskStore.reorderWithinStatus(status, fromIndex, index);
    } else {
      this.taskStore.moveToStatus(taskId, status, index);
    }

    this.onDragEnd();
  }

  onColumnDrop(status: TaskStatus, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const taskId = this.readDragData(event);

    if (!taskId) {
      return;
    }

    const targetIndex = this.taskStore
      .tasks()
      .filter((task) => task.status === status)
      .length;

    this.taskStore.moveToStatus(taskId, status, targetIndex);
    this.onDragEnd();
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeys(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (event.key === 'Escape' && this.isTaskFormOpen()) {
      event.preventDefault();
      this.closeTaskForm();
      return;
    }

    const isEditable = this.isEditableElement(target);
    const mod = event.metaKey || event.ctrlKey;

    if (!mod && !event.altKey && !event.shiftKey && event.key === '/' && !isEditable) {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
      return;
    }

    if (!mod || !event.shiftKey) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'a':
        event.preventDefault();
        this.openCreateTask();
        break;
      case 's':
        if (this.isTaskFormOpen()) {
          event.preventDefault();
          this.saveTask();
        }
        break;
      case 'b':
        event.preventDefault();
        this.setView('board');
        break;
      case 'l':
        event.preventDefault();
        this.setView('list');
        break;
      case 'd':
        event.preventDefault();
        this.toggleTheme();
        break;
      default:
        break;
    }
  }

  private sortTasks(tasks: TaskRecord[], optionId: string): TaskRecord[] {
    const option =
      SORT_OPTIONS.find((sort) => sort.id === optionId)?.id ??
      SORT_OPTIONS[0].id;

    switch (option) {
      case 'created-asc':
        return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'title-asc':
        return tasks.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return tasks.sort((a, b) => b.title.localeCompare(a.title));
      case 'due-asc':
        return tasks.sort((a, b) => this.compareDueDates(a, b));
      case 'due-desc':
        return tasks.sort((a, b) => this.compareDueDates(b, a));
      case 'created-desc':
      default:
        return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  private compareDueDates(a: TaskRecord, b: TaskRecord): number {
    if (!a.dueDate && !b.dueDate) {
      return 0;
    }

    if (!a.dueDate) {
      return 1;
    }

    if (!b.dueDate) {
      return -1;
    }

    return a.dueDate.localeCompare(b.dueDate);
  }

  private indexForTask(taskId: string, status: TaskStatus): number {
    return this.taskStore
      .tasks()
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position)
      .findIndex((task) => task.id === taskId);
  }

  private readDragData(event: DragEvent): string | null {
    const fromTransfer = event.dataTransfer?.getData('text/plain');
    return fromTransfer || this.draggingTaskId();
  }

  private createDragImage(title: string): HTMLElement {
    const preview = document.createElement('div');
    preview.textContent = title;
    preview.style.position = 'fixed';
    preview.style.top = '-9999px';
    preview.style.left = '-9999px';
    preview.style.padding = '8px 12px';
    preview.style.borderRadius = '8px';
    preview.style.background = 'rgba(15, 23, 42, 0.92)';
    preview.style.color = '#e2e8f0';
    preview.style.fontSize = '12px';
    preview.style.boxShadow = '0 8px 20px rgba(15, 118, 110, 0.4)';
    document.body.appendChild(preview);

    setTimeout(() => {
      document.body.removeChild(preview);
    }, 0);

    return preview;
  }

  private isEditableElement(target: HTMLElement | null): boolean {
    if (!target) {
      return false;
    }

    const tag = target.tagName?.toLowerCase();

    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }

    return target.isContentEditable;
  }

  private initialTheme(): 'light' | 'dark' {
    const stored = this.storage?.getItem(THEME_STORAGE_KEY);

    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }
}
