# Task API — Take Home Assignment

A robust, thoroughly tested, in-memory REST API built with Node.js and Express for managing tasks.

---

## Overview

This repository contains the completed take-home assignment: "The Untested API". The initial codebase lacked automated tests, contained several subtle and critical bugs, and was missing a required feature. 

Over the course of this assignment:
1. A comprehensive suite of **76 unit and integration tests** was written using Jest and Supertest, achieving **98.7% statement coverage** (and 100% across routes, services, and validators).
2. Four real bugs were identified through testing and code review and documented in detail in `BUG_REPORT.md`.
3. The critical **Pagination Off-by-One bug** was fixed with regression testing.
4. The **`PATCH /tasks/:id/assign`** endpoint was designed, implemented, and fully tested.
5. All design decisions, edge cases, and production considerations were documented.

---

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express 4.18.2
- **Testing:** Jest 29.7.0, Supertest 6.3.4
- **Utilities:** `uuid` 9.0.0
- **Architecture:** 3-tier REST architecture (Routes, Services, Validation Helpers) with in-memory persistence.

---

## Setup

Navigate to the `task-api` directory and install dependencies:

```bash
cd task-api
npm install
```

---

## Running the Application

Start the API server (runs on `http://localhost:3000` by default):

```bash
npm start
```

---

## Running Tests

Run the full test suite with Jest:

```bash
npm test
```

---

## Coverage

Generate coverage reports with Jest:

```bash
npm run coverage
```

### Coverage Report Summary

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    98.7 |    98.85 |   96.66 |   98.58 |                   
 src             |   84.61 |       75 |      50 |   84.61 |                   
  app.js         |   84.61 |       75 |      50 |   84.61 | 17-18 (app.listen)
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |      100 |     100 |     100 |                   
  taskService.js |     100 |      100 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       76 passed, 76 total
