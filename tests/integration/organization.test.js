import request from "supertest";
import app from "../../app.js";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  setupOrgWithUsers,
  createUser,
} from "../helpers/testUtils.js";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe("Organizations - Integration Tests", () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setupOrgWithUsers();
  });

  // Get Org

  describe("GET /api/orgs/:orgId", () => {
    it("viewer can get org details", async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}`)
        .set("Authorization", `Bearer ${ctx.viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(ctx.org.name);
    });

    it("returns 401 without token", async () => {
      const res = await request(app).get(`/api/orgs/${ctx.org._id}`);
      expect(res.status).toBe(401);
    });
  });

  // Update Org

  describe("PATCH /api/orgs/:orgId", () => {
    it("admin can update org name", async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}`)
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ name: "Updated Org Name" });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Org Name");
    });

    it("member cannot update org — 403", async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}`)
        .set("Authorization", `Bearer ${ctx.memberToken}`)
        .send({ name: "Hacked Name" });
      expect(res.status).toBe(403);
    });

    it("viewer cannot update org — 403", async () => {
      const res = await request(app)
        .patch(`/api/orgs/${ctx.org._id}`)
        .set("Authorization", `Bearer ${ctx.viewerToken}`)
        .send({ name: "Hacked Name" });
      expect(res.status).toBe(403);
    });
  });

  // Delete Org

  describe("DELETE /api/orgs/:orgId", () => {
    it("owner can delete org", async () => {
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}`)
        .set("Authorization", `Bearer ${ctx.ownerToken}`);
      expect(res.status).toBe(204);
    });

    it("admin cannot delete org — 403", async () => {
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}`)
        .set("Authorization", `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(403);
    });
  });

  // Get Members

  describe("GET /api/orgs/:orgId/members", () => {
    it("returns all org members", async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/members`)
        .set("Authorization", `Bearer ${ctx.viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it("each member has role field", async () => {
      const res = await request(app)
        .get(`/api/orgs/${ctx.org._id}/members`)
        .set("Authorization", `Bearer ${ctx.memberToken}`);
      res.body.data.forEach((m) => expect(m.role).toBeDefined());
    });
  });

  // Invite Member

  describe("POST /api/orgs/:orgId/members/invite", () => {
    let outsider;

    beforeEach(async () => {      
      const { createOrg, createUser: cu } =
        await import("../helpers/testUtils.js");
      const otherOrg = await createOrg({
        name: "Other Org",
        slug: `other-${Date.now()}`,
      });
      outsider = await cu(otherOrg, "member", {
        email: `outsider-${Date.now()}@test.com`,
      });
    });

    it("admin can invite an existing user", async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/members/invite`)
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ email: outsider.email, role: "member" });
      expect(res.status).toBe(200);
    });

    it("member cannot invite — 403", async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/members/invite`)
        .set("Authorization", `Bearer ${ctx.memberToken}`)
        .send({ email: outsider.email, role: "member" });
      expect(res.status).toBe(403);
    });

    it("returns 404 for unknown email", async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/members/invite`)
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ email: "ghost@example.com", role: "member" });
      expect(res.status).toBe(404);
    });

    it("returns 409 if user is already a member", async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/members/invite`)
        .set("Authorization", `Bearer ${ctx.adminToken}`)
        .send({ email: ctx.member.email, role: "member" });
      expect(res.status).toBe(409);
    });

    it("cannot invite someone as owner — 400", async () => {
      const res = await request(app)
        .post(`/api/orgs/${ctx.org._id}/members/invite`)
        .set("Authorization", `Bearer ${ctx.ownerToken}`)
        .send({ email: outsider.email, role: "owner" });
      expect(res.status).toBe(400);
    });
  });

  // Remove Member

  describe("DELETE /api/orgs/:orgId/members/:userId", () => {
    it("admin can remove a member", async () => {
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}/members/${ctx.member._id}`)
        .set("Authorization", `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it("member cannot remove another member — 403", async () => {
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}/members/${ctx.viewer._id}`)
        .set("Authorization", `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(403);
    });

    it("cannot remove the org owner — 403", async () => {
      const res = await request(app)
        .delete(`/api/orgs/${ctx.org._id}/members/${ctx.owner._id}`)
        .set("Authorization", `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(403);
    });
  });
});
