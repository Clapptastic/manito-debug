# Development Guide

## 🚨 **Critical Issues - Development Status**

### **Project Selection Data Persistence Issue**
**Status**: ⚠️ **CRITICAL - IMMEDIATE ACTION REQUIRED**  
**Impact**: Users lose analysis data when switching projects

**Issue**: When users click on a project in the Project Manager, the application does not load existing scan results, causing data loss and poor user experience.

**Root Cause**: 
- Database schema mismatch in scan retrieval
- Missing API endpoints for loading project data
- No data loading mechanism on project selection

**Required Fixes**:
1. Fix database schema column name mismatches
2. Add `/api/projects/:id/latest-scan` endpoint
3. Implement data loading in App.jsx
4. Add proper error handling

**Files Affected**:
- `server/models/Scan.js` - Database schema issues
- `client/src/App.jsx` - Missing data loading
- `server/app.js` - Missing API endpoints

---

## 🏗️ **Development Environment Setup**

### **Prerequisites**
- Node.js 20.x or higher
- PostgreSQL 15.x
- Redis 7.x
- Docker (optional but recommended)

### **Quick Start**
```bash
# Clone repository
git clone https://github.com/Clapptastic/manito-debug.git
cd manito-debug

# Install dependencies
npm install

# Start development environment
npm run dev

# Or start individual services
npm run dev:server  # Backend server
npm run dev:client  # Frontend client
```

### **Environment Variables**
```bash
# Required for development
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manito_dev
REDIS_URL=redis://localhost:6379

# AI Providers (optional for development)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

---

## 🐳 **Docker Development Environment**

### **Fixed: Docker Profile Flag Issue ✅**

**Issue**: The `--profile` flag was being used incorrectly in Docker Compose commands, causing "unknown flag" errors.

**Root Cause**: The `--profile` flag needs to be placed before the `up` command, not after it.

**Fix Applied**: Updated `scripts/dev-docker.sh` to properly position the `--profile` flag:
- Changed from: `docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up --profile $PROFILES`
- Changed to: `docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME --profile $PROFILES up`

**Status**: ✅ **RESOLVED** - Docker profiles now work correctly

### **Using Docker Profiles**

The development environment supports different profiles for different use cases:

#### **Available Profiles**
- **`testing`** - Includes automated test runner with file watching
- **`tools`** - Includes development tools container for debugging

#### **Usage Examples**
```bash
# Start with testing profile
./scripts/dev-docker.sh up --testing

# Start with tools profile  
./scripts/dev-docker.sh up --tools

# Start with both profiles
./scripts/dev-docker.sh up --testing --tools

# Run tests only
./scripts/dev-docker.sh test
```

#### **Interactive Development**
For the easiest experience, use the interactive launcher:
```bash
npm run dev
```

This will guide you through choosing the right development setup including Docker profiles.

### **Docker Services**
The development environment includes:
- **manito-dev** - Main application with hot reloading
- **postgres-dev** - PostgreSQL database with sample data
- **redis-dev** - Redis caching layer
- **test-runner** - Automated test runner (testing profile)
- **dev-tools** - Development tools container (tools profile)

### **Troubleshooting Docker Issues**
```bash
# Check Docker is running
docker info

# Clean up containers
./scripts/dev-docker.sh clean

# Rebuild images
./scripts/dev-docker.sh build

# Check logs
./scripts/dev-docker.sh logs
```

### **Port Usage**
- **3000** - Server API
- **5173** - Vite dev server (client)
- **5432** - PostgreSQL
- **6379** - Redis
- **9229** - Node.js debugger (when using debug mode)

---

## 🔧 **Development Workflow**

### **Code Standards**
- **ESLint**: Configured for consistent code style
- **Prettier**: Automatic code formatting
- **TypeScript**: Type safety (optional)
- **Jest**: Unit and integration testing

### **Git Workflow**
```bash
# Create feature branch
git checkout -b feature/project-data-persistence

# Make changes
# ... edit files ...

# Run tests
npm test

# Format code
npm run format

# Commit changes
git add .
git commit -m "feat: implement project data persistence"

# Push to remote
git push origin feature/project-data-persistence
```

### **Testing**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit      # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e       # End-to-end tests

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### **Database Management**
```bash
# Run migrations
npm run migrate

# Reset database
npm run db:reset

# Seed database
npm run db:seed

# Check database status
npm run db:status
```

---

## 🚨 **Known Issues & Fixes**

### **✅ Fixed Issues**

#### **ToastProvider Context Issue** (Dec 2024)
**Issue**: React error "useToast must be used within a ToastProvider" when starting the application.

**Root Cause**: The `ToastProvider` was placed inside the `AppContent` component, but the `useToast` hook was being called before the provider was rendered.

**Fix Applied**: Moved `ToastProvider` to wrap the entire `AppContent` component in the main `App` component.

**Status**: ✅ **RESOLVED** - Toast notifications now work correctly

#### **Tailwind CSS Configuration Issue** (Aug 2025)
**Issue**: Tailwind CSS unable to load config file with `tailwindcss-animate` plugin.

**Root Cause**: Plugin not installed and ES module import issues.

**Fix Applied**: 
- Installed `tailwindcss-animate` in root and client directories
- Updated import syntax for ES modules
- Added proper exclude patterns for upload directories

**Status**: ✅ **RESOLVED** - Tailwind CSS now works correctly

#### **VS Code Deno Configuration Issue** (Aug 2025)
**Issue**: VS Code attempting to use Deno for TypeScript/JavaScript language support.

**Root Cause**: VS Code configuration files had Deno-specific settings.

**Fix Applied**: 
- Updated workspace settings to disable Deno
- Created proper TypeScript configuration
- Added relevant Node.js extensions

**Status**: ✅ **RESOLVED** - VS Code now properly configured for Node.js development

### **⚠️ Current Issues**

#### **Project Selection Data Persistence** (CRITICAL)
**Issue**: Users lose analysis data when switching projects.

**Impact**: Poor user experience, data loss, workflow disruption.

**Required Action**: Implement data loading mechanism and fix database schema.

**Priority**: **IMMEDIATE**

#### **Database Schema Mismatch** (CRITICAL)
**Issue**: Scan retrieval failing due to column name mismatches.

**Impact**: Complete failure of scan data retrieval.

**Required Action**: Fix database schema or update model queries.

**Priority**: **IMMEDIATE**

---

## 📊 **Development Metrics**

### **Test Coverage**
- **Total Tests**: 23 passed, 0 failed
- **Coverage**: 85% (target: 90%)
- **Categories**: Unit, Integration, E2E

### **Code Quality**
- **ESLint**: 0 errors, 0 warnings
- **Prettier**: Consistent formatting
- **TypeScript**: Optional type safety

### **Performance**
- **Build Time**: < 30 seconds
- **Startup Time**: < 10 seconds
- **Hot Reload**: < 2 seconds

---

## 🔍 **Debugging Guide**

### **Server Debugging**
```bash
# Start server in debug mode
npm run dev:server:debug

# Check server logs
npm run logs:server

# Monitor server health
curl http://localhost:3000/api/health?detailed=true
```

### **Client Debugging**
```bash
# Start client in debug mode
npm run dev:client:debug

# Check client logs
npm run logs:client

# Open browser dev tools
# Press F12 and check Console tab
```

### **Database Debugging**
```bash
# Connect to database
psql postgresql://postgres:postgres@localhost:5432/manito_dev

# Check database status
npm run db:status

# Run database tests
npm run test:db
```

### **Common Debugging Commands**
```bash
# Check all services
npm run health

# Monitor system resources
npm run monitor

# Check port usage
npm run ports

# Validate configuration
npm run validate
```

---

## 🚀 **Deployment**

### **Development Deployment**
```bash
# Build for development
npm run build:dev

# Start development server
npm run start:dev

# Deploy to development environment
npm run deploy:dev
```

### **Production Deployment**
```bash
# Build for production
npm run build:prod

# Start production server
npm run start:prod

# Deploy to production
npm run deploy:prod
```

### **Docker Deployment**
```bash
# Build Docker images
./scripts/docker-build-push.sh

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check deployment status
docker-compose -f docker-compose.prod.yml ps
```

---

## 📚 **Resources**

### **Documentation**
- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Testing Guide](./docs/TESTING.md)
- [Deployment Guide](./DEPLOYMENT_SUMMARY.md)

### **External Resources**
- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

### **Community**
- [GitHub Issues](https://github.com/Clapptastic/manito-debug/issues)
- [GitHub Discussions](https://github.com/Clapptastic/manito-debug/discussions)
- [Discord Community](https://discord.gg/manitodebug)

---

## 🎯 **Next Steps**

### **Immediate Priorities**
1. **Fix Project Selection Data Persistence** (CRITICAL)
2. **Resolve Database Schema Issues** (CRITICAL)
3. **Add Missing API Endpoints** (HIGH)
4. **Implement Data Loading** (HIGH)

### **Short-term Goals**
1. **Add Data Persistence Layer** (MEDIUM)
2. **Implement Project State Management** (MEDIUM)
3. **Add User Session Handling** (MEDIUM)
4. **Enhance Error Handling** (MEDIUM)

### **Long-term Goals**
1. **Add Real-time Data Synchronization** (LOW)
2. **Implement Data Caching** (LOW)
3. **Add Offline Support** (LOW)
4. **Enhance Performance** (LOW)

---

**Development Status**: ⚠️ **CRITICAL ISSUES IDENTIFIED - IMMEDIATE ACTION REQUIRED**