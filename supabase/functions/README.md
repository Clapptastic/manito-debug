# Supabase Edge Functions

This directory contains all the edge functions for the Manito Debug platform. These functions provide serverless compute capabilities with automatic scaling and built-in authentication.

## 📁 Functions Overview

### 🔌 API Proxy (`api-proxy`)
**Purpose**: Secure proxy for external AI API calls (OpenAI, Anthropic)
- Handles API key management securely
- Implements rate limiting
- Logs API usage for monitoring
- Provides unified interface for multiple AI providers

**Endpoints**: 
- `POST /functions/v1/api-proxy`

**Usage**:
```javascript
const response = await fetch('/functions/v1/api-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});
```

### 🔍 Code Analysis (`analyze-code`)
**Purpose**: Performs static code analysis on uploaded files
- Syntax checking for multiple languages
- Security vulnerability detection
- Performance issue identification
- Dependency analysis

**Endpoints**:
- `POST /functions/v1/analyze-code`

**Usage**:
```javascript
const response = await fetch('/functions/v1/analyze-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    files: [{ path: 'app.js', content: '...', language: 'javascript' }],
    scanId: 'scan-uuid',
    projectId: 'project-uuid',
    analysisType: 'full'
  })
});
```

### 🤖 AI Analysis (`ai-analysis`)
**Purpose**: AI-powered code analysis using LLMs
- Code review automation
- Bug detection
- Optimization suggestions
- Security auditing

**Endpoints**:
- `POST /functions/v1/ai-analysis`

**Usage**:
```javascript
const response = await fetch('/functions/v1/ai-analysis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scanId: 'scan-uuid',
    projectId: 'project-uuid',
    codeContext: { files: [...], dependencies: [...] },
    analysisType: 'code_review'
  })
});
```

### 🪝 Webhooks (`webhooks`)
**Purpose**: Handles external webhooks (GitHub, GitLab, etc.)
- GitHub push/PR events
- Automatic scan triggering
- Repository synchronization
- Event logging and processing

**Endpoints**:
- `POST /functions/v1/webhooks`

**Setup**:
1. Add webhook URL to your repository: `https://your-project.supabase.co/functions/v1/webhooks`
2. Set webhook secret in environment variables
3. Configure events: `push`, `pull_request`, `repository`

### ⚙️ Process Scan (`process-scan`)
**Purpose**: Background processing for large scan operations
- Batch file processing
- Progress tracking
- Error handling and recovery
- Integration with AI analysis

**Endpoints**:
- `POST /functions/v1/process-scan`

**Usage**:
```javascript
const response = await fetch('/functions/v1/process-scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scanId: 'scan-uuid',
    priority: 'normal',
    options: { includeAI: true, analysisTypes: ['security'] }
  })
});
```

## 🛠️ Setup and Deployment

### Prerequisites
1. Supabase CLI installed: `npm install -g supabase`
2. Logged in to Supabase: `supabase login`
3. Project linked: `supabase link --project-ref your-project-ref`

### Environment Variables
Set these in your Supabase Dashboard under Settings > Edge Functions:

```bash
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Deployment
Run the deployment script:
```bash
./scripts/deploy-edge-functions.sh
```

Or deploy individual functions:
```bash
supabase functions deploy api-proxy
supabase functions deploy analyze-code
# ... etc
```

### Local Development
Start the local development environment:
```bash
supabase start
supabase functions serve
```

Functions will be available at:
- `http://localhost:54321/functions/v1/function-name`

## 📊 Database Schema

The edge functions use several database tables:

### Core Tables
- `api_requests` - API usage logging
- `webhook_events` - Webhook event history
- `ai_insights` - AI-generated insights
- `analysis_embeddings` - Vector embeddings for search
- `scan_queue` - Background job queue
- `rate_limits` - Rate limiting data
- `function_logs` - Function execution logs

### Utility Functions
- `check_rate_limit()` - Rate limiting enforcement
- `get_ai_insights_summary()` - AI insights aggregation
- `queue_scan_processing()` - Scan queue management

## 🔒 Security

### Authentication
- Functions use Supabase's built-in authentication
- Service role key for database operations
- Row Level Security (RLS) policies enabled

### Rate Limiting
- IP-based rate limiting implemented
- Configurable limits per resource type
- Automatic cleanup of expired entries

### Input Validation
- All inputs validated and sanitized
- Type checking for TypeScript functions
- Error handling for malformed requests

## 📈 Monitoring

### Logging
- All function executions logged to `function_logs` table
- API usage tracked in `api_requests` table
- Error messages and stack traces captured

### Metrics
- Execution duration tracking
- Memory usage monitoring
- Success/failure rates
- Rate limit violations

### Alerts
Configure alerts in Supabase Dashboard for:
- High error rates
- Rate limit violations
- Unusual API usage patterns
- Long execution times

## 🧪 Testing

### Unit Tests
Each function includes basic error handling and input validation.

### Integration Tests
Test functions locally:
```bash
# Start local environment
supabase start

# Test API proxy
curl -X POST http://localhost:54321/functions/v1/api-proxy \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "test"}]}'
```

### Load Testing
Use tools like `artillery` or `k6` to test function performance under load.

## 🔧 Configuration

### Function Settings
Each function can be configured via environment variables and the `supabase/config.toml` file.

### Resource Limits
- Memory: 512MB (configurable)
- Timeout: 60s (configurable)
- Concurrent executions: 100 (default)

### Cold Start Optimization
- Shared utilities in `_shared/` directory
- Minimal dependencies
- Connection pooling for database operations

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Edge Function Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)

## 🐛 Troubleshooting

### Common Issues

1. **Function timeout**: Increase timeout in config or optimize code
2. **Memory limit**: Reduce memory usage or increase limit
3. **Database connection issues**: Check service role key and network
4. **CORS errors**: Verify CORS headers in responses

### Debug Mode
Enable debug logging by setting `DEBUG=true` in environment variables.

### Logs
View function logs in Supabase Dashboard or via CLI:
```bash
supabase functions logs --function-name function-name
```
