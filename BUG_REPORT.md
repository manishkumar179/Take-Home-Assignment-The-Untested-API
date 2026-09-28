# Bug Report

This document details the bugs identified during code review, test suite implementation, and execution for the Task Manager API.

---

## Bug 1 — Pagination Offset Calculation Off-by-One

### Location
- **File:** `src/services/taskService.js`
- **Function:** `getPaginated`
- **Lines:** 11–14
```javascript
const getPaginated = (page, limit) => {
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
};
```

### Expected Behavior
For 1-based pagination (as used by the API in `routes/tasks.js:20`, where `page` defaults to 1):
- `page=1, limit=10` should return the first 10 items (indices `0` to `9`).
- The offset calculation should be `(page - 1) * limit`.

### Actual Behavior
When `page=1, limit=10` is passed, `offset = 1 * 10 = 10`. The slice begins at index 10, completely skipping the first 10 items (indices `0` to `9`). Querying `page=1` actually returns Page 2.

### How Discovered
Discovered through unit testing in `tests/unit/taskService.test.js` (`getPaginated › should return first page with correct items for page 1`) and integration testing in `tests/integration/tasks.test.js` (`GET /tasks › should return paginated tasks when page and limit query params are provided`). Both tests failed on assertion `expect(page1[0].id).toBe(t1.id)`.

### Root Cause
The function multiplied `page * limit` directly without converting from a 1-based page index to a 0-based offset `(page - 1) * limit`.

### Impact
Critical API failure for pagination. Users querying the first page of results miss all items on the first page, resulting in missing data and empty arrays for small collections.

### Proposed Fix
Calculate the 0-based offset using `(Math.max(1, page) - 1) * limit`:
```javascript
const getPaginated = (page, limit) => {
  const pageNum = Math.max(1, page);
  const offset = (pageNum - 1) * limit;
  return tasks.slice(offset, offset + limit);
};
```

### Status
**Fixed** in Phase 6. Regression tests pass.

---

## Bug 2 — `completeTask` Clobbers Task Priority to `medium`

### Location
- **File:** `src/services/taskService.js`
- **Function:** `completeTask`
- **Line:** 69
```javascript
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

### Expected Behavior
Marking a task complete via `PATCH /tasks/:id/complete` should only update `status` to `'done'` and set `completedAt` to the current ISO timestamp, preserving the task's existing `priority` (`low`, `medium`, or `high`).

### Actual Behavior
The property `priority: 'medium'` is explicitly hardcoded in the updated object. Completing a `high` priority or `low` priority task involuntarily mutates its priority to `medium`.

### How Discovered
Discovered through static code analysis of `src/services/taskService.js` during the Phase 0 inspection.

### Root Cause
An unintentional field assignment was left in the object literal when copying task properties.

### Impact
Data loss/corruption of task priority history upon completion. Metrics or audit trails relying on task priority will reflect inaccurate values for completed tasks.

### Proposed Fix
Remove `priority: 'medium'` from the object spread:
```javascript
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

### Status
Not fixed (documented for review).

---

## Bug 3 — `getByStatus` Performs Substring Search Instead of Exact Equality

### Location
- **File:** `src/services/taskService.js`
- **Function:** `getByStatus`
- **Line:** 9
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

### Expected Behavior
Querying tasks by status (e.g., `GET /tasks?status=todo`) should only return tasks whose status strictly matches the query (`t.status === status`).

### Actual Behavior
Because `String.prototype.includes` is used, any status containing the input substring is matched. For example, filtering by `status=do` returns tasks with status `'todo'` AND `'done'`.

### How Discovered
Code review of `src/services/taskService.js` during Phase 0 inspection.

### Root Cause
Use of `String.prototype.includes()` rather than strict equality comparison (`===`).

### Impact
Unexpected query results when filtering tasks, breaking contract expectations for enum-based status filtering.

### Proposed Fix
Replace `t.status.includes(status)` with `t.status === status`:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

### Status
Not fixed (documented for review).

---

## Bug 4 — `PUT /tasks/:id` Overwrites Immutable `id` and `createdAt`

### Location
- **File:** `src/services/taskService.js`
- **Function:** `update`
- **Line:** 50
```javascript
const updated = { ...tasks[index], ...fields };
```

### Expected Behavior
Task identifiers (`id`) and audit creation timestamps (`createdAt`) are immutable system fields. A client sending `PUT /tasks/:id` with `{ "id": "new-id", "createdAt": "2020-01-01" }` should not be able to alter these fields.

### Actual Behavior
Because `fields` is spread directly over `tasks[index]`, any field supplied in the request body replaces the existing value, allowing clients to mutate `id` and `createdAt`.

### How Discovered
Code review of `src/services/taskService.js` and `src/utils/validators.js`.

### Root Cause
Lack of property allowlisting or destructuring to strip immutable properties before merging.

### Impact
Security and data integrity vulnerability: tasks can be reassigned arbitrary IDs, causing orphaned records or ID collisions, and historical timestamps can be falsified.

### Proposed Fix
Destructure and omit immutable fields:
```javascript
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const { id: _id, createdAt: _createdAt, ...allowedUpdates } = fields;
  const updated = { ...tasks[index], ...allowedUpdates };
  tasks[index] = updated;
  return updated;
};
```

### Status
Not fixed (documented for review).