Snapshots:   0 total
```

*(Note: Uncovered lines 17-18 in `app.js` represent the `if (require.main === module) app.listen(...)` block, which only executes when starting the server directly rather than when imported by Supertest).*

---

## API Endpoints

| Method | Path | Query / Body Params | Status | Description |
|---|---|---|---|---|
| `GET` | `/tasks` | None | `200` | Returns all tasks. |
| `GET` | `/tasks?status=todo` | `status` (string) | `200` | Filter tasks by status (`todo`, `in_progress`, `done`). |
| `GET` | `/tasks?page=1&limit=10` | `page`, `limit` (integers) | `200` | Paginated task list (1-based page index). |
| `GET` | `/tasks/stats` | None | `200` | Returns status counts and overdue tasks count. |
| `POST` | `/tasks` | `{ title, description?, status?, priority?, dueDate? }` | `201` / `400` | Creates a new task. Generates UUID and `createdAt`. |
| `PUT` | `/tasks/:id` | `{ title?, description?, status?, priority?, dueDate? }` | `200` / `400` / `404` | Updates an existing task. |
| `DELETE` | `/tasks/:id` | Path `:id` | `204` / `404` | Deletes a task by ID. |
| `PATCH` | `/tasks/:id/complete` | Path `:id` | `200` / `404` | Marks task status as `done` and sets `completedAt`. |
| `PATCH` | `/tasks/:id/assign` | `{ assignee: string }` | `200` / `400` / `404` | **New:** Assigns task to user. |

---

## Tests Added

76 automated tests were implemented across three test suites:

1. **`tests/unit/validators.test.js` (21 tests)**:
   - `validateCreateTask`: required title, non-empty/non-whitespace validation, enum checking for status (`todo`, `in_progress`, `done`) and priority (`low`, `medium`, `high`), ISO date format validation.
   - `validateUpdateTask`: optional field validation, empty body acceptance, invalid types and invalid enums.
   - `validateAssignTask`: valid assignee strings, missing assignee, empty string, whitespace-only, non-string types (numbers, booleans, objects, arrays, null).

2. **`tests/unit/taskService.test.js` (28 tests)**:
   - `create`: default values (`status='todo'`, `priority='medium'`, `dueDate=null`, `completedAt=null`, generated UUID, valid ISO `createdAt`), custom fields.
   - `getAll`: empty array, populated array, shallow-copy protection against external mutation.
   - `findById`: existing task lookup, nonexistent ID returning `undefined`.
   - `getByStatus`: filtering for each valid status, no-match scenario.
   - `getPaginated`: 1-based offset calculation for page 1 and page 2, out-of-bounds page handling.
   - `getStats`: accurate count aggregation across statuses, overdue task detection (`dueDate < now && status !== 'done'`), completed task past-due exclusion, non-standard status handling, empty dataset.
   - `update`: updating single and multiple attributes, nonexistent ID returning `null`.
   - `remove`: deletion returning `true`, nonexistent ID returning `false`.
   - `completeTask`: updating status to `done`, setting `completedAt`, nonexistent ID returning `null`.
   - `assignTask`: storing assignee, preserving other fields, reassigning existing assignee, nonexistent ID returning `null`.

3. **`tests/integration/tasks.test.js` (27 tests)**:
   - Full HTTP request/response validation using Supertest for all endpoints.
   - Happy paths for `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`, `PATCH /tasks/:id/complete`, `GET /tasks/stats`, `PATCH /tasks/:id/assign`.
   - Meaningful edge cases:
     - Out-of-bounds pagination returns empty array.
     - Fallback to defaults when non-numeric pagination parameters are supplied.
     - Completed tasks with past due dates are excluded from `overdue` count.
     - Malformed JSON handling triggers the global 500 error handler.
     - Reassignment of already assigned tasks.
     - Whitespace trimming for assignee.
     - 400 validation failures and 404 not found errors across all routes.

Test isolation is maintained via `beforeEach(() => { taskService._reset(); })` in every suite.

---

## Bugs Found

Detailed bug investigation reports are documented in [BUG_REPORT.md](./BUG_REPORT.md).

1. **Bug 1 — Pagination Offset Calculation Off-by-One (`src/services/taskService.js:12`)**:
   - `offset = page * limit` skipped the first page of results when `page=1`.
2. **Bug 2 — `completeTask` Clobbers Task Priority to `medium` (`src/services/taskService.js:69`)**:
   - Line 69 hardcodes `priority: 'medium'` during completion, corrupting high/low priorities.
3. **Bug 3 — `getByStatus` Uses Loose Substring Matching (`src/services/taskService.js:9`)**:
   - `tasks.filter((t) => t.status.includes(status))` matches substring substrings (e.g. `do` matches both `todo` and `done`).
4. **Bug 4 — `PUT /tasks/:id` Overwrites Immutable `id` and `createdAt` (`src/services/taskService.js:50`)**:
   - Spreading `req.body` directly allows callers to overwrite system fields.

---

## Bug Fixed

### Selected Bug: Pagination Off-by-One (Bug 1)

- **Location:** `src/services/taskService.js`, lines 11–15
- **Why this bug was selected:** It directly impacts core API behavior (`GET /tasks?page=1&limit=10`), causing users querying Page 1 to completely miss the first page of data. Fixing it restores standard 1-based REST pagination without breaking any dependencies.
- **Original Code:**
  ```javascript
  const getPaginated = (page, limit) => {
    const offset = page * limit;
    return tasks.slice(offset, offset + limit);
  };
  ```
- **Fix Applied:**
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, page);
    const offset = (pageNum - 1) * limit;
    return tasks.slice(offset, offset + limit);
  };
  ```
- **Regression Tests:**
  - `tests/unit/taskService.test.js`: `'should return first page with correct items for page 1'`
  - `tests/integration/tasks.test.js`: `'should return paginated tasks when page and limit query params are provided'`

---

## New Feature: `PATCH /tasks/:id/assign`

Implements the requirement to assign a task to a user.

