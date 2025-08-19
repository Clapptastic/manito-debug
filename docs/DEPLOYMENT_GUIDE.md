# Deployment Guide: Manito Package

## Overview

This guide provides step-by-step instructions for deploying the Manito Package with 100% functionality, including the enhanced database system and semantic search capabilities.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn
- Git

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd manito-package
npm install
```

### 2. Database Setup

```bash
# Start PostgreSQL
brew services start postgresql@14

# Create database and user
psql postgres -c "CREATE DATABASE manito_dev;"
psql postgres -c "CREATE ROLE manito_dev WITH LOGIN PASSWORD 'manito_dev';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE manito_dev TO manito_dev;"
psql -d manito_dev -c "CREATE SCHEMA manito_dev;"
psql -d manito_dev -c "GRANT ALL ON SCHEMA manito_dev TO manito_dev;"
```

### 3. Run Migrations

```bash
cd server
node -e "import('./services/migrations.js').then(migrations => migrations.default.runMigrations())"
cd ..
```

### 4. Start Development Server

```bash
npm run dev
```

## Production Deployment

### Automated Deployment

Use the production deployment script:

```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

### Manual Deployment

1. **Environment Setup**
   ```bash
   export NODE_ENV=production
   export DATABASE_URL=postgresql://user:password@localhost:5432/manito_dev
   ```

2. **Install Dependencies**
   ```bash
   npm ci --production
   ```

3. **Database Migration**
   ```bash
   cd server
   node -e "import('./services/migrations.js').then(migrations => migrations.default.runMigrations())"
   cd ..
   ```

4. **Build Client**
   ```bash
   cd client
   npm run build
   cd ..
   ```

5. **Start Production Server**
   ```bash
   npm run start:prod
   ```

## Health Checks

### Basic Health Check

```bash
curl http://localhost:3000/api/health
```

### Detailed Health Check

```bash
curl http://localhost:3000/api/health?detailed=true
```

### Expected Response

```json
{
  "status": "ok",
  "services": {
    "database": {
      "status": "ok",
      "connected": true,
      "tables": 10,
      "functions": 3,
      "indexes": 29
    },
    "websocket": {
      "status": "healthy",
      "connections": 0
    },
    "semanticSearch": {
      "status": "ok",
      "features": {
        "globalSearch": true,
        "projectSearch": true
      }
    },
    "ai": {
      "status": "ok",
      "providers": {
        "local": {
          "available": true,
          "configured": true
        }
      }
    }
  }
}
```

## Monitoring

### System Monitor

Run the real-time system monitor:

```bash
node scripts/monitor-system.js
```

### Functionality Tests

Run comprehensive tests:

```bash
node scripts/test-database-functionality.js
```

### Expected Test Results

```
🧪 Starting Database Functionality Tests...

✅ Database connection successful
✅ All 6 migrations applied successfully
✅ All 9 required tables exist
✅ All 3 required functions exist
✅ Semantic search working (6 results)
✅ Health endpoint working correctly
✅ Search API working (5 results)
✅ Database pool working (2 connections)
✅ Cache system working (hit rate: 0%)

📊 Test Results: 9 passed, 0 failed
🎉 All tests passed! Database functionality is 100% operational.
```

## API Endpoints

### Core Endpoints

- `GET /api/health` - Health check
- `GET /api/health?detailed=true` - Detailed health check
- `GET /api/search?q=<query>&limit=<number>` - Semantic search
- `POST /api/search/advanced` - Advanced search
- `GET /api/migrations/status` - Migration status
- `POST /api/migrations/run` - Run migrations

### Search Examples

```bash
# Basic search
curl "http://localhost:3000/api/search?q=test&limit=5"

# Project-specific search
curl "http://localhost:3000/api/search?q=test&type=projects&limit=10"

# Advanced search
curl -X POST "http://localhost:3000/api/search/advanced" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "entityTypes": ["projects", "files"], "limit": 20}'
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   brew services list | grep postgresql
   
   # Restart PostgreSQL
   brew services restart postgresql@14
   ```

2. **Migration Errors**
   ```bash
   # Check migration status
   curl http://localhost:3000/api/migrations/status
   
   # Reset migrations
   curl -X POST http://localhost:3000/api/migrations/reset
   ```

3. **Search Not Working**
   ```bash
   # Test search function directly
   psql -d manito_dev -c "SELECT * FROM manito_dev.global_search('test', NULL, 5);"
   ```

4. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :3000
   
   # Kill conflicting processes
   pkill -f "node.*index.js"
   ```

### Logs

Check application logs:

```bash
# Server logs
tail -f logs/app.log

# Database logs
tail -f /usr/local/var/log/postgresql@14.log
```

## Performance Optimization

### Database Optimization

1. **Connection Pooling**: Configured for 2-20 connections
2. **Caching**: In-memory cache with configurable TTL
3. **Indexes**: Full-text search indexes on all searchable columns
4. **Query Optimization**: Prepared statements and parameterized queries

### Search Optimization

1. **GIN Indexes**: Full-text search indexes
2. **Composite Indexes**: Multi-column search optimization
3. **Caching**: Search results cached for 5 minutes
4. **Ranking**: PostgreSQL ts_rank for relevance scoring

## Security

### Environment Variables

Set these in production:

```bash
export NODE_ENV=production
export DATABASE_URL=postgresql://user:password@localhost:5432/manito_dev
export OPENAI_API_KEY=your_openai_key
export ANTHROPIC_API_KEY=your_anthropic_key
export GOOGLE_API_KEY=your_google_key
```

### Security Checks

The deployment script includes security checks:

```bash
# Check for hardcoded credentials
grep -r "password.*=.*['\"]" server/ --exclude-dir=node_modules
grep -r "api.*key.*=.*['\"]" server/ --exclude-dir=node_modules
```

## Maintenance

### Regular Tasks

1. **Database Backup**
   ```bash
   pg_dump manito_dev > backup_$(date +%Y%m%d).sql
   ```

2. **Log Rotation**
   ```bash
   # Configure logrotate for application logs
   sudo logrotate /etc/logrotate.d/manito
   ```

3. **Health Monitoring**
   ```bash
   # Set up cron job for health checks
   */5 * * * * curl -f http://localhost:3000/api/health || echo "Health check failed"
   ```

### Updates

1. **Code Updates**
   ```bash
   git pull origin main
   npm install
   cd server && node -e "import('./services/migrations.js').then(migrations => migrations.default.runMigrations())"
   cd ..
   npm run build
   npm run start:prod
   ```

2. **Database Updates**
   ```bash
   # New migrations are automatically detected and applied
   curl -X POST http://localhost:3000/api/migrations/run
   ```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Run the functionality tests: `node scripts/test-database-functionality.js`
3. Check the system monitor: `node scripts/monitor-system.js`
4. Review application logs: `tail -f logs/app.log`

## Implementation Status

✅ **Phase 1**: Migration System - COMPLETED  
✅ **Phase 2**: Database Service - COMPLETED  
✅ **Phase 3**: Semantic Search - COMPLETED  
✅ **Phase 4**: Health Monitoring - COMPLETED  
✅ **Phase 5**: Testing & Validation - COMPLETED  
✅ **Phase 6**: Deployment & Monitoring - COMPLETED  

**🎉 100% FUNCTIONALITY ACHIEVED!**
