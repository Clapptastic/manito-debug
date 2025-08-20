# 📋 NPM Scripts Reference Guide

**ManitoDebug** - Advanced AI-powered code analysis and debugging tool

## 🚀 **Quick Start Commands**

### **Development**
```bash
# Start full development environment
npm run dev

# Start with browser auto-open
npm run dev:open

# Start individual services
npm run dev:client    # React client only
npm run dev:server    # Express server only
npm run dev:core      # Core analysis engine only
```

### **Production**
```bash
# Start production server
npm start

# Start full stack with dynamic port management
npm run start:fullstack

# Start production environment
npm run start:prod
```

### **Building**
```bash
# Build all packages
npm run build

# Build individual packages
npm run build:client
npm run build:server
npm run build:core

# Build for Docker
npm run build:docker
```

## 🧪 **Testing Commands**

### **Complete Test Suite**
```bash
# Run all tests (core + client + server + e2e)
npm test

# Run tests in watch mode
npm run test:watch

# Run comprehensive e2e tests
npm run test:comprehensive

# Run advanced e2e tests
npm run test:advanced
```

### **Individual Test Suites**
```bash
# Core analysis engine tests
npm run test:core

# React client tests
npm run test:client

# Express server tests
npm run test:server

# End-to-end integration tests
npm run test:e2e
```

### **Specialized Tests**
```bash
# Dynamic port management
npm run test:dynamic-ports
npm run test:port-manager
npm run test:fullstack-ports
npm run test:port-conflict
npm run test:port-management

# Database functionality
npm run test:database

# File upload system
npm run test:upload

# WebSocket communication
npm run test:websocket

# AI analysis integration
npm run test:ai-analysis

# Scanner functionality
npm run test:scanner

# Routing system
npm run test:routing

# Search functionality
npm run test:search

# Error handling
npm run test:scan-error
npm run test:client-scan

# Full stack debugging
npm run test:fullstack-debug

# Integration audit
npm run test:audit-integration

# Email validation
npm run test:email-validation

# General functionality
npm run test:functionality
```

## 🔧 **Setup & Configuration**

### **Initial Setup**
```bash
# Full stack setup
npm run setup

# Ensure setup is complete
npm run setup:ensure

# Interactive development setup
npm run setup:interactive
```

### **Health Checks**
```bash
# Check database extensions
npm run check:db-extensions

# Check VS Code integration
npm run check:vscode

# Check system health
npm run check:health

# Calculate progress percentage
npm run check:progress

# Update status documentation
npm run check:status
```

## 📊 **Monitoring & Analysis**

### **System Monitoring**
```bash
# Monitor system resources
npm run monitor

# Monitor full stack services
npm run monitor:fullstack
```

### **Code Analysis**
```bash
# Analyze bundle sizes
npm run analyze

# Analyze dependencies
npm run analyze:dependencies

# Analyze client bundles
npm run analyze:bundles
```

## 🐳 **Docker Commands**

### **Development Docker**
```bash
# Start development containers
npm run docker:dev

# Start production containers
npm run docker:prod

# Start all containers
npm run docker

# Stop all containers
npm run docker:down

# View container logs
npm run docker:logs

# Clean Docker resources
npm run docker:clean
```

### **Docker Deployment**
```bash
# Build and push Docker images
npm run build:docker

# Deploy with Docker
npm run deploy:docker
```

## 🚂 **Railway Deployment**

### **Railway Commands**
```bash
# Deploy to Railway
npm run railway

# Deploy in detached mode
npm run railway:deploy

# View Railway logs
npm run railway:logs

# Check Railway status
npm run railway:status
```

## 🧹 **Maintenance Commands**

### **Cleaning**
```bash
# Clean all node_modules and lock files
npm run clean

# Clean and reinstall dependencies
npm run clean:install

# Clean, install, and build
npm run clean:build
```

### **Code Quality**
```bash
# Lint all packages
npm run lint

# Lint individual packages
npm run lint:client
npm run lint:server
npm run lint:core

# Format all code
npm run format

# Format individual packages
npm run format:client
npm run format:server
npm run format:core
```

### **Security**
```bash
# Run security audit
npm run security

# Run security scan
npm run security:scan
```

## 📚 **Documentation**

### **Documentation Commands**
```bash
# Generate documentation
npm run docs:generate

# Serve documentation
npm run docs:serve

# Generate and serve docs
npm run docs
```

## 🎯 **Preview & Analysis**

### **Preview Commands**
```bash
# Build and preview client
npm run preview

# Preview client only
npm run preview:client
```

## 🔄 **CI/CD Commands**

### **Continuous Integration**
```bash
# Full CI pipeline
npm run ci

# CI testing only
npm run ci:test

# CI build only
npm run ci:build

# CI deployment
npm run ci:deploy
```

## 📦 **Package-Specific Commands**

### **Client Package (@manito/client)**
```bash
cd client

# Development
npm run dev              # Start Vite dev server
npm run dev:https        # Start with HTTPS
npm run dev:host         # Start with host access

# Testing
npm run test             # Run Vitest tests
npm run test:ui          # Run tests with UI
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:run         # Run tests once

# Building
npm run build            # Build for production
npm run build:analyze    # Build with bundle analysis
npm run build:preview    # Build and preview

# Code Quality
npm run lint             # ESLint
npm run lint:fix         # Auto-fix linting issues
npm run format           # Prettier formatting
npm run format:check     # Check formatting
npm run type-check       # TypeScript type checking

# Utilities
npm run analyze          # Bundle analysis
npm run clean            # Clean build artifacts
npm run clean:install    # Clean and reinstall
npm run serve            # Build and serve
```

