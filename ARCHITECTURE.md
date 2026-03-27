# System Architecture - CS 308 Authentication Module

**Visual guide to the authentication system architecture**

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   React Frontend                         │   │
│  │                  (Port 3000)                             │   │
│  │                                                           │   │
│  │  • LoginPage / RegisterPage                              │   │
│  │  • AuthContext (Global State)                            │   │
│  │  • Protected Routes                                       │   │
│  │  • Client-side Validation                                │   │
│  └──────────────────┬──────────────────────────────────────┘   │
└─────────────────────┼──────────────────────────────────────────┘
                      │
                      │ HTTP/HTTPS
                      │ Axios Requests
                      │
┌─────────────────────┼──────────────────────────────────────────┐
│                     │         SERVER LAYER                       │
│  ┌──────────────────▼──────────────────────────────────────┐   │
│  │              Express.js Backend                          │   │
│  │                (Port 5000)                               │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────┐    │   │
│  │  │          API Endpoints                         │    │   │
│  │  │  • POST /api/auth/register                     │    │   │
│  │  │  • POST /api/auth/login                        │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  │                   │                                      │   │
│  │  ┌────────────────▼───────────────────────────────┐    │   │
│  │  │          Middleware Layer                      │    │   │
│  │  │  • CORS                                         │    │   │
│  │  │  • Body Parser                                  │    │   │
│  │  │  • Request Validation (express-validator)      │    │   │
│  │  │  • Auth Middleware (JWT verification)          │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  │                   │                                      │   │
│  │  ┌────────────────▼───────────────────────────────┐    │   │
│  │  │          Controllers                           │    │   │
│  │  │  • authController.register()                   │    │   │
│  │  │  • authController.login()                      │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  │                   │                                      │   │
│  │  ┌────────────────▼───────────────────────────────┐    │   │
│  │  │          Utilities                             │    │   │
│  │  │  • hashPassword() - bcrypt                     │    │   │
│  │  │  • comparePassword() - bcrypt                  │    │   │
│  │  │  • jwt.sign() - token generation               │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  └───────────────────┼──────────────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     │ SQL Queries
                     │ (Parameterized)
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    DATABASE LAYER                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                      │   │
│  │                (Port 5432)                            │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  users table                                  │   │   │
│  │  │  • id (UUID, PK)                              │   │   │
│  │  │  • name, email, password_hash                 │   │   │
│  │  │  • tax_id, home_address                       │   │   │
│  │  │  • role (customer/sales_manager/...)          │   │   │
│  │  │  • is_active, created_at, updated_at          │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  refresh_tokens table (optional)              │   │   │
│  │  │  • id (UUID, PK)                              │   │   │
│  │  │  • user_id (FK → users.id)                    │   │   │
│  │  │  • token_hash, expires_at                     │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow Diagrams

### Registration Flow

```
┌─────────┐                                  ┌─────────┐
│         │  1. Fill registration form       │         │
│  User   ├─────────────────────────────────►│ React   │
│         │                                   │ Frontend│
└─────────┘                                   └────┬────┘
                                                   │
                                                   │ 2. Client-side
                                                   │    validation
                                                   │
                                              ┌────▼────┐
                                              │validators│
                                              │.js      │
                                              └────┬────┘
                                                   │
                                                   │ 3. POST /api/auth/register
                                                   │    {name, email, password, ...}
                                                   │
                                              ┌────▼────────┐
                                              │   Express   │
                                              │   Backend   │
                                              └────┬────────┘
                                                   │
                                                   │ 4. Server-side
                                                   │    validation
                                                   │
                                              ┌────▼────────┐
                                              │ express-    │
                                              │ validator   │
                                              └────┬────────┘
                                                   │
                                                   │ 5. Check email
                                                   │    uniqueness
                                                   │
                                              ┌────▼────────┐
                                              │ PostgreSQL  │
                                              │ SELECT      │
                                              └────┬────────┘
                                                   │
                                                   │ Email exists?
                                         ┌─────────┴─────────┐
                                         │                   │
                                    Yes  │                   │ No
                                         ▼                   ▼
                                  ┌──────────┐        ┌──────────┐
                                  │ Return   │        │ Hash     │
                                  │ 409      │        │ password │
                                  │ Conflict │        │ (bcrypt) │
                                  └──────────┘        └────┬─────┘
                                                           │
                                                           │ 6. Insert user
                                                           │
                                                      ┌────▼────────┐
                                                      │ PostgreSQL  │
                                                      │ INSERT INTO │
                                                      │ users       │
                                                      └────┬────────┘
                                                           │
                                                           │ 7. Return 201
                                                           │    with user data
                                                           │
                                                      ┌────▼────────┐
                                                      │   React     │
                                                      │   Success   │
                                                      │   Message   │
                                                      └─────────────┘
```

### Login Flow

