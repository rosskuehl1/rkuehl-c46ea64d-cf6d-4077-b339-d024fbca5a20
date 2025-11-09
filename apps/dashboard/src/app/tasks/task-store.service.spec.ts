import { TestBed } from '@angular/core/testing';
import { TaskStoreService } from './task-store.service';
import { TaskRecord, TaskStatus } from './task.model';

describe('TaskStoreService', () => {
  let service: TaskStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskStoreService);
  });

  function tasksByStatus(status: TaskStatus): TaskRecord[] {
    return service
      .tasks()
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  }

  it('creates a task with sequential position within its status column', () => {
    const backlogBefore = tasksByStatus('Backlog');

    service.createTask({
      title: 'Write release notes',
      description: 'Summarise changes for product update',
      category: 'Work',
      status: 'Backlog',
      dueDate: null,
    });

    const backlogAfter = tasksByStatus('Backlog');
    expect(backlogAfter.length).toBe(backlogBefore.length + 1);

    const createdTask = backlogAfter.find(
      (task) => task.title === 'Write release notes'
    );

    expect(createdTask).toBeTruthy();
    expect(createdTask?.position).toBe(backlogBefore.length);
    expect(createdTask?.id).toMatch(/^task-/);
  });

  it('reorders tasks within the same status', () => {
    service.createTask({
      title: 'Organise team lunch',
      category: 'Personal',
      description: '',
      status: 'Backlog',
      dueDate: null,
    });
    service.createTask({
      title: 'Prepare sprint demo',
      category: 'Work',
      description: '',
      status: 'Backlog',
      dueDate: null,
    });

    const backlogBefore = tasksByStatus('Backlog');
    const lastIndex = backlogBefore.length - 1;
    const movedTaskId = backlogBefore[lastIndex].id;

    service.reorderWithinStatus('Backlog', lastIndex, 0);

    const backlogAfter = tasksByStatus('Backlog');
    expect(backlogAfter[0].id).toBe(movedTaskId);
    expect(backlogAfter[0].position).toBe(0);
    expect(backlogAfter.map((task) => task.position)).toEqual(
      backlogAfter.map((_, index) => index)
    );
  });

  it('moves a task to a new status at a specific index', () => {
    const backlogTask = tasksByStatus('Backlog')[0];
    const originalBacklogLength = tasksByStatus('Backlog').length;
    const inProgressBefore = tasksByStatus('In Progress');

    service.moveToStatus(backlogTask.id, 'In Progress', 0);

    const backlogAfter = tasksByStatus('Backlog');
    const inProgressAfter = tasksByStatus('In Progress');

    expect(backlogAfter.length).toBe(originalBacklogLength - 1);
    expect(inProgressAfter.length).toBe(inProgressBefore.length + 1);
    expect(inProgressAfter[0].id).toBe(backlogTask.id);
    expect(inProgressAfter[0].position).toBe(0);
    expect(backlogAfter.map((task) => task.position)).toEqual(
      backlogAfter.map((_, index) => index)
    );
  });

  it('updates task details without affecting ordering', () => {
    const target = tasksByStatus('In Progress')[0];

    service.updateTaskDetails(target.id, {
      title: '   Updated title   ',
      description: '  Trim me  ',
      category: 'Focus',
      dueDate: '2025-11-09T00:00:00.000Z',
    });

    const updated = service
      .tasks()
      .find((task) => task.id === target.id);

    expect(updated?.title).toBe('Updated title');
    expect(updated?.description).toBe('Trim me');
    expect(updated?.category).toBe('Focus');
    expect(updated?.dueDate).toBe('2025-11-09T00:00:00.000Z');
    expect(updated?.position).toBe(target.position);
  });

  it('deletes a task and reindexes remaining tasks', () => {
    const backlogTasks = tasksByStatus('Backlog');
    const removedTask = backlogTasks[0];

    service.deleteTask(removedTask.id);

    const backlogAfter = tasksByStatus('Backlog');
    expect(backlogAfter.length).toBe(backlogTasks.length - 1);
    expect(backlogAfter.some((task) => task.id === removedTask.id)).toBe(
      false
    );
    expect(backlogAfter.map((task) => task.position)).toEqual(
      backlogAfter.map((_, index) => index)
    );
  });
});
