/**
 * Authentication Tests
 * CS 308 Online Ticketing Project
 *
 * Tests for all 8 Acceptance Criteria from PRD
 */

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const bcrypt = require('bcrypt');

// Test database setup and teardown
beforeAll(async () => {
  // Ensure test database is set up
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Clean up test data
  await pool.query("DELETE FROM users WHERE email LIKE '%test%'");
  await pool.end();
});

describe('Authentication Module Tests', () => {
  // AC-01: Geçerli bilgilerle kayıt olunca 201 dönmeli
  describe('AC-01: Registration with valid credentials returns 201', () => {
    test('should register a new user successfully', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test.user@example.com',
        password: 'TestPass123!',
        tax_id: '12345678901',
        home_address: 'Test Address, Istanbul'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Kayıt başarılı.');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('name', newUser.name);
      expect(response.body.user).toHaveProperty('email', newUser.email);
      expect(response.body.user).toHaveProperty('role', 'customer');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });
  });

  // AC-02: Var olan e-postayla kayıt 409 dönmeli
  describe('AC-02: Registration with existing email returns 409', () => {
    test('should return 409 when email already exists', async () => {
      const existingUser = {
        name: 'Existing User',
        email: 'existing.user@example.com',
        password: 'Password123!',
        tax_id: '98765432109',
        home_address: 'Existing Address'
      };

      // Register first time
      await request(app)
        .post('/api/auth/register')
        .send(existingUser)
        .expect(201);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...existingUser,
          name: 'Another Name'
        })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Bu e-posta adresi kullanılıyor.');
    });
  });

  // AC-03: Doğru kimlikle giriş yapınca JWT token dönmeli
  describe('AC-03: Login with correct credentials returns JWT token', () => {
    test('should login successfully and return JWT token', async () => {
      const userCreds = {
        name: 'Login Test User',
        email: 'login.test@example.com',
        password: 'LoginPass123!',
        tax_id: '11111111111',
        home_address: 'Login Test Address'
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userCreds)
        .expect(201);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userCreds.email,
          password: userCreds.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeTruthy();
      expect(typeof response.body.token).toBe('string');

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('name', userCreds.name);
      expect(response.body.user).toHaveProperty('role', 'customer');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });
  });

  // AC-04: Yanlış şifreyle giriş 401 dönmeli
  describe('AC-04: Login with wrong password returns 401', () => {
    test('should return 401 for incorrect password', async () => {
      const userCreds = {
        name: 'Wrong Password User',
        email: 'wrong.password@example.com',
        password: 'CorrectPass123!',
        tax_id: '22222222222',
        home_address: 'Wrong Password Address'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userCreds)
        .expect(201);

      // Try to login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userCreds.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'E-posta veya şifre hatalı.');
    });

    test('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'E-posta veya şifre hatalı.');
    });
  });

  // AC-05: Login sonrası customer `/`'e, manager `/admin`'e gitmeli
  // This is a frontend test, but we verify role is returned correctly
  describe('AC-05: Role-based redirect information is available', () => {
    test('should return customer role for regular users', async () => {
      const customerCreds = {
        name: 'Customer Role Test',
        email: 'customer.role@example.com',
        password: 'CustomerPass123!',
        tax_id: '33333333333',
        home_address: 'Customer Address'
      };

      await request(app)
        .post('/api/auth/register')
        .send(customerCreds)
        .expect(201);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: customerCreds.email,
          password: customerCreds.password
        })
        .expect(200);

      expect(response.body.user.role).toBe('customer');
    });
  });

  // AC-06: Boş form submit edilince frontend hataları göstermeli
  // Backend validation tests
  describe('AC-06: Empty form submission returns validation errors', () => {
    test('should return 400 for missing email on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          password: 'Pass123!',
          tax_id: '12345678901',
          home_address: 'Address'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Email');
    });

    test('should return 400 for missing password on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'weak.password@example.com',
          password: 'weak',
          tax_id: '12345678901',
          home_address: 'Address'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('8 karakter');
    });
  });

  // AC-07: Şifre DB'de hash olarak saklanmalı, düz metin bulunmamalı
  describe('AC-07: Password is hashed in database', () => {
    test('should store password as bcrypt hash, not plaintext', async () => {
      const userCreds = {
        name: 'Hash Test User',
        email: 'hash.test@example.com',
        password: 'HashTest123!',
        tax_id: '44444444444',
        home_address: 'Hash Test Address'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userCreds)
        .expect(201);

      // Query database directly
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [userCreds.email]
      );

      expect(result.rows.length).toBe(1);
      const passwordHash = result.rows[0].password_hash;

      // Verify it's a bcrypt hash (starts with $2b$ and has proper length)
      expect(passwordHash).toMatch(/^\$2b\$/);
      expect(passwordHash).not.toBe(userCreds.password);
      expect(passwordHash.length).toBeGreaterThan(50);

      // Verify bcrypt can validate it
      const isValid = await bcrypt.compare(userCreds.password, passwordHash);
      expect(isValid).toBe(true);
    });
  });

  // AC-08: Token olmadan korumalı route'a gidince 401 dönmeli
  describe('AC-08: Protected routes return 401 without token', () => {
    const { authMiddleware } = require('../src/middleware/authMiddleware');
    const express = require('express');

    test('should return 401 when no token provided', () => {
      const req = {
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token bulunamadı.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when invalid token provided', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid_token_here'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token geçersiz veya süresi dolmuş.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
