import request from 'supertest';
import app from '../../app.js';
import { connectTestDB, clearTestDB, disconnectTestDB, setupOrgWithUsers, createTask } from '../helpers/testUtils.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe('Tasks - Integration Tests', () => {
  let ctx;
  beforeEach(async () => { ctx = await setupOrgWithUsers(); });

  const taskPayload = {
    title: 'Fix login bug',
    description: 'Users cannot log in on Safari',
    status: 'todo',
    priority: 'urgent',
    tags: ['bug', 'auth'],
  };

  // List Tasks

  describe('GET /api/orgs/:orgId/tasks', () => {
    beforeEach(async () => {
      await createTask(ctx.org, ctx.owner, { title: 'Task A', status: 'todo',        priority: 'high'   });
      await createTask(ctx.org, ctx.owner, { title: 'Task B', status: 'in_progress', priority: 'medium' });
      await createTask(ctx.org, ctx.owner, { title: 'Task C', status: 'done',        priority: 'low'    });
    });

    it('viewer can list tasks', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/tasks`)
        .set('Authorization', `Bearer ${ctx.viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/tasks?status=todo`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((t) => t.status === 'todo')).toBe(true);
    });

    it('filters by priority', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/tasks?priority=high`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.body.data.every((t) => t.priority === 'high')).toBe(true);
    });

    it('searches by title', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/tasks?search=Task A`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Task A');
    });

    it('returns pagination metadata', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/tasks?page=1&limit=2`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.data.length).toBe(2);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get(`/api/orgs/${ctx.org._id}/tasks`);
      expect(res.status).toBe(401);
    });
  });

  // Create Task

  describe('POST /api/orgs/:orgId/tasks', () => {
    it('member can create a task', async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/tasks`)
        .set('Authorization', `Bearer ${ctx.memberToken}`)
        .send(taskPayload);
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(taskPayload.title);
      expect(res.body.data.organization).toBe(ctx.org._id.toString());
    });

    it('viewer cannot create a task — 403', async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/tasks`)
        .set('Authorization', `Bearer ${ctx.viewerToken}`)
        .send(taskPayload);
      expect(res.status).toBe(403);
    });

    it('sets createdBy to the current user', async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/tasks`)
        .set('Authorization', `Bearer ${ctx.memberToken}`)
        .send(taskPayload);
      expect(res.body.data.createdBy).toBe(ctx.member._id.toString());
    });

    it('returns error if title is missing', async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/tasks`)
        .set('Authorization', `Bearer ${ctx.memberToken}`)
        .send({ priority: 'high' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Update Task

  describe('PATCH /api/orgs/:orgId/tasks/:taskId', () => {
    let task;
    beforeEach(async () => {
      task = await createTask(ctx.org, ctx.member);
    });

    it('task creator can update it', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${task._id}`)
        .set('Authorization', `Bearer ${ctx.memberToken}`)
        .send({ status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('admin can update any task', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${task._id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ priority: 'low' });
      expect(res.status).toBe(200);
    });

    it('unrelated member cannot update task — 403', async () => {
      // Create a task by owner; member tries to update it
      const ownerTask = await createTask(ctx.org, ctx.owner);
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${ownerTask._id}`)
        .set('Authorization', `Bearer ${ctx.memberToken}`)
        .send({ status: 'done' });
      expect(res.status).toBe(403);
    });

    it('viewer cannot update any task — 403', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${task._id}`)
        .set('Authorization', `Bearer ${ctx.viewerToken}`)
        .send({ status: 'done' });
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent task', async () => {
      const fakeId = '64a1234567890abcde123456';
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ status: 'done' });
      expect(res.status).toBe(404);
    });
  });

  // Archive Task

  describe('PATCH /api/orgs/:orgId/tasks/:taskId/archive', () => {
    let task;
    beforeEach(async () => { task = await createTask(ctx.org, ctx.owner); });

    it('admin can archive a task', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${task._id}/archive`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isArchived).toBe(true);
    });

    it('member cannot archive a task — 403', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${task._id}/archive`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(403);
    });

    it('archived tasks are excluded from list', async () => {
      await request(app)
        .patch(`/api/orgs/${ctx.org._id}/tasks/${task._id}/archive`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/tasks`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      const found = res.body.data.find((t) => t._id === task._id.toString());
      expect(found).toBeUndefined();
    });
  });

  // Delete Task

  describe('DELETE /api/orgs/:orgId/tasks/:taskId', () => {
    let task;
    beforeEach(async () => { task = await createTask(ctx.org, ctx.owner); });

    it('admin can delete a task', async () => {
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}/tasks/${task._id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(204);
    });

    it('member cannot delete a task — 403', async () => {
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}/tasks/${task._id}`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for already-deleted task', async () => {
      await request(app)
        .delete(`/api/orgs/${ctx.org._id}/tasks/${task._id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}/tasks/${task._id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});