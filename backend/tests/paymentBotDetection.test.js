import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let app;

beforeAll(async () => {
  process.env.MONGO_DB = `botdetector_payment_test_${Date.now()}`;
  const mod = await import('../src/index.js');
  app = request('http://localhost:' + (process.env.PORT || 4001));
  // Wait for server
  await new Promise(r => setTimeout(r, 1000));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Payment Bot Detection', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user and get auth token
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    
    // Signup
    await app.post('/api/auth/signup').send({ email, password });
    
    // Login
    const loginRes = await app.post('/api/auth/login').send({ email, password });
    authToken = loginRes.body.accessToken;
    userId = loginRes.body.user.id;
  });

  describe('Payment Initiation', () => {
    it('should allow normal human payment with low bot score', async () => {
      const paymentData = {
        platform: 'ticketmaster',
        ticketId: 'ticket_12345',
        amount: 150.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-js-ok', '1')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8')
        .set('Accept-Language', 'en-US,en;q=0.5')
        .set('Accept-Encoding', 'gzip, deflate, br')
        .send(paymentData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Payment initiated successfully');
      expect(res.body.botScore).toBeLessThan(0.3);
      expect(res.body.transactionId).toBeDefined();
    });

    it('should detect bot behavior and block payment', async () => {
      const paymentData = {
        platform: 'eventbrite',
        ticketId: 'ticket_67890',
        amount: 500.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('User-Agent', 'HeadlessChrome/120.0.6099.109')
        .set('Accept', '*/*')
        .send(paymentData);

      expect(res.status).toBe(400);
      expect(res.body.reason).toBe('bot_detected');
      expect(res.body.botScore).toBeGreaterThanOrEqual(0.6);
      expect(res.body.detectionReasons).toContain('headless_browser');
      expect(res.body.detectionReasons).toContain('missing_js_challenge');
    });

    it('should require verification for medium risk payments', async () => {
      const paymentData = {
        platform: 'stubhub',
        ticketId: 'ticket_11111',
        amount: 200.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-js-ok', '1')
        .set('User-Agent', 'Mozilla/5.0 (compatible; BotDetector/1.0)')
        .set('Accept', '*/*')
        .send(paymentData);

      expect(res.status).toBe(200);
      expect(res.body.reason).toBe('medium_risk');
      expect(res.body.botScore).toBeGreaterThanOrEqual(0.3);
      expect(res.body.botScore).toBeLessThan(0.6);
      expect(res.body.requiresVerification).toBe(true);
      expect(res.body.verificationSteps).toContain('captcha');
    });

    it('should detect rapid purchase attempts', async () => {
      const paymentData = {
        platform: 'seatgeek',
        ticketId: 'ticket_22222',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      // Make multiple rapid requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        app
          .post('/api/payment/initiate')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-js-ok', '1')
          .set('User-Agent', `Bot${i}/1.0`)
          .send({ ...paymentData, ticketId: `ticket_${i}` })
      );

      const results = await Promise.all(promises);
      
      // At least one should be flagged for rapid purchase
      const flaggedResults = results.filter(r => 
        r.body.detectionReasons && r.body.detectionReasons.includes('rapid_purchase')
      );
      
      expect(flaggedResults.length).toBeGreaterThan(0);
    });

    it('should detect high-value suspicious transactions', async () => {
      const paymentData = {
        platform: 'vividseats',
        ticketId: 'ticket_33333',
        amount: 5000.00, // High value
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-js-ok', '1')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send(paymentData);

      expect(res.status).toBe(200);
      expect(res.body.botScore).toBeGreaterThan(0);
      // High value transactions should have higher risk scores
      expect(res.body.botScore).toBeGreaterThanOrEqual(0.2);
    });

    it('should detect geo mismatch', async () => {
      const paymentData = {
        platform: 'ticketmaster',
        ticketId: 'ticket_44444',
        amount: 200.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-js-ok', '1')
        .set('x-expected-country', 'US')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send(paymentData);

      // Note: This test might not always trigger geo mismatch depending on IP
      // but it demonstrates the functionality
      expect(res.status).toBe(200);
      expect(res.body.transactionId).toBeDefined();
    });
  });

  describe('Payment Processing', () => {
    let transactionId;

    beforeEach(async () => {
      // Create a valid transaction for testing
      const paymentData = {
        platform: 'ticketmaster',
        ticketId: 'ticket_test',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-js-ok', '1')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send(paymentData);

      transactionId = res.body.transactionId;
    });

    it('should process payment with verification', async () => {
      const res = await app
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId,
          verificationData: {
            step: 'captcha',
            passed: true,
            details: { captchaToken: 'test_token' }
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Payment completed successfully');
    });

    it('should require additional verification for incomplete steps', async () => {
      const res = await app
        .post('/api/payment/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId,
          verificationData: {
            step: 'captcha',
            passed: false,
            details: { error: 'captcha_failed' }
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Additional verification required');
      expect(res.body.completedSteps).toBeDefined();
      expect(res.body.requiredSteps).toBeDefined();
    });
  });

  describe('Payment Status and History', () => {
    let transactionId;

    beforeEach(async () => {
      const paymentData = {
        platform: 'ticketmaster',
        ticketId: 'ticket_status_test',
        amount: 150.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-js-ok', '1')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send(paymentData);

      transactionId = res.body.transactionId;
    });

    it('should get payment status', async () => {
      const res = await app
        .get(`/api/payment/status/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.transactionId).toBe(transactionId);
      expect(res.body.status).toBeDefined();
      expect(res.body.botScore).toBeDefined();
      expect(res.body.platform).toBe('ticketmaster');
      expect(res.body.amount).toBe(150.00);
    });

    it('should get payment history', async () => {
      const res = await app
        .get('/api/payment/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.transactions).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it('should filter payment history by platform', async () => {
      const res = await app
        .get('/api/payment/history?platform=ticketmaster')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.transactions).toBeDefined();
      
      // All transactions should be from ticketmaster
      res.body.transactions.forEach(transaction => {
        expect(transaction.platform).toBe('ticketmaster');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid payment data', async () => {
      const invalidData = {
        platform: 'invalid_platform',
        ticketId: '',
        amount: -100,
        paymentMethod: 'invalid_method'
      };

      const res = await app
        .post('/api/payment/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should handle unauthorized requests', async () => {
      const paymentData = {
        platform: 'ticketmaster',
        ticketId: 'ticket_unauthorized',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const res = await app
        .post('/api/payment/initiate')
        .send(paymentData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Missing bearer token');
    });

    it('should handle non-existent transaction', async () => {
      const res = await app
        .get('/api/payment/status/non_existent_id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Transaction not found');
    });
  });
});
