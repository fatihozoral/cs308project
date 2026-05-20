# System Architecture - CS 308 Authentication Module

**Visual guide to the authentication system architecture**

---

## 🏗️ High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   React Frontend                         │   │
│  │                  (Port 5173)                             │   │
│  │                                                           │   │
│  │  • LoginPage / RegisterPage                              │   │
│  │  • AuthContext (Global State via Supabase)               │   │
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
│  │              FastAPI Backend                             │   │
│  │                (Port 8000)                               │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────┐    │   │
│  │  │          API Endpoints                         │    │   │
│  │  │  • POST /api/auth/register                     │    │   │
│  │  │  • POST /api/auth/login                        │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  │                   │                                      │   │
│  │  ┌────────────────▼───────────────────────────────┐    │   │
│  │  │          Middleware/Dependencies Layer         │    │   │
│  │  │  • CORS Middleware                              │    │   │
│  │  │  • Request Validation (Pydantic)               │    │   │
│  │  │  • Auth Dependencies (Supabase Session check)  │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  │                   │                                      │   │
│  │  ┌────────────────▼───────────────────────────────┐    │   │
│  │  │          Controllers (Routers)                 │    │   │
│  │  │  • auth.py (register/login logic)              │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  │                   │                                      │   │
│  │  ┌────────────────▼───────────────────────────────┐    │   │
│  │  │          Services                              │    │   │
│  │  │  • supabase_service.py                         │    │   │
│  │  └────────────────┬───────────────────────────────┘    │   │
│  └───────────────────┼──────────────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     │ REST API
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    DATABASE & AUTH LAYER                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Supabase (PostgreSQL + Auth)             │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  auth.users table                             │   │   │
│  │  │  • Handles authentication, sessions           │   │   │
│  │  │  • Password hashing & security                │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                        │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  public.profiles (metadata)                   │   │   │
│  │  │  • id (UUID, PK, FK -> auth.users)            │   │   │
│  │  │  • name, role, address                        │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow Diagrams

### Registration Flow

```text
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
                                              │.ts      │
                                              └────┬────┘
                                                   │
                                                   │ 3. POST /api/auth/register
                                                   │    {name, email, password, ...}
                                                   │
                                              ┌────▼────────┐
                                              │   FastAPI   │
                                              │   Backend   │
                                              └────┬────────┘
                                                   │
                                                   │ 4. Server-side
                                                   │    validation
                                                   │
                                              ┌────▼────────┐
                                              │ Pydantic    │
                                              │ Schemas     │
                                              └────┬────────┘
                                                   │
                                                   │ 5. Call Supabase Auth
                                                   │
                                              ┌────▼────────┐
                                              │ Supabase    │
                                              │ sign_up()   │
                                              └────┬────────┘
                                                   │
                                                   │ Success?
                                         ┌─────────┴─────────┐
                                         │                   │
                                    Yes  │                   │ No
                                         ▼                   ▼
                                  ┌──────────┐        ┌──────────┐
                                  │ Save     │        │ Return   │
                                  │ User Data│        │ Error    │
                                  │          │        │ (409/400)│
                                  └────┬─────┘        └──────────┘
                                       │
                                       │ 6. Return 201
                                       │    with user data
                                       │
                                  ┌────▼────────┐
                                  │   React     │
                                  │   Success   │
                                  │   Message   │
                                  └─────────────┘
```

### Login Flow

```text
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
                                              │   FastAPI   │
                                              │   Backend   │
                                              └────┬────────┘
                                                   │
                                                   │ 4. Call Supabase Auth
                                                   │
                                              ┌────▼────────┐
                                              │ Supabase    │
                                              │ sign_in()   │
                                              └────┬────────┘
                                                   │
                                                   │ Success?
                                         ┌─────────┴─────────┐
                                         │                   │
                                    No   │                   │ Yes
                                         ▼                   ▼
                                  ┌──────────┐        ┌──────────┐
                                  │ Return   │        │ Return   │
                                  │ 401      │        │ Session  │
                                  │ Error    │        │ Token    │
                                  └──────────┘        └────┬─────┘
                                                           │
                                                           │ 5. Store session
                                                           │
                                                      ┌────▼────────┐
                                                      │ AuthContext │
                                                      │ .login()    │
                                                      └────┬────────┘
                                                           │
                                                           │ 6. Redirect by role
                                                           │
                                                      ┌────▼────────┐
                                                      │ Navigate to │
                                                      │ home page   │
                                                      └─────────────┘
```

---

## 🗂️ Component Hierarchy

### Frontend Component Tree

```text
App.tsx (Router + AuthProvider)
│
├─ AuthProvider (Context)
│  │
│  ├─ PublicRoute
│  │  │
│  │  ├─ LoginPage
│  │  │  └─ LoginForm
│  │  │
│  │  └─ RegisterPage
│  │     └─ RegisterForm
│  │
│  └─ ProtectedRoute
│     │
│     ├─ HomePage
│     │  └─ Customer Content
│     │
│     ├─ AdminSalesPage
│     │  └─ Sales Manager Content
│     │
│     └─ AdminProductsPage
│        └─ Product Manager Content
```

### Backend Module Structure

```text
main.py (FastAPI Application)
│
├─ Middleware Stack
│  └─ CORS Middleware
│
├─ Routers (app/api/)
│  │
│  └─ auth.py
│     │
│     ├─ POST /register
│     └─ POST /login
│
├─ Core (app/core/)
│  └─ security.py (Dependencies)
│
└─ Services (app/services/)
   └─ supabase_service.py
```

---

## 🔐 Security Layers

```text
┌─────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Client-Side Validation                            │
│  • Input format validation                                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 2: Server-Side Validation                            │
│  • Pydantic Schemas                                         │
│  • Never trust client input                                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 3: Authentication                                     │
│  • Supabase Auth Sessions                                   │
│  • Secure token handling                                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 4: Password Security                                  │
│  • Hashing managed by Supabase securely                     │
│  • No plaintext storage anywhere                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 5: Database Security                                  │
│  • Supabase Row Level Security (RLS)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