### Request Specification
- **Method:** `PATCH`
- **Path:** `/tasks/:id/assign`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "assignee": "Manish"
  }
  ```

### Responses
- `200 OK`: Returns the updated task object containing `"assignee": "Manish"` while preserving all other fields.
- `400 Bad Request`: When `assignee` is missing, empty, whitespace-only, or not a string. Body: `{ "error": "assignee is required and must be a non-empty string" }`.
- `404 Not Found`: When `:id` does not match any existing task. Body: `{ "error": "Task not found" }`.

---

## Design Decisions

1. **Why the assignee validation works the way it does:**
   - Validates that `assignee` exists, is a `string`, and contains non-whitespace characters (`body.assignee.trim() === ''`).
   - Rejects non-string types (`number`, `boolean`, `object`, `null`) because assignee names must be human-readable strings.
   - Trims leading and trailing whitespace before storing (`req.body.assignee.trim()`) to prevent accidental formatting discrepancies.
2. **What happens when assignee is empty:**
   - Returns HTTP `400 Bad Request` with `{ "error": "assignee is required and must be a non-empty string" }`. An empty assignee does not represent a valid user.
3. **What happens when assignee is whitespace:**
   - Treated the same as an empty string: returns HTTP `400 Bad Request`.
4. **What happens when task doesn't exist:**
   - Returns HTTP `404 Not Found` with `{ "error": "Task not found" }`, adhering strictly to the conventions of `PUT /tasks/:id`, `DELETE /tasks/:id`, and `PATCH /tasks/:id/complete`.
5. **What happens when a task is already assigned:**
   - **Reassignment is allowed.** In a task management workflow, tasks are routinely reassigned between team members. The endpoint replaces the existing `assignee` with the new value and returns `200 OK`.
6. **Why the selected bug was fixed:**
   - Bug 1 (pagination offset calculation) was chosen because pagination is an essential query mechanism for listing resources. Failing on `page=1` breaks the default pagination experience for every client.
7. **Why the bug fix was implemented the way it was:**
   - `Math.max(1, page)` protects against `0` or negative page numbers, and `(pageNum - 1) * limit` correctly maps 1-based page indices to 0-based array slice offsets.
8. **Tradeoffs made:**
   - We preserved the existing unassigned task shape without retroactively injecting `assignee: null` into initial `create()` calls, ensuring zero regression risk for existing consumers.
   - For `PATCH /tasks/:id/assign`, we chose not to support unassigning (e.g., passing `{ assignee: null }`) because the assignment specifically requested validating that `assignee` is a string. If unassignment is needed in the future, a dedicated `DELETE /tasks/:id/assign` or explicit `{ assignee: null }` handling should be introduced.

---

## What Surprised Me

1. **Discrepancy in status enums:** `README.md` documented statuses as `pending | in-progress | completed`, whereas the actual validator code, service code, and `ASSIGNMENT.md` used `todo | in_progress | done`. We chose the actual code implementation as the authoritative source of truth.
2. **Hardcoded priority demotion in `completeTask`:** `completeTask` explicitly reset `priority: 'medium'` during completion. It was surprising to see a priority override hardcoded directly into a completion handler.
3. **No `GET /tasks/:id` endpoint:** The original API had `PUT /tasks/:id`, `DELETE /tasks/:id`, and `PATCH /tasks/:id/complete`, but no single-task lookup endpoint (`GET /tasks/:id`).

---

## What I Would Test Next

With more time, I would add:
1. **JSON Payload Size & Malformed Body Edge Cases:** Verify body size limits to protect against DoS attacks.
2. **Concurrency / Race Condition Testing:** If persisted to a database, test concurrent updates to the same task (optimistic locking).
3. **Large & Negative Pagination Numbers:** Test behaviors for `limit=0`, negative limits, and huge limits (`limit=1000000`).
4. **Timezone Transitions for Due Dates:** Test ISO string parsing with negative UTC offsets and Daylight Savings boundaries.
5. **State Transition Validation:** Test that completed tasks cannot transition back to invalid states or be completed twice.
6. **Response Schema Contract Tests:** Automated validation against an OpenAPI 3.0 schema.

---

## Questions Before Production

1. **Authentication & Authorization:** Who is allowed to assign tasks, complete tasks, or delete tasks? Should assignees only be assigned by managers or task creators?
2. **Assignee Reference:** Should `assignee` be a user ID (`UUID`) referencing an authenticated user record rather than an arbitrary freeform string?
3. **Task Status Transitions:** Is arbitrary status changing allowed (e.g. `done` -> `in_progress`), or should strict lifecycle transitions be enforced?
4. **Soft Deletes vs Hard Deletes:** Should `DELETE /tasks/:id` perform a soft delete (`deletedAt` timestamp) rather than permanent deletion from the store?
5. **Pagination Standards:** What is the maximum allowed `limit` for pagination (e.g., max 100), and should response envelopes include pagination metadata (`total`, `page`, `totalPages`)?
6. **Persistence & Transactions:** What database (PostgreSQL, MongoDB) will replace the in-memory store, and what indexing strategy will be used for `status` and `dueDate`?
