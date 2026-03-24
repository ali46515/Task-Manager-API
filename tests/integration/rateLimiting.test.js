import request from "supertest";
import app from "../../app.js";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
} from "../helpers/testUtils.js";

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe("Rate Limiting - Integration Tests", () => {
  it("returns 429 after exceeding auth rate limit", async () => {
    const payload = {
      email: `ratelimit-${Date.now()}@test.com`,
      password: "wrongpassword",
    };
    let lastStatus;

    // Fire 25 requests (should trip the 20/15min auth limiter)
    for (let i = 0; i < 25; i++) {
      const res = await request(app).post("/api/auth/login").send(payload);
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  }, 20000);

  it("rate limit response has a message field", async () => {
    const payload = {
      email: `ratelimit2-${Date.now()}@test.com`,
      password: "wrong",
    };
    let rateLimitRes;

    for (let i = 0; i < 25; i++) {
      rateLimitRes = await request(app).post("/api/auth/login").send(payload);
      if (rateLimitRes.status === 429) break;
    }

    expect(rateLimitRes.status).toBe(429);
    expect(rateLimitRes.body.message).toBeDefined();
  }, 20000);
});
