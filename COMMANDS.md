# Quick Reference - Common Commands

**CS 308 Online Ticketing Platform**

---

## 🚀 Getting Started

```bash
# Clone and setup
cd cs308-project

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase credentials
uvicorn main:app --reload

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🔧 Backend Commands

### Development
```bash
# Start development server
uvicorn main:app --reload

# Start production server
uvicorn main:app --host 0.0.0.0 --port 8000

# Run tests
pytest

# Run tests with coverage
pytest --cov=app
```

### Database
```bash
# Supabase handles migrations automatically, but if you have custom scripts:
# Connect to your local or remote Supabase DB using its connection string
```

### Debugging
```bash
# Check if server is running
curl http://localhost:8000/

# Test registration endpoint
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test1234!","tax_id":"12345678901","home_address":"Test Address"}'

# Test login endpoint
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

---

## 🎨 Frontend Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Debugging
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 🗄️ Database Commands

### Supabase
Supabase provides a powerful web dashboard for database management. You can access it by logging into your Supabase account.

If you connect directly via `psql`:
```bash
# Connect to PostgreSQL (Use connection string from Supabase)
psql "postgresql://postgres.[YOUR-PROJECT-ID]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# List all tables
\dt

# Describe users table (handled by auth.users in Supabase)
\d auth.users

# Exit PostgreSQL
\q
```

---

## 🧪 Testing Commands

### Run Specific Tests
```bash
# Run specific test file
pytest tests/test_auth.py

# Run tests matching pattern
pytest -k "register"

# Run tests with verbose output
pytest -v
```

---

## 🔍 Debugging Commands

### Check Port Usage
```bash
# Check what's running on port 8000
lsof -ti:8000

# Kill process on port 8000
kill -9 $(lsof -ti:8000)

# Check what's running on port 5173
lsof -ti:5173
```

---

## 🧹 Cleanup Commands

### Clear Dependencies
```bash
# Backend
cd backend
rm -rf venv __pycache__
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json dist
npm install
```

---

## 📦 Git Commands

### Initial Setup
```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "feat: Implement authentication module (Sprint 1)"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/cs308-project.git

# Push to remote
git push -u origin main
```

### Common Workflow
```bash
# Check status
git status

# Create feature branch
git checkout -b feature/auth-module

# Add changes
git add .

# Commit with message
git commit -m "feat: Add login functionality"

# Push to remote
git push origin feature/auth-module

# Merge to main
git checkout main
git merge feature/auth-module
git push origin main
```

---

## 🚀 Deployment Commands (Production)

### Build Frontend
```bash
cd frontend
npm run build
# The dist folder will contain optimized production files
```

### Backend (Gunicorn)
```bash
# Install Gunicorn
pip install gunicorn

# Run FastAPI with Gunicorn workers
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

---

## 🔐 Security Commands

### Generate Secret Keys
```bash
# Generate random secret for any additional needs (e.g. session keys)
python -c "import secrets; print(secrets.token_hex(32))"
```

### Check Dependencies for Vulnerabilities
```bash
# Check frontend
cd frontend && npm audit

# Auto-fix vulnerabilities
npm audit fix
```

---

## 💡 Useful Shortcuts

### Development Workflow
```bash
# Terminal 1: Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 🆘 Troubleshooting Commands

### Issue: Port already in use
```bash
# Kill process on port
kill -9 $(lsof -ti:8000)  # Backend
kill -9 $(lsof -ti:5173)  # Frontend
```

---

**Quick tip:** Save this file and keep it open while developing!
