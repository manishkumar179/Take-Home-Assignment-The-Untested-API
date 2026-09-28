const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('should return empty list when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('should filter tasks by status', async () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Todo Task');
      expect(res.body[0].status).toBe('todo');
    });

    test('should return paginated tasks when page and limit query params are provided', async () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe(t1.id);
      expect(res.body[1].id).toBe(t2.id);
    });

    test('should fallback to default page=1 and limit=10 when non-numeric pagination params are passed', async () => {
      taskService.create({ title: 'Task 1' });
      const res = await request(app).get('/tasks?page=invalid&limit=invalid');
      expect(res.status).toBe(200);
      // With default page=1, limit=10, should return results
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /tasks', () => {
    test('should create a task with 201 status and return created task', async () => {
      const payload = {
        title: 'New API Task',
        description: 'Testing POST endpoint',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-10-15T00:00:00.000Z',
      };

      const res = await request(app)
        .post('/tasks')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe(payload.dueDate);
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    test('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 when title is empty string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 when title is whitespace only', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Valid Title', status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    test('should return 400 when priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Valid Title', priority: 'extreme' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    test('should return 400 when dueDate is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Valid Title', dueDate: 'bad-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update existing task and return 200', async () => {
      const task = taskService.create({ title: 'Original Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
      expect(res.body.id).toBe(task.id);
    });

    test('should return 404 when updating nonexistent task', async () => {
      const res = await request(app)
        .put('/tasks/nonexistent-id')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('should return 400 when update payload is invalid', async () => {
      const task = taskService.create({ title: 'Original Title' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'super-high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete existing task and return 204', async () => {
      const task = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify deletion in GET /tasks
      const getRes = await request(app).get('/tasks');
      expect(getRes.body).toHaveLength(0);
    });

    test('should return 404 when deleting nonexistent task', async () => {
      const res = await request(app).delete('/tasks/nonexistent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('should mark task as complete and return 200', async () => {
      const task = taskService.create({ title: 'Finish testing' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(isNaN(Date.parse(res.body.completedAt))).toBe(false);
    });

    test('should return 404 when completing nonexistent task', async () => {
      const res = await request(app).patch('/tasks/nonexistent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    test('should return zeroes when store is empty', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should return accurate counts for statuses and overdue tasks', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      // Only Task 1 is overdue because Task 3 is already done
      expect(res.body.overdue).toBe(1);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should return 500 when request body contains malformed JSON', async () => {
      // Send raw invalid JSON string to trigger Express JSON parsing error
      const res = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title": "broken json');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });

    test('should return empty array for out of bounds pagination page', async () => {
      taskService.create({ title: 'Task 1' });
      const res = await request(app).get('/tasks?page=99&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('should assign user to task and return 200 with updated task', async () => {
      const task = taskService.create({
        title: 'Feature Task',
        description: 'New feature',
        priority: 'high',
      });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Manish' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Manish');
      expect(res.body.title).toBe('Feature Task');
      expect(res.body.description).toBe('New feature');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    test('should trim whitespace from assignee name', async () => {
      const task = taskService.create({ title: 'Trim Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  Manish Kumar  ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Manish Kumar');
    });

    test('should allow reassigning a task to a new user and return 200', async () => {
      const task = taskService.create({ title: 'Shared Task' });
      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    test('should return 404 when task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/nonexistent-id/assign')
        .send({ assignee: 'Manish' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('should return 400 when assignee is missing', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 when assignee is an empty string', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 when assignee is whitespace only', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '    ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 when assignee is a non-string value', async () => {
      const task = taskService.create({ title: 'Task' });

      const resNumber = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });
      expect(resNumber.status).toBe(400);
      expect(resNumber.body.error).toBe('assignee is required and must be a non-empty string');

      const resNull = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: null });
      expect(resNull.status).toBe(400);
      expect(resNull.body.error).toBe('assignee is required and must be a non-empty string');

      const resBool = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: true });
      expect(resBool.status).toBe(400);
      expect(resBool.body.error).toBe('assignee is required and must be a non-empty string');
    });
  });
});

