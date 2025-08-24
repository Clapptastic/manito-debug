# Supabase Edge Functions Integration Guide

## 🎉 Implementation Complete!

Your Supabase Edge Functions are now fully implemented and ready for integration. This guide will help you integrate them into your existing Manito Debug application.

## 📋 What's Been Implemented

### ✅ **Edge Functions Created**
1. **API Proxy** (`/functions/v1/api-proxy`) - Secure AI API calls
2. **Code Analysis** (`/functions/v1/analyze-code`) - Static code analysis
3. **AI Analysis** (`/functions/v1/ai-analysis`) - AI-powered code review
4. **Webhooks** (`/functions/v1/webhooks`) - GitHub webhook handling
5. **Process Scan** (`/functions/v1/process-scan`) - Background job processing

### ✅ **Database Schema**
- 7 new tables for edge function support
- Rate limiting, logging, and monitoring
- AI insights and embeddings storage
- Webhook event tracking

### ✅ **Testing & Deployment**
- Comprehensive test suite
- Automated deployment scripts
- Local development setup
- Documentation and guides

## 🔧 Integration Steps

### 1. **Update Client Code**

Replace direct API calls with edge function calls:

**Before (Direct OpenAI call):**
```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`, // ❌ Exposed API key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: messages
  })
});
```

**After (Edge Function call):**
```javascript
const response = await fetch('/functions/v1/api-proxy', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`, // ✅ Secure
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'openai',
    model: 'gpt-4',
    messages: messages
  })
});
```

### 2. **Update Server Code**

Replace existing scan processing with edge functions:

**Before (Server-side processing):**
```javascript
// server/routes/scan.js
app.post('/api/scan', async (req, res) => {
  // Heavy processing on main server
  const results = await processFiles(files);
  res.json(results);
});
```

**After (Edge Function processing):**
```javascript
// server/routes/scan.js
app.post('/api/scan', async (req, res) => {
  // Queue for background processing
  const scanId = await createScan(req.body);
  
  // Trigger edge function
  await fetch(`${supabaseUrl}/functions/v1/process-scan`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      scanId,
      priority: 'normal',
      options: { includeAI: true }
    })
  });
  
  res.json({ scanId, status: 'queued' });
});
```

### 3. **Environment Variables**

Add these to your production environment:

```bash
# Supabase Edge Functions
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Providers (for edge functions)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Webhooks
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

### 4. **Client Component Updates**

Update your React components to use edge functions:

```jsx
// client/src/hooks/useAIAnalysis.js
import { useSupabase } from './useSupabase';

export function useAIAnalysis() {
  const { supabase } = useSupabase();
  
  const analyzeCode = async (files, analysisType = 'code_review') => {
    const { data, error } = await supabase.functions.invoke('ai-analysis', {
      body: {
        codeContext: { files },
        analysisType
      }
    });
    
    if (error) throw error;
    return data;
  };
  
  return { analyzeCode };
}
```

### 5. **Webhook Integration**

Set up GitHub webhooks to point to your edge function:

1. Go to your GitHub repository settings
2. Add webhook: `https://your-project.supabase.co/functions/v1/webhooks`
3. Set secret to your `GITHUB_WEBHOOK_SECRET`
4. Select events: `push`, `pull_request`

## 🚀 Deployment Commands

### Local Development
```bash
# Setup everything locally
npm run supabase:setup

# Start functions server
npm run supabase:functions:serve

# Test all functions
npm run supabase:functions:test
```

### Production Deployment
```bash
# Deploy to Supabase
npm run supabase:functions:deploy

# Or deploy individually
supabase functions deploy api-proxy
supabase functions deploy analyze-code
# etc...
```

## 📊 Monitoring & Analytics

### Function Logs
View in Supabase Dashboard or query directly:
```sql
SELECT * FROM function_logs 
WHERE function_name = 'api-proxy' 
ORDER BY created_at DESC 
LIMIT 10;
```

### API Usage
```sql
SELECT 
  provider,
  COUNT(*) as requests,
  AVG(tokens_used) as avg_tokens,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful
FROM api_requests 
WHERE request_time > NOW() - INTERVAL '24 hours'
GROUP BY provider;
```

### AI Insights
```sql
SELECT 
  insight_type,
  priority,
  COUNT(*) as count
FROM ai_insights 
GROUP BY insight_type, priority
ORDER BY count DESC;
```

## 🔒 Security Considerations

### ✅ **Implemented Security Features**
- API key management on server-side
- Rate limiting per IP/user
- Input validation and sanitization
- Row Level Security (RLS) policies
- Webhook signature verification

### 🛡️ **Production Security Checklist**
- [ ] Set up proper RLS policies for your use case
- [ ] Configure rate limits appropriate for your traffic
- [ ] Set up monitoring and alerts
- [ ] Regular security audits of function code
- [ ] Rotate API keys periodically

## 🔧 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check `Authorization` header is included
   - Verify Supabase keys are correct
   - Ensure RLS policies allow access

2. **Function Timeout**
   - Increase timeout in `supabase/config.toml`
   - Optimize function code
   - Use background processing for heavy tasks

3. **Database Connection Issues**
   - Check `SUPABASE_SERVICE_ROLE_KEY`
   - Verify database is accessible
   - Check connection limits

### Debug Mode
Enable debug logging:
```bash
# Set environment variable
export DEBUG=true

# View function logs
supabase functions logs --function-name api-proxy
```

## 📈 Performance Optimization

### Best Practices
1. **Connection Pooling**: Use shared database connections
2. **Caching**: Cache frequent database queries
3. **Batch Processing**: Process multiple items together
4. **Async Operations**: Use background jobs for heavy tasks

### Monitoring Metrics
- Function execution time
- Memory usage
- Error rates
- API response times
- Database query performance

## 🎯 Next Steps

1. **Update Client Code**: Replace direct API calls with edge functions
2. **Deploy to Production**: Use deployment script
3. **Set up Monitoring**: Configure alerts and dashboards
4. **Test Thoroughly**: Run integration tests
5. **Update Documentation**: Document new API endpoints

## 📚 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Edge Functions README](./supabase/functions/README.md)
- [Test Scripts](./scripts/test-edge-functions/)
- [Deployment Guide](./scripts/deploy-edge-functions.sh)

---

**🎉 Congratulations! Your edge functions are ready for production use.**

The implementation provides significant improvements in security, performance, and scalability. Your API keys are now secure, processing is distributed, and you have comprehensive monitoring in place.