```
┌─────────┐                                  ┌─────────┐
│         │  1. Enter credentials            │         │
│  User   ├─────────────────────────────────►│ React   │
│         │     (email, password)             │ Frontend│
└─────────┘                                   └────┬────┘
                                                   │
                                                   │ 2. Client-side
                                                   │    validation
                                                   │
                                                   │ 3. POST /api/auth/login
                                                   │    {email, password}
                                                   │
                                              ┌────▼────────┐
                                              │   Express   │
                                              │   Backend   │
                                              └────┬────────┘
                                                   │
                                                   │ 4. Find user by email
                                                   │
                                              ┌────▼────────┐
                                              │ PostgreSQL  │
                                              │ SELECT      │
                                              └────┬────────┘
                                                   │
                                                   │ User found?
                                         ┌─────────┴─────────┐
                                         │                   │
                                    No   │                   │ Yes
                                         ▼                   ▼
                                  ┌──────────┐        ┌──────────┐
                                  │ Return   │        │ Check    │
                                  │ 401      │        │ is_active│
                                  │ Error    │        └────┬─────┘
                                  └──────────┘             │
                                                           │ Active?
                                                   ┌───────┴───────┐
                                                   │               │
                                              No   │               │ Yes
                                                   ▼               ▼
                                            ┌──────────┐    ┌──────────┐
                                            │ Return   │    │ Compare  │
                                            │ 403      │    │ password │
                                            │ Disabled │    │ (bcrypt) │
                                            └──────────┘    └────┬─────┘
                                                                 │
                                                                 │ Match?
                                                       ┌─────────┴─────────┐
                                                       │                   │
                                                  No   │                   │ Yes
                                                       ▼                   ▼
                                                ┌──────────┐        ┌──────────┐
                                                │ Return   │        │ Generate │
                                                │ 401      │        │ JWT      │
                                                │ Error    │        │ Token    │
                                                └──────────┘        └────┬─────┘
                                                                         │
                                                                         │ 5. Return token
                                                                         │    and user data
                                                                         │
                                                                    ┌────▼────────┐
                                                                    │ AuthContext │
                                                                    │ .login()    │
                                                                    └────┬────────┘
                                                                         │
                                                                         │ 6. Store token
                                                                         │    in localStorage
                                                                         │
                                                                         │ 7. Redirect by role
                                                                         │
                                                                    ┌────▼────────┐
                                                                    │ Navigate to │
                                                                    │ home page   │
                                                                    └─────────────┘
```

### Protected Route Access Flow

```
┌─────────┐                                  ┌─────────┐
│         │  1. Navigate to /admin/sales     │         │
│  User   ├─────────────────────────────────►│ React   │
│         │                                   │ Router  │
└─────────┘                                   └────┬────┘
                                                   │
                                                   │ 2. Check auth
                                                   │    state
                                                   │
                                              ┌────▼────────┐
                                              │ AuthContext │
                                              │ .user       │
                                              └────┬────────┘
                                                   │
                                                   │ Authenticated?
                                         ┌─────────┴─────────┐
                                         │                   │
                                    No   │                   │ Yes
                                         ▼                   ▼
                                  ┌──────────┐        ┌──────────┐
                                  │ Redirect │        │ Make API │
                                  │ to       │        │ request  │
                                  │ /login   │        │ with     │
                                  └──────────┘        │ token    │
                                                      └────┬─────┘
                                                           │
                                                           │ 3. API request with
                                                           │    Authorization: Bearer <token>
                                                           │
                                                      ┌────▼────────┐
                                                      │ Express     │
                                                      │ authMiddle- │
                                                      │ ware        │
                                                      └────┬────────┘
                                                           │
                                                           │ 4. Verify JWT
                                                           │
                                                      ┌────▼────────┐
                                                      │ jwt.verify()│
                                                      └────┬────────┘
                                                           │
                                                           │ Valid token?
                                                   ┌───────┴───────┐
                                                   │               │
                                              No   │               │ Yes
                                                   ▼               ▼
                                            ┌──────────┐    ┌──────────┐
                                            │ Return   │    │ Add user │
                                            │ 401      │    │ to req   │
                                            │ Unauthorized   │ .user    │
                                            └──────────┘    └────┬─────┘
                                                                 │
                                                                 │ 5. Execute
                                                                 │    controller
                                                                 │
                                                            ┌────▼────────┐
                                                            │ Return data │
                                                            │ to client   │
                                                            └─────────────┘
```

---

## 📊 Data Flow Diagram

### User Registration Data Flow

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Register  │───►│  Validate  │───►│   Hash     │───►│  Store in  │
│   Form     │    │   Input    │    │  Password  │    │  Database  │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
     │                  │                  │                  │
     ▼                  ▼                  ▼                  ▼
  User Input      Client + Server      bcrypt.hash()    PostgreSQL
  {name,          Validation           (salt: 10)       INSERT
   email,         Rules                                  INTO users
   password,
   tax_id,
   address}
