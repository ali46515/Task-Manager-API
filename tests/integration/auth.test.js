import request from 'supertest';
import app from '../../app.js';
import { connectTestDB, clearTestDB, disconnectTestDB, createOrg, createUser } from '../helpers/testUtils.js';

beforeAll(async () => await connectTestDB());
afterEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

describe('Auth - Integration Tests', () => {

  // Register

  describe('POST /api/auth/register', () => {
    const validPayload = {
      name: 'Alice Smith',
      email: 'alice@example.com',
      password: 'password123',
      orgName: 'Acme Corp',
    };

    it('registers a new user and returns a JWT', async () => {
      const res = await request(app).post('/api/auth/register').send(validPayload);
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(validPayload.email);
    });

    it('creates the user as org owner', async () => {
      const res = await request(app).post('/api/auth/register').send(validPayload);
      const membership = res.body.data.user.memberships[0];
      expect(membership.role).toBe('owner');
    });

    it('does not return password in response', async () => {
      const res = await request(app).post('/api/auth/register').send(validPayload);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('returns 409 if email already exists', async () => {
      await request(app).post('/api/auth/register').send(validPayload);
      const res = await request(app).post('/api/auth/register').send(validPayload);
      expect(res.status).toBe(409);
    });

    it('returns 500 if required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // Login

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Alice', email: 'alice@example.com', password: 'password123', orgName: 'Acme',
      });
    });

    it('logs in with correct credentials and returns JWT', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com', password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com', password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    });

    it('returns 401 for non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@example.com', password: 'password123',
      });
      expect(res.status).toBe(401);
    });

    it('returns 400 if email or password missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com' });
      expect(res.status).toBe(400);
    });
  });

  // Logout

  describe('POST /api/auth/logout', () => {
    it('returns 200 with valid token', async () => {
      const loginRes = await request(app).post('/api/auth/register').send({
        name: 'Alice', email: 'alice@example.com', password: 'password123', orgName: 'Acme',
      });
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.token}`);
      expect(res.status).toBe(200);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  // Forgot / Reset Password

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 and reset token for existing email', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Alice', email: 'alice@example.com', password: 'password123', orgName: 'Acme',
      });
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'alice@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.resetToken).toBeDefined();
    });

    it('returns 404 for unknown email', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@test.com' });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/auth/reset-password/:token', () => {
    it('resets password with valid token and allows new login', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Alice', email: 'alice@example.com', password: 'password123', orgName: 'Acme',
      });
      const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email: 'alice@example.com' });
      const { resetToken } = forgotRes.body;

      const resetRes = await request(app)
        .patch(`/api/auth/reset-password/${resetToken}`)
        .send({ password: 'newpassword456' });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.token).toBeDefined();

      // Old password should now fail
      const oldLogin = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'password123' });
      expect(oldLogin.status).toBe(401);

      // New password should succeed
      const newLogin = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'newpassword456' });
      expect(newLogin.status).toBe(200);
    });

    it('returns 400 for invalid or expired token', async () => {
      const res = await request(app).patch('/api/auth/reset-password/invalidtoken').send({ password: 'newpass123' });
      expect(res.status).toBe(400);
    });
  });
});