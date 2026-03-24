# SaaS App — Backend API

A multi-tenant SaaS backend built with **Node.js**, **Express**, and **MongoDB (Mongoose)**. Features JWT authentication, role-based access control (RBAC), task management, notifications, audit logging, and reporting — all scoped per organization (tenant).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [npm Scripts](#npm-scripts)
- [Authentication](#authentication)
- [RBAC — Role System](#rbac--role-system)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Users](#users)
  - [Organizations](#organizations)
  - [Tasks](#tasks)
  - [Roles](#roles)
  - [Notifications](#notifications)
  - [Reports](#reports)
  - [Audit Logs](#audit-logs)
- [Common Use Cases](#common-use-cases)
- [Error Responses](#error-responses)

---

## Tech Stack

| Layer         | Technology                    |
| ------------- | ----------------------------- |
| Runtime       | Node.js >= 18                 |
| Framework     | Express 5                     |
| Database      | MongoDB via Mongoose 9        |
| Auth          | JWT (jsonwebtoken) + bcryptjs |
| Rate Limiting | express-rate-limit            |
| Dev           | nodemon                       |

---

## Project Structure

```
├── config/
│   ├── db.js             # MongoDB connection with auto-reconnect
│   └── .env.example      # Template to copy from
├── controllers/          # Business logic (8 controllers)
│   ├── auditLogController.js
│   ├── authController.js
│   ├── notificationController.js
│   ├── organizationController.js
│   ├── reportController.js
│   ├── roleController.js
│   ├── taskController.js
│   └── userController.js
├── middleware/
│   ├── auth.js           # JWT protect middleware
│   ├── rbac.js           # Role-based access control
│   ├── rateLimiter.js    # Rate limit configs
│   └── errorHandler.js   # Global error handler
├── models/               # Mongoose schemas (Organization, User, Task)
│   ├── auditLogModel.js
│   ├── notificationModel.js
│   ├── organizationModel.js
│   ├── taskModel.js
│   └── userModel.js
├── routes/               # Express routers (8 route files)
│   ├── auditRoutes.js
│   ├── authRoutes.js
│   ├── notificationRoutes.js
│   ├── organizationRoutes.js
│   ├── reportRoutes.js
│   ├── roleRoutes.js
│   ├── taskRoutes.js
│   └── userRoutes.js
├── scripts/
│   └── seed.js           # Dev database seeder
├── app.js                # Express app setup and entry point
├── .env                  # Local dev secrets
├── .env.example          # Template to copy from
└── package.json
```

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/ali46515/Task-Manager-API.git
cd task-manager-api
npm install
```

### 2. Configure environment

```bash
cp ./.env.example ./.env
```

Fill in `./.env`:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=saas_app_dev
JWT_SECRET=<generate below>
JWT_EXPIRES_IN=7d
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Seed the database (optional)

```bash
npm run seed
```

### 4. Start the server

```bash
npm run dev     # development (nodemon)
npm start       # production
```

Server starts at `http://localhost:8080`.

---

## Environment Variables

| Variable         | Required | Default        | Description               |
| ---------------- | -------- | -------------- | ------------------------- |
| `MONGO_URI`      | ✅       | —              | MongoDB connection string |
| `DB_NAME`        | ❌       | `saas_app_dev` | Database name             |
| `JWT_SECRET`     | ✅       | —              | Secret for signing JWTs   |
| `JWT_EXPIRES_IN` | ❌       | `7d`           | JWT expiry duration       |
| `PORT`           | ❌       | `8080`         | HTTP server port          |
| `NODE_ENV`       | ❌       | `development`  | Environment name          |

---

## npm Scripts

| Script               | Description                        |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start with nodemon (auto-restart)  |
| `npm start`          | Start without nodemon              |
| `npm run seed`       | Seed dev database with sample data |
| `npm run seed:clear` | Wipe all collections               |

---

## Authentication

All protected routes require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned on `register` and `login`. They expire after `JWT_EXPIRES_IN` (default 7 days).

---

## RBAC — Role System

Every user has a role **per organization**. Roles follow a strict hierarchy:

| Role     | Level | Can do                                             |
| -------- | ----- | -------------------------------------------------- |
| `owner`  | 4     | Everything — delete org, transfer ownership        |
| `admin`  | 3     | Manage members, roles, tasks, view reports & audit |
| `member` | 2     | Create & update own tasks                          |
| `viewer` | 1     | Read-only access to tasks and org data             |

A user can belong to multiple organizations with different roles in each.

---

## API Reference

Base URL: `http://localhost:8080/api`

---

### Auth

#### Register

`POST /auth/register`

Creates a new user and a new organization. The user becomes the `owner`.

**Body:**

```json
{
  "name": "Muneeb Ali",
  "email": "muneeb@acme.com",
  "password": "password123",
  "orgSlug": "acme-corp",
  "role": "admin"
}
```

**Response `201`:**

```json
{
  "status": "success",
  "token": "<jwt>",
  "data": { "user": { ... } }
}
```

---

#### Login

`POST /auth/login`

**Body:**

```json
{
  "email": "ali@example.com",
  "password": "securepassword"
}
```

**Response `200`:** Same shape as register.

---

#### Logout

`POST /auth/logout` 🔒

**Response `200`:**

```json
{ "status": "success", "message": "Logged out successfully" }
```

---

#### Forgot Password

`POST /auth/forgot-password`

**Body:** `{ "email": "alice@example.com" }`

Generates a reset token (send via email in production).

---

#### Reset Password

`PATCH /auth/reset-password/:token`

**Body:** `{ "password": "newpassword123" }`

---

### Users

#### Get My Profile

`GET /users/me` 🔒

Returns current user with populated org memberships.

---

#### Update My Profile

`PATCH /users/me` 🔒

**Body (any of):**

```json
{ "name": "Ali Updated", "avatar": "https://..." }
```

---

#### Delete My Account

`DELETE /users/me` 🔒

Soft-deletes the account (`isActive: false`). Returns `204`.

---

### Organizations

#### Create Organization

`POST /orgs` 🔒

**Body:** `{ "name": "New Org" }`

Current user becomes the owner.

---

#### Get Organization

`GET /orgs/:orgId` 🔒 `viewer+`

---

#### Update Organization

`PATCH /orgs/:orgId` 🔒 `admin+`

**Body (any of):** `{ "name": "...", "plan": "pro", "settings": { "maxMembers": 20 } }`

---

#### Delete Organization

`DELETE /orgs/:orgId` 🔒 `owner`

Removes the org and all member associations. Returns `204`.

---

#### Get Members

`GET /orgs/:orgId/members` 🔒 `viewer+`

Returns all members with their roles.

---

#### Invite Member

`POST /orgs/:orgId/members/invite` 🔒 `admin+`

**Body:** `{ "email": "bob@example.com", "role": "member" }`

Rate limited to 30 invites/hour.

---

#### Remove Member

`DELETE /orgs/:orgId/members/:userId` 🔒 `admin+`

Cannot remove the org owner.

---

### Tasks

#### List Tasks

`GET /orgs/:orgId/tasks` 🔒 `viewer+`

**Query params:**

| Param       | Type     | Example                                                 |
| ----------- | -------- | ------------------------------------------------------- |
| `status`    | string   | `todo`, `in_progress`, `in_review`, `done`, `cancelled` |
| `priority`  | string   | `low`, `medium`, `high`, `urgent`                       |
| `assignee`  | ObjectId | `664abc...`                                             |
| `tags`      | string   | `bug,devops`                                            |
| `search`    | string   | `login`                                                 |
| `dueBefore` | date     | `2024-12-31`                                            |
| `dueAfter`  | date     | `2024-01-01`                                            |
| `page`      | number   | `1`                                                     |
| `limit`     | number   | `20`                                                    |

---

#### Get Task

`GET /orgs/:orgId/tasks/:taskId` 🔒 `viewer+`

---

#### Create Task

`POST /orgs/:orgId/tasks` 🔒 `member+`

**Body:**

```json
{
  "title": "Fix login bug",
  "description": "Users cannot log in on Safari",
  "status": "todo",
  "priority": "urgent",
  "assignee": "<userId>",
  "dueDate": "2024-08-01",
  "tags": ["bug", "auth"]
}
```

---

#### Update Task

`PATCH /orgs/:orgId/tasks/:taskId` 🔒 `member+`

Members can only update tasks they created or are assigned to. Admins can update any task.

---

#### Delete Task

`DELETE /orgs/:orgId/tasks/:taskId` 🔒 `admin+`

Hard delete. Returns `204`.

---

#### Archive Task

`PATCH /orgs/:orgId/tasks/:taskId/archive` 🔒 `admin+`

Soft delete — sets `isArchived: true`. Archived tasks are excluded from list results.

---

### Roles

#### Get Org Roles

`GET /orgs/:orgId/roles` 🔒 `admin+`

Lists all members and their current roles.

---

#### Update Member Role

`PATCH /orgs/:orgId/roles/:userId` 🔒 `admin+`

**Body:** `{ "role": "admin" }`

- Cannot assign `owner` role (use transfer ownership instead)
- Admins cannot assign `admin` or higher

---

#### Transfer Ownership

`PATCH /orgs/:orgId/roles/transfer-ownership` 🔒 `owner`

**Body:** `{ "newOwnerId": "<userId>" }`

Current owner is demoted to `admin`. New owner is promoted to `owner`.

---

### Notifications

#### Get Notifications

`GET /orgs/:orgId/notifications` 🔒 `viewer+`

**Query params:** `page`, `limit`, `unreadOnly=true`

Response includes `unreadCount`.

---

#### Mark as Read

`PATCH /orgs/:orgId/notifications/:notifId/read` 🔒

---

#### Mark All as Read

`PATCH /orgs/:orgId/notifications/read-all` 🔒

---

#### Delete Notification

`DELETE /orgs/:orgId/notifications/:notifId` 🔒

---

### Reports

All report endpoints require `admin+`.

#### Overview

`GET /orgs/:orgId/reports/overview`

Returns total tasks, overdue count, status breakdown, and priority breakdown.

**Response:**

```json
{
  "data": {
    "totalTasks": 42,
    "overdueTasks": 5,
    "statusBreakdown": [{ "_id": "todo", "count": 12 }, ...],
    "priorityBreakdown": [{ "_id": "high", "count": 8 }, ...]
  }
}
```

---

#### Tasks by Member

`GET /orgs/:orgId/reports/by-member`

Per-assignee breakdown: total, done, in-progress, overdue.

---

#### Completion Timeline

`GET /orgs/:orgId/reports/timeline`

Daily count of completed tasks over the last 30 days.

---

### Audit Logs

All audit endpoints require `admin+`. Logs auto-expire after 1 year.

#### Get Audit Logs

`GET /orgs/:orgId/audit`

**Query params:** `action`, `performedBy`, `targetType`, `from`, `to`, `page`, `limit`

**Action values:** `task.created`, `task.updated`, `task.deleted`, `task.archived`, `member.invited`, `member.removed`, `role.changed`, `org.updated`, `ownership.transferred`

---

#### Get Audit Log by ID

`GET /orgs/:orgId/audit/:logId`

---

## Common Use Cases

### 1. Register and set up a new workspace

```bash
# 1. Register (creates user + org in one step)
POST /api/auth/register
{ "name": "Alice", "email": "alice@co.com", "password": "pass1234", "orgName": "My SaaS" }
# → save the token and orgId from response

# 2. Invite teammates
POST /api/orgs/:orgId/members/invite
{ "email": "bob@co.com", "role": "admin" }

# 3. Create your first task
POST /api/orgs/:orgId/tasks
{ "title": "Launch MVP", "priority": "high", "dueDate": "2024-09-01" }
```

---

### 2. Manage a sprint board

```bash
# Get all in-progress tasks assigned to a specific user
GET /api/orgs/:orgId/tasks?status=in_progress&assignee=<userId>

# Move a task to review
PATCH /api/orgs/:orgId/tasks/:taskId
{ "status": "in_review" }

# Mark as done
PATCH /api/orgs/:orgId/tasks/:taskId
{ "status": "done" }
```

---

### 3. Check team performance

```bash
# Overview dashboard data
GET /api/orgs/:orgId/reports/overview

# See who has the most overdue tasks
GET /api/orgs/:orgId/reports/by-member

# Chart completions over last 30 days
GET /api/orgs/:orgId/reports/timeline
```

---

### 4. Promote a member and audit the change

```bash
# Promote carol to admin
PATCH /api/orgs/:orgId/roles/:carolId
{ "role": "admin" }

# Verify in audit log
GET /api/orgs/:orgId/audit?action=role.changed
```

---

### 5. Transfer org ownership before leaving

```bash
# Transfer to another admin
PATCH /api/orgs/:orgId/roles/transfer-ownership
{ "newOwnerId": "<newOwnerId>" }

# Then deactivate your own account
DELETE /api/users/me
```

---

## Error Responses

All errors follow this shape:

```json
{
  "status": "fail",
  "message": "Descriptive error message"
}
```

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 400  | Bad request / validation error          |
| 401  | Missing or invalid JWT                  |
| 403  | Insufficient role / account deactivated |
| 404  | Resource not found                      |
| 409  | Conflict (duplicate email, etc.)        |
| 429  | Rate limit exceeded                     |
| 500  | Internal server error                   |

In `development` mode, `stack` trace is included in 500 responses.

---

> 🔒 = requires JWT &nbsp;|&nbsp; `viewer+` = minimum role required
