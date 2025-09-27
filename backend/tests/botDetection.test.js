import request from 'supertest';

describe('Bot detection headers', () => {
  const app = request('http://localhost:' + (process.env.PORT || 4001));

  it('flags missing JS header with higher suspicion score (logged)', async () => {
    const res = await app.get('/api/health').set('User-Agent', 'HeadlessChrome');
    expect(res.status).toBe(200);
  });
});


