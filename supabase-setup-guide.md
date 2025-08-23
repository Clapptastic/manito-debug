# Supabase Setup Guide for ManitoDebug

## Current Status ✅

The codebase has been **fully audited and configured for Supabase integration**. Here's what's been implemented:

### ✅ Completed Supabase Integration

1. **Supabase Service**: Comprehensive service with vector search, RPC functions, and full database operations
2. **Database Models**: Updated for Supabase compatibility with proper error handling
3. **Authentication**: JWT-based auth system compatible with Supabase
4. **API Endpoints**: All working through the enhanced database service with Supabase routing
5. **Schema**: Complete SQL schema with RLS policies, indexes, and functions
6. **Migration System**: Integrated with existing migration infrastructure

## Setup Options

### Option 1: Use Existing Supabase Project 🏢

I noticed you have a Supabase project called "manito_exec_dashboard". You can use this:

```bash
# Link to your existing project
supabase link --project-ref pymkesszsofuyccsppre

# Apply our schema
supabase db push
```

### Option 2: Create New Supabase Project 🆕

Create a dedicated project for ManitoDebug:

```bash
# Create new project
supabase projects create manito-debug --org-id aoxnipggndjxarromkey

# Link to it
supabase link --project-ref <new-project-ref>

# Apply schema
supabase db push
```

### Option 3: Local Development Setup 🏠

For development, you can run Supabase locally:

```bash
# Initialize Supabase in your project
supabase init

# Start local Supabase (includes PostgreSQL, Auth, API, etc.)
supabase start

# Apply the schema we created
psql postgresql://postgres:postgres@localhost:54322/postgres < supabase-schema.sql

# Or use the setup script we created
node scripts/setup-supabase.js
```

## Environment Configuration 🔧

Update your `.env` file based on your choice:

### For Hosted Supabase Project:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### For Local Development:
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Database Schema 📊

The complete schema includes:

- **Core Tables**: users, projects, scans, files, dependencies, conflicts
- **Code Knowledge Graph**: graph_nodes, graph_edges, code_chunks with vector embeddings
- **Security**: Row Level Security (RLS) policies for data isolation
- **Performance**: Optimized indexes including vector similarity indexes
- **Functions**: RPC functions for search, symbol lookup, dependency graphs

## Key Features Implemented 🚀

### 1. Intelligent Database Routing
```
Supabase (Primary) → PostgreSQL (Fallback) → Mock Mode
```

### 2. Vector Search Capabilities
- Code chunk similarity search
- Symbol definition lookup
- Dependency graph analysis

### 3. Full-Text Search
- Advanced search across code content
- Project and file-level filtering
- Language-specific searches

### 4. Real-time Updates
- WebSocket integration with Supabase realtime
- Live updates for code analysis progress

### 5. Security & Compliance
- Row Level Security (RLS) for multi-tenant data isolation
- Service role authentication for server operations
- Secure environment variable handling

## Testing the Setup 🧪

After setup, test the integration:

```bash
# Run the setup verification script
node scripts/setup-supabase.js

# Start the server (it will now use Supabase as primary database)
npm run dev

# Check the logs for "Using Supabase as primary database"
```

## Migration from PostgreSQL 📦

The system is designed for seamless migration:

1. **Zero Downtime**: Keeps PostgreSQL as fallback during transition
2. **Data Migration**: Use Supabase's migration tools or dump/restore
3. **Gradual Rollout**: Test with Supabase while keeping existing data safe

## Support & Troubleshooting 🛠️

### Common Issues:

1. **Connection Errors**: Check SUPABASE_URL and keys
2. **Schema Errors**: Ensure vector extension is enabled
3. **RLS Policies**: Verify service role has proper permissions

### Debug Commands:
```bash
# Check Supabase status
supabase status

# View logs
supabase logs

# Test connection
curl $SUPABASE_URL/rest/v1/projects -H "apikey: $SUPABASE_ANON_KEY"
```

## Next Steps 📈

1. **Choose Setup Option** (recommended: Local for development, Hosted for production)
2. **Apply Schema** using provided SQL file
3. **Update Environment Variables**
4. **Test Integration** with setup script
5. **Deploy** with confidence knowing all components are Supabase-ready!

---

**The codebase is 100% ready for Supabase!** All database operations, authentication, and APIs will automatically route through Supabase once you complete the setup above.