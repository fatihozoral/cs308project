# Quick Reference - Common Commands

**CS 308 Online Ticketing Platform**

---

## 🚀 Getting Started

```bash
# Clone and setup
cd cs308-project

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run seed
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm start
```

---

## 🔧 Backend Commands

### Development
```bash
# Start development server (with nodemon)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Watch mode for tests
npm run test:watch
```

### Database
```bash
# Run migration (create tables)
npm run migrate

# Run seed script (create manager accounts)
npm run seed

# Execute custom SQL
psql -U postgres -d ticketing_db -f path/to/file.sql
```

### Debugging
```bash
# Check if server is running
curl http://localhost:5000/health

# Test registration endpoint
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test1234!","tax_id":"12345678901","home_address":"Test Address"}'

# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

---

## 🎨 Frontend Commands

### Development
```bash
# Start development server
npm start

# Build for production
npm build

# Run tests (if frontend tests added)
npm test
```

### Debugging
```bash
# Clear React cache
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 🗄️ Database Commands

### PostgreSQL
```bash
# Connect to PostgreSQL
psql -U postgres

# Connect to specific database
psql -U postgres -d ticketing_db

# List all databases
\l

# List all tables
\dt

# Describe users table
\d users

# Query users
SELECT id, name, email, role FROM users;

# Check password hash
SELECT email, password_hash FROM users WHERE email = 'test@example.com';

# Delete test users
DELETE FROM users WHERE email LIKE '%test%';

# Drop database (careful!)
DROP DATABASE ticketing_db;

# Recreate database
CREATE DATABASE ticketing_db;

# Exit PostgreSQL
\q
```

### Backup and Restore
```bash
# Backup database
pg_dump -U postgres ticketing_db > backup.sql

# Restore database
psql -U postgres ticketing_db < backup.sql

# Backup only schema
pg_dump -U postgres --schema-only ticketing_db > schema.sql

# Backup only data
pg_dump -U postgres --data-only ticketing_db > data.sql
```

---

## 🧪 Testing Commands

### Run Specific Tests
```bash
# Run specific test file
npm test -- auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="AC-01"

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose
```

### Coverage
```bash
# Generate coverage report
npm test -- --coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

---

## 🔍 Debugging Commands

### Check Port Usage
```bash
# Check what's running on port 5000
lsof -ti:5000

# Kill process on port 5000
kill -9 $(lsof -ti:5000)

# Check what's running on port 3000
lsof -ti:3000
```

### View Logs
```bash
# View backend logs (if using PM2)
pm2 logs

# Follow backend logs
tail -f logs/backend.log

# View PostgreSQL logs (macOS)
tail -f /usr/local/var/log/postgres.log
```

### Check Dependencies
```bash
# List installed packages
npm list --depth=0

# Check for outdated packages
npm outdated

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## 🧹 Cleanup Commands

### Clear Node Modules
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Clear Database
```bash
# Delete test data only
psql -U postgres -d ticketing_db -c "DELETE FROM users WHERE email LIKE '%test%';"

# Reset entire database
psql -U postgres -c "DROP DATABASE ticketing_db;"
psql -U postgres -c "CREATE DATABASE ticketing_db;"
cd backend
npm run migrate
npm run seed
```

### Clear Caches
```bash
# Clear npm cache
npm cache clean --force

# Clear React build cache
cd frontend
rm -rf build node_modules/.cache
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

### Build
```bash
# Build frontend
cd frontend
npm run build

# The build folder will contain optimized production files
```

### Environment
```bash
# Set production environment
export NODE_ENV=production

# Start backend in production
cd backend
npm start
```

### Process Management (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
pm2 start src/server.js --name ticketing-api

# Start on system boot
pm2 startup
pm2 save

# View logs
pm2 logs ticketing-api

# Restart
pm2 restart ticketing-api

# Stop
pm2 stop ticketing-api

# Delete
pm2 delete ticketing-api
```

---

## 🔐 Security Commands

### Generate JWT Secret
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy to .env
# JWT_SECRET=<generated_secret>
```

### Check Dependencies for Vulnerabilities
```bash
# Check both frontend and backend
cd backend && npm audit
cd ../frontend && npm audit

# Auto-fix vulnerabilities
npm audit fix
```

---

## 📊 Monitoring Commands

### Health Checks
```bash
# Backend health
curl http://localhost:5000/health

# Database connection test
psql -U postgres -d ticketing_db -c "SELECT 1;"

# Frontend (check if React dev server responds)
curl http://localhost:3000
```

### Performance
```bash
# Check Node.js memory usage
node --inspect src/server.js

# Monitor PostgreSQL connections
psql -U postgres -d ticketing_db -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 💡 Useful Shortcuts

### Development Workflow
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm start

# Terminal 3: Database
psql -U postgres -d ticketing_db

# Terminal 4: Tests
cd backend && npm test -- --watch
```

### Quick Reset
```bash
# Full reset script
cd backend
npm run migrate
npm run seed
npm run dev
```

---

## 🆘 Troubleshooting Commands

### Issue: Cannot connect to database
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@14

# Test connection
psql -U postgres -c "SELECT 1;"
```

### Issue: Port already in use
```bash
# Kill process on port
kill -9 $(lsof -ti:5000)  # Backend
kill -9 $(lsof -ti:3000)  # Frontend
```

### Issue: Migration fails
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS ticketing_db;"
psql -U postgres -c "CREATE DATABASE ticketing_db;"
npm run migrate
```

### Issue: Tests failing
```bash
# Clear test database
psql -U postgres -d ticketing_db -c "DELETE FROM users WHERE email LIKE '%test%';"

# Run tests again
npm test
```

---

**Quick tip:** Save this file and keep it open while developing!
