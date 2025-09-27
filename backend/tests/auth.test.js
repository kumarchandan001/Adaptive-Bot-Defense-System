import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let app;

beforeAll(async () => {
  process.env.MONGO_DB = `botdetector_test_${Date.now()}`;
  const mod = await import('../src/index.js');
  app = request('http://localhost:' + (process.env.PORT || 4001));
  // crude wait for server
  await new Promise(r => setTimeout(r, 500));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth flow', () => {
  it('signs up and logs in', async () => {
    const email = `u${Date.now()}@ex.com`;
    const password = 'Password123!';
    const s = await app.post('/api/auth/signup').send({ email, password });
    expect(s.status).toBe(201);
    const l = await app.post('/api/auth/login').send({ email, password });
    expect(l.status).toBe(200);
    expect(l.body.accessToken).toBeDefined();
    expect(l.body.refreshToken).toBeDefined();
  });
});


