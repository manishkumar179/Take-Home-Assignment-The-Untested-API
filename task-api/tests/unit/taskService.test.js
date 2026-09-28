const taskService = require('../../src/services/taskService');

describe('Task Service Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('should create a task with default values', () => {
      const task = taskService.create({ title: 'Default Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Default Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(isNaN(Date.parse(task.createdAt))).toBe(false);
    });

    test('should create a task with custom fields', () => {
      const taskData = {
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };
      const task = taskService.create(taskData);

      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.status).toBe(taskData.status);
      expect(task.priority).toBe(taskData.priority);
      expect(task.dueDate).toBe(taskData.dueDate);
      expect(task.completedAt).toBeNull();
    });
  });

  describe('getAll', () => {
    test('should return empty array when no tasks exist', () => {
      const tasks = taskService.getAll();
      expect(tasks).toEqual([]);
    });

    test('should return all created tasks', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((t) => t.id)).toEqual([task1.id, task2.id]);
    });

    test('should return a copy of the tasks array', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();
      all.push({ id: 'fake' });
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    test('should find task by valid id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    test('should return undefined for nonexistent id', () => {
      const found = taskService.findById('nonexistent-uuid');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('should return tasks matching given status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(2);
      expect(todoTasks.every((t) => t.status === 'todo')).toBe(true);

      const inProgressTasks = taskService.getByStatus('in_progress');
      expect(inProgressTasks).toHaveLength(1);

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks).toHaveLength(1);
    });

    test('should return empty array when no tasks match status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      const result = taskService.getByStatus('done');
      expect(result).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('should return first page with correct items for page 1', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const t3 = taskService.create({ title: 'Task 3' });
      const t4 = taskService.create({ title: 'Task 4' });

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].id).toBe(t1.id);
      expect(page1[1].id).toBe(t2.id);

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].id).toBe(t3.id);
      expect(page2[1].id).toBe(t4.id);
    });

    test('should return empty array when page is out of bounds', () => {
      taskService.create({ title: 'Task 1' });
      const result = taskService.getPaginated(5, 10);
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('should return all zeroes on empty data store', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should aggregate status counts and overdue counts correctly', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Overdue: status !== 'done' and dueDate < now
      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Overdue In Progress', status: 'in_progress', dueDate: pastDate });

      // Not overdue: status is done
      taskService.create({ title: 'Completed Past Due', status: 'done', dueDate: pastDate });

      // Not overdue: future due date
      taskService.create({ title: 'Future Todo', status: 'todo', dueDate: futureDate });

      // Not overdue: no due date
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });

    test('should handle tasks with unknown status without throwing or corrupting standard counts', () => {
      taskService.create({ title: 'Custom Status', status: 'archived' });
      const stats = taskService.getStats();
      expect(stats.todo).toBe(0);
      expect(stats.in_progress).toBe(0);
      expect(stats.done).toBe(0);
      expect(stats.overdue).toBe(0);
    });
  });

  describe('update', () => {
    test('should update existing task fields and return updated task', () => {
      const task = taskService.create({ title: 'Initial Title', priority: 'low' });
      const updated = taskService.update(task.id, {
        title: 'New Title',
        priority: 'high',
        description: 'Added description',
      });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('Added description');
      expect(updated.id).toBe(task.id);

      // Verify in store
      const inStore = taskService.findById(task.id);
      expect(inStore.title).toBe('New Title');
    });

    test('should return null when updating nonexistent task', () => {
      const result = taskService.update('nonexistent-id', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('should remove existing task and return true', () => {
      const task = taskService.create({ title: 'Delete Me' });
      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('should return false when removing nonexistent task', () => {
      const removed = taskService.remove('nonexistent-id');
      expect(removed).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('should mark task as done and set completedAt ISO date', () => {
      const task = taskService.create({ title: 'Incomplete' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(isNaN(Date.parse(completed.completedAt))).toBe(false);
    });

    test('should return null when completing nonexistent task', () => {
      const result = taskService.completeTask('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('should assign a user to an unassigned task and return updated task', () => {
      const task = taskService.create({
        title: 'Task to Assign',
        description: 'Testing assignment',
        priority: 'high',
        dueDate: '2026-10-15T00:00:00.000Z',
      });

      const updated = taskService.assignTask(task.id, 'Manish');

      expect(updated).toBeDefined();
      expect(updated.id).toBe(task.id);
      expect(updated.assignee).toBe('Manish');
      // Preserves existing fields
      expect(updated.title).toBe('Task to Assign');
      expect(updated.description).toBe('Testing assignment');
      expect(updated.status).toBe('todo');
      expect(updated.priority).toBe('high');
      expect(updated.dueDate).toBe('2026-10-15T00:00:00.000Z');

      // Verify in store
      const inStore = taskService.findById(task.id);
      expect(inStore.assignee).toBe('Manish');
    });

    test('should allow reassigning a task to a different user', () => {
      const task = taskService.create({ title: 'Reassign Task' });
      taskService.assignTask(task.id, 'Alice');

      const reassigned = taskService.assignTask(task.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');

      const inStore = taskService.findById(task.id);
      expect(inStore.assignee).toBe('Bob');
    });

    test('should return null when assigning a nonexistent task', () => {
      const result = taskService.assignTask('nonexistent-id', 'Manish');
      expect(result).toBeNull();
    });
  });
});