### **Server Package (@manito/server)**
```bash
cd server

# Development
npm run dev              # Start with nodemon
npm run dev:watch        # Watch mode with file extensions
npm run dev:debug        # Debug mode

# Production
npm start                # Start production server
npm run start:prod       # Production environment
npm run start:cluster    # Cluster mode

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:verbose     # Verbose output
npm run test:debug       # Debug tests

# Code Quality
npm run lint             # ESLint
npm run lint:fix         # Auto-fix
npm run format           # Prettier
npm run format:check     # Check formatting

# Database
npm run migrate          # Run migrations
npm run migrate:reset    # Reset migrations
npm run seed             # Seed database

# Monitoring
npm run health           # Health check
npm run logs             # View logs
npm run logs:error       # Error logs only
npm run monitor          # Monitor server

# Utilities
npm run clean            # Clean dependencies
npm run clean:install    # Clean and reinstall
npm run analyze          # Dependency analysis
npm run security         # Security audit
npm run security:fix     # Fix security issues

# Docker
npm run docker           # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:compose   # Docker Compose

# Backup
npm run backup           # Backup database
npm run restore          # Restore database
```

### **Core Package (@manito/core)**
```bash
cd core

# Development
npm run dev              # Watch mode
npm run dev:debug        # Debug mode

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:verbose     # Verbose output
npm run test:debug       # Debug tests
npm run test:performance # Performance tests
npm run test:memory      # Memory tests

# Code Quality
npm run lint             # ESLint
npm run lint:fix         # Auto-fix
npm run format           # Prettier
npm run format:check     # Check formatting

# Analysis
npm run analyze          # Dependency analysis
npm run security         # Security audit
npm run security:fix     # Fix security issues

# Benchmarking
npm run benchmark        # Performance benchmarks
npm run benchmark:memory # Memory benchmarks
npm run benchmark:parsing # Parsing benchmarks

# Documentation
npm run docs             # Generate JSDoc
npm run docs:serve       # Serve documentation

# Utilities
npm run clean            # Clean dependencies
npm run clean:install    # Clean and reinstall
npm run type-check       # TypeScript checking
npm run validate         # Full validation
```

## 🎯 **Common Workflows**

### **Development Workflow**
```bash
# 1. Start development environment
npm run dev

# 2. Run tests in watch mode
npm run test:watch

# 3. Check code quality
npm run lint && npm run format:check

# 4. Build for testing
npm run build
```

### **Production Deployment Workflow**
```bash
# 1. Run full test suite
npm test

# 2. Build all packages
npm run build

# 3. Security audit
npm run security

# 4. Deploy
npm run deploy:production
```

### **Docker Deployment Workflow**
```bash
# 1. Build Docker images
npm run build:docker

# 2. Deploy with Docker
npm run deploy:docker

# 3. Monitor deployment
npm run docker:logs
```

### **Railway Deployment Workflow**
```bash
# 1. Build and test
npm run ci:test && npm run ci:build

# 2. Deploy to Railway
npm run railway:deploy

# 3. Check status
npm run railway:status
```

## 📝 **Script Categories Summary**

| Category | Scripts | Description |
|----------|---------|-------------|
| **Development** | `dev`, `dev:open`, `dev:client`, `dev:server`, `dev:core` | Start development environments |
| **Production** | `start`, `start:fullstack`, `start:prod` | Start production services |
| **Building** | `build`, `build:client`, `build:server`, `build:core`, `build:docker` | Build packages and containers |
| **Testing** | `test`, `test:watch`, `test:e2e`, `test:comprehensive`, `test:advanced` | Run test suites |
| **Setup** | `setup`, `setup:ensure`, `setup:interactive` | Configure development environment |
| **Health Checks** | `check:db-extensions`, `check:health`, `check:progress`, `check:status` | Verify system health |
| **Monitoring** | `monitor`, `monitor:fullstack` | Monitor system resources |
| **Docker** | `docker`, `docker:dev`, `docker:prod`, `docker:down`, `docker:logs` | Container management |
| **Railway** | `railway`, `railway:deploy`, `railway:logs`, `railway:status` | Railway deployment |
| **Maintenance** | `clean`, `clean:install`, `clean:build` | Clean and reinstall |
| **Code Quality** | `lint`, `format`, `security` | Code quality checks |
| **CI/CD** | `ci`, `ci:test`, `ci:build`, `ci:deploy` | Continuous integration |
| **Analysis** | `analyze`, `analyze:bundles`, `analyze:dependencies` | Code and dependency analysis |

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Port Conflicts**: Use `npm run test:dynamic-ports` to test port management
2. **Database Issues**: Run `npm run check:db-extensions` to verify database setup
3. **Build Failures**: Try `npm run clean:build` to clean and rebuild
4. **Test Failures**: Run `npm run test:verbose` for detailed test output
5. **Dependency Issues**: Use `npm run clean:install` to clean and reinstall

### **Debug Commands**
```bash
# Debug development server
npm run dev:server -- --inspect

# Debug tests
npm run test:debug

# Debug client
npm run dev:client -- --debug

# Monitor system resources
npm run monitor
```

---

**Last Updated**: August 2025  
**Version**: 1.0.0  
**Status**: Complete and up-to-date with current application features
