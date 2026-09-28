const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('should return null for valid task data with required fields only', () => {
      const result = validateCreateTask({ title: 'A valid title' });
      expect(result).toBeNull();
    });

    test('should return null for valid task data with all fields', () => {
      const result = validateCreateTask({
        title: 'Complete assignment',
        description: 'Writing unit and integration tests',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-01T12:00:00.000Z',
      });
      expect(result).toBeNull();
    });

    test('should return error when title is missing', () => {
      const result = validateCreateTask({});
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should return error when title is not a string', () => {
      const result = validateCreateTask({ title: 12345 });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should return error when title is empty string', () => {
      const result = validateCreateTask({ title: '' });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should return error when title is whitespace only', () => {
      const result = validateCreateTask({ title: '    ' });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('should return error when status is invalid', () => {
      const result = validateCreateTask({ title: 'Task', status: 'unknown_status' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('should return error when priority is invalid', () => {
      const result = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('should return error when dueDate is not a valid date string', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: 'invalid-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    test('should return null for empty update body', () => {
      const result = validateUpdateTask({});
      expect(result).toBeNull();
    });

    test('should return null for valid partial updates', () => {
      expect(validateUpdateTask({ title: 'Updated Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-11-01T00:00:00.000Z' })).toBeNull();
    });

    test('should return error when title is present but not a string', () => {
      const result = validateUpdateTask({ title: null });
      expect(result).toBe('title must be a non-empty string');
    });

    test('should return error when title is present but whitespace only', () => {
      const result = validateUpdateTask({ title: '   ' });
      expect(result).toBe('title must be a non-empty string');
    });

    test('should return error when status is invalid', () => {
      const result = validateUpdateTask({ status: 'completed' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('should return error when priority is invalid', () => {
      const result = validateUpdateTask({ priority: 'critical' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('should return error when dueDate is an invalid date string', () => {
      const result = validateUpdateTask({ dueDate: 'not-a-real-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    test('should return null for valid assignee string', () => {
      const result = validateAssignTask({ assignee: 'Manish' });
      expect(result).toBeNull();
    });

    test('should return error when assignee is missing from body', () => {
      const result = validateAssignTask({});
      expect(result).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error when body is null or undefined', () => {
      expect(validateAssignTask(null)).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask(undefined)).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error when assignee is empty string', () => {
      const result = validateAssignTask({ assignee: '' });
      expect(result).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error when assignee is whitespace only', () => {
      const result = validateAssignTask({ assignee: '   ' });
      expect(result).toBe('assignee is required and must be a non-empty string');
    });

    test('should return error when assignee is not a string (number, boolean, object, null)', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: null })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: { name: 'Manish' } })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: ['Manish'] })).toBe('assignee is required and must be a non-empty string');
    });
  });
});

