import request from 'supertest';
import app from '../../app.js';
import { connectTestDB, clearTestDB, disconnectTestDB, setupOrgWithUsers, createTask } from '../helpers/testUtils.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// Roles

describe('Roles - Integration Tests', () => {
  let ctx;
  beforeEach(async () => { ctx = await setupOrgWithUsers(); });

  describe('GET /api/orgs/:orgId/roles', () => {
    it('admin can list all roles', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/roles`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('member cannot list roles — 403', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/roles`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/orgs/:orgId/roles/:userId', () => {
    it('owner can promote member to admin', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/roles/${ctx.member._id}`)
        .set('Authorization', `Bearer ${ctx.ownerToken}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(200);
    });

    it('cannot assign owner role via this endpoint — 403', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/roles/${ctx.member._id}`)
        .set('Authorization', `Bearer ${ctx.ownerToken}`)
        .send({ role: 'owner' });
      expect(res.status).toBe(403);
    });

    it('cannot change the current owner role — 403', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/roles/${ctx.owner._id}`)
        .set('Authorization', `Bearer ${ctx.ownerToken}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
    });

    it('admin cannot assign admin role — 403', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/roles/${ctx.member._id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid role', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/roles/${ctx.member._id}`)
        .set('Authorization', `Bearer ${ctx.ownerToken}`)
        .send({ role: 'superuser' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/orgs/:orgId/roles/transfer-ownership', () => {
    it('owner can transfer ownership to an admin', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/roles/transfer-ownership`)
        .set('Authorization', `Bearer ${ctx.ownerToken}`)
        .send({ newOwnerId: ctx.admin._id });
      expect(res.status).toBe(200);
    });

    it('admin cannot transfer ownership — 403', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/roles/transfer-ownership`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ newOwnerId: ctx.member._id });
      expect(res.status).toBe(403);
    });
  });
});

// Reports

describe('Reports - Integration Tests', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setupOrgWithUsers();
    await createTask(ctx.org, ctx.owner, { status: 'todo',        priority: 'high',   assignee: ctx.member._id });
    await createTask(ctx.org, ctx.owner, { status: 'done',        priority: 'low',    assignee: ctx.member._id });
    await createTask(ctx.org, ctx.owner, { status: 'in_progress', priority: 'urgent', assignee: ctx.admin._id  });
  });

  describe('GET /api/orgs/:orgId/reports/overview', () => {
    it('admin gets overview data', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/reports/overview`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalTasks).toBe(3);
      expect(Array.isArray(res.body.data.statusBreakdown)).toBe(true);
      expect(Array.isArray(res.body.data.priorityBreakdown)).toBe(true);
    });

    it('member cannot access reports — 403', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/reports/overview`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/orgs/:orgId/reports/by-member', () => {
    it('returns per-member task breakdown', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/reports/by-member`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/orgs/:orgId/reports/timeline', () => {
    it('returns completion timeline array', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/reports/timeline`)
        .set('Authorization', `Bearer ${ctx.ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

// Notifications

describe('Notifications - Integration Tests', () => {
  let ctx;
  beforeEach(async () => { ctx = await setupOrgWithUsers(); });

  describe('GET /api/orgs/:orgId/notifications', () => {
    it('member can get their notifications (empty initially)', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/notifications`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.unreadCount).toBeDefined();
    });

    it('viewer can access notifications', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/notifications`)
        .set('Authorization', `Bearer ${ctx.viewerToken}`);
      expect(res.status).toBe(200);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get(`/api/orgs/${ctx.org._id}/notifications`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/orgs/:orgId/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}/notifications/read-all`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(200);
    });
  });
});

// Audit Logs

describe('Audit Logs - Integration Tests', () => {
  let ctx;
  beforeEach(async () => { ctx = await setupOrgWithUsers(); });

  describe('GET /api/orgs/:orgId/audit', () => {
    it('admin can list audit logs (empty initially)', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/audit`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('member cannot access audit logs — 403', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/audit`)
        .set('Authorization', `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(403);
    });

    it('viewer cannot access audit logs — 403', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/audit`)
        .set('Authorization', `Bearer ${ctx.viewerToken}`);
      expect(res.status).toBe(403);
    });

    it('supports filtering by action', async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/audit?action=task.created`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/orgs/:orgId/audit/:logId', () => {
    it('returns 404 for non-existent audit log', async () => {
      const fakeId = '64a1234567890abcde123456';
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/audit/${fakeId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});