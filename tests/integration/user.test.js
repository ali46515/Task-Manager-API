import request from "supertest";
import app from "../../app.js";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  setupOrgWithUsers,
} from "../helpers/testUtils.js";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe("Users - Integration Tests", () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setupOrgWithUsers();
  });

  describe("GET /api/users/me", () => {
    it("returns current user profile", async () => {
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(ctx.member.email);
    });

    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/users/me");
      expect(res.status).toBe(401);
    });

    it("populates memberships with org data", async () => {
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${ctx.ownerToken}`);
      expect(res.body.data.memberships[0].organization).toHaveProperty("name");
    });
  });

  describe("PATCH /api/users/me", () => {
    it("updates name successfully", async () => {
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${ctx.memberToken}`)
        .send({ name: "Updated Name" });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Name");
    });

    it("updates avatar successfully", async () => {
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${ctx.memberToken}`)
        .send({ avatar: "https://example.com/avatar.png" });
      expect(res.status).toBe(200);
      expect(res.body.data.avatar).toBe("https://example.com/avatar.png");
    });

    it("returns 400 if trying to update password via this route", async () => {
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${ctx.memberToken}`)
        .send({ password: "newpassword123" });
      expect(res.status).toBe(400);
    });

    it("returns 401 without token", async () => {
      const res = await request(app)
        .patch("/api/users/me")
        .send({ name: "Hacker" });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/users/me", () => {
    it("soft-deletes the account (204)", async () => {
      const res = await request(app)
        .delete("/api/users/me")
        .set("Authorization", `Bearer ${ctx.memberToken}`);
      expect(res.status).toBe(204);
    });

    it("deactivated user cannot log in", async () => {
      await request(app)
        .delete("/api/users/me")
        .set("Authorization", `Bearer ${ctx.memberToken}`);

      const loginRes = await request(app).post("/api/auth/login").send({
        email: ctx.member.email,
        password: "password123",
      });
      expect(loginRes.status).toBe(401);
    });
  });
});
