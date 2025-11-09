import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HomeComponent } from './home.component';
import { AuthService } from '../auth/auth.service';
import { TaskStoreService } from '../tasks/task-store.service';
import { TASK_STATUSES } from '../tasks/task.model';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let store: TaskStoreService;

  const authStub: Partial<AuthService> = {
    token$: of('fake-token'),
    logout: jest.fn(),
  };

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [{ provide: AuthService, useValue: authStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(TaskStoreService);
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('exposes a board column for each status', () => {
    expect(component.boardColumns().length).toBe(TASK_STATUSES.length);
  });

  it('creates a task through the task form', () => {
    const initialCount = store.tasks().length;

    component.openCreateTask();
    component.taskForm.setValue({
      title: 'Spec-driven task',
      description: 'Added from unit test',
      category: 'Personal',
      status: 'Backlog',
      dueDate: '',
    });

    component.saveTask();

    expect(store.tasks().length).toBe(initialCount + 1);
    expect(component.isTaskFormOpen()).toBe(false);
  });

  it('computes a status summary that reflects the store state', () => {
    const summary = component.statusSummary();

    expect(summary.total).toBe(store.tasks().length);
    expect(summary.statusCounts).toHaveLength(TASK_STATUSES.length);
  });

  it('toggles between light and dark themes', () => {
    const initialTheme = component.theme();

  component.toggleTheme();

  expect(component.theme()).not.toBe(initialTheme);
  });

  it('handles keyboard shortcuts for task workflows', () => {
    const initialCount = store.tasks().length;

    component.handleGlobalKeys(
      new KeyboardEvent('keydown', { key: 'A', ctrlKey: true, shiftKey: true })
    );

    expect(component.isTaskFormOpen()).toBe(true);

    component.taskForm.setValue({
      title: 'Shortcut generated task',
      description: 'Created via keyboard shortcut',
      category: 'Work',
      status: 'In Progress',
      dueDate: '',
    });

    component.handleGlobalKeys(
      new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, shiftKey: true })
    );

    expect(store.tasks().length).toBe(initialCount + 1);
    expect(component.isTaskFormOpen()).toBe(false);

    component.handleGlobalKeys(
      new KeyboardEvent('keydown', { key: 'L', ctrlKey: true, shiftKey: true })
    );
    expect(component.viewMode()).toBe('list');

    component.handleGlobalKeys(
      new KeyboardEvent('keydown', { key: 'B', ctrlKey: true, shiftKey: true })
    );
    expect(component.viewMode()).toBe('board');

    component.toggleTheme();
    const themedBefore = component.theme();
    component.handleGlobalKeys(
      new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, shiftKey: true })
    );
    expect(component.theme()).not.toBe(themedBefore);
  });
});