```

### JWT Token Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        JWT TOKEN                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HEADER                                                      │
│  {                                                           │
│    "alg": "HS256",                                          │
│    "typ": "JWT"                                             │
│  }                                                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PAYLOAD                                                     │
│  {                                                           │
│    "sub": "user-uuid-here",        ← User ID                │
│    "email": "user@example.com",    ← User email             │
│    "role": "customer",             ← User role              │
│    "iat": 1711234567,              ← Issued at              │
│    "exp": 1711320967               ← Expires (24h)          │
│  }                                                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SIGNATURE                                                   │
│  HMACSHA256(                                                │
│    base64UrlEncode(header) + "." +                         │
│    base64UrlEncode(payload),                               │
│    JWT_SECRET                      ← From .env             │
│  )                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Component Hierarchy

### Frontend Component Tree

```
App.js (Router + AuthProvider)
│
├─ AuthProvider (Context)
│  │
│  ├─ PublicRoute
│  │  │
│  │  ├─ LoginPage
│  │  │  └─ LoginForm
│  │  │     ├─ Email Input
│  │  │     ├─ Password Input
│  │  │     └─ Submit Button
│  │  │
│  │  └─ RegisterPage
│  │     └─ RegisterForm
│  │        ├─ Name Input
│  │        ├─ Email Input
│  │        ├─ Password Input
│  │        ├─ Confirm Password Input
│  │        ├─ Tax ID Input
│  │        ├─ Address Textarea
│  │        └─ Submit Button
│  │
│  └─ ProtectedRoute
│     │
│     ├─ HomePage
│     │  ├─ Header (with logout)
│     │  └─ Customer Content
│     │
│     ├─ AdminSalesPage
│     │  ├─ Header (with logout)
│     │  └─ Sales Manager Content
│     │
│     └─ AdminProductsPage
│        ├─ Header (with logout)
│        └─ Product Manager Content
```

### Backend Module Structure

```
app.js (Express Application)
│
├─ Middleware Stack
│  ├─ CORS
│  ├─ Body Parser (JSON)
│  └─ Request Logger (dev)
│
├─ Routes
│  │
│  └─ /api/auth
│     │
│     ├─ POST /register
│     │  ├─ registerValidationRules
│     │  ├─ validate
│     │  └─ authController.register
│     │
│     └─ POST /login
│        ├─ loginValidationRules
│        ├─ validate
│        └─ authController.login
│
└─ Error Handlers
   ├─ 404 Handler
   └─ Global Error Handler
```

---

## 🔄 State Management

### Auth Context State

```
AuthContext
│
├─ State
│  ├─ user: {id, name, role} | null
│  └─ loading: boolean
│
├─ Methods
│  ├─ login(token, userData)
│  │  ├─ Save to localStorage
│  │  ├─ Update state
│  │  └─ Set axios header
│  │
│  ├─ logout()
│  │  ├─ Remove from localStorage
│  │  ├─ Clear state
│  │  └─ Clear axios header
│  │
│  ├─ isAuthenticated()
│  │  └─ Check user && token exists
│  │
│  └─ getRedirectPath(role)
│     ├─ customer → /
│     ├─ sales_manager → /admin/sales
│     └─ product_manager → /admin/products
│
└─ Effects
   └─ useEffect (on mount)
      ├─ Load token from localStorage
      ├─ Load user from localStorage
      └─ Restore auth state
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Client-Side Validation                            │
│  • Input format validation                                  │
│  • Password strength check                                  │
│  • Required field check                                     │
│  • Immediate user feedback                                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 2: Server-Side Validation                            │
│  • express-validator rules                                  │
│  • Sanitization (trim, normalizeEmail)                     │
│  • Business logic validation                                │
│  • Never trust client input                                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 3: Authentication                                     │
│  • JWT token generation                                     │
│  • Token expiration (24h)                                   │
│  • Secure token storage                                     │
│  • Authorization header validation                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 4: Password Security                                  │
│  • bcrypt hashing (salt rounds: 10)                        │
│  • No plaintext storage                                     │
│  • Secure comparison (timing attack resistant)             │
│  • Strong password requirements                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 5: Database Security                                  │
│  • Parameterized queries (SQL injection prevention)        │
│  • Connection pooling                                       │
│  • Access control (user permissions)                       │
│  • Data encryption at rest (production)                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 6: Transport Security                                 │
│  • HTTPS (production)                                       │
│  • CORS configuration                                       │
│  • Secure headers                                           │
│  • Rate limiting (future)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Error Handling Flow

```
┌─────────────┐
│   Client    │
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Input Validation│────► Validation Error ────► 400 Bad Request
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Business Logic  │────► Logic Error ────────► 409 Conflict
└──────┬──────────┘      (e.g., email exists)
       │
       ▼
┌─────────────────┐
│ Authentication  │────► Auth Error ─────────► 401 Unauthorized
└──────┬──────────┘      (wrong password)
       │
       ▼
┌─────────────────┐
│ Authorization   │────► Authz Error ────────► 403 Forbidden
└──────┬──────────┘      (inactive account)
       │
       ▼
┌─────────────────┐
│ Database Query  │────► DB Error ───────────► 500 Server Error
└──────┬──────────┘      (connection failed)
       │
       ▼
┌─────────────────┐
│ Success Response│────► 200 OK / 201 Created
└─────────────────┘
```

---

This architecture document provides a comprehensive visual understanding of how all components work together in the CS 308 authentication system.
