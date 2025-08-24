-- Migration 008: Edge Functions Support Tables
-- Creates tables needed for edge functions functionality

-- API requests logging table
CREATE TABLE IF NOT EXISTS api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT,
  client_ip TEXT,
  request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_time TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events logging table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  delivery_id TEXT,
  repository TEXT,
  sender TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status TEXT DEFAULT 'received',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'recommendation', 'issue', 'optimization'
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  category TEXT, -- 'security', 'performance', 'maintainability', etc.
  file_path TEXT,
  line_number INTEGER,
  confidence_score REAL DEFAULT 0.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis embeddings for semantic search
CREATE TABLE IF NOT EXISTS analysis_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT, -- Will store embedding as JSON until vector extension is available
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan queue for background processing
CREATE TABLE IF NOT EXISTS scan_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address, user ID, etc.
  resource TEXT NOT NULL, -- 'api_calls', 'scans', etc.
  count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_duration INTERVAL DEFAULT '1 hour',
  limit_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, resource, window_start)
);

-- Function execution logs
CREATE TABLE IF NOT EXISTS function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  execution_id TEXT,
  status TEXT NOT NULL, -- 'success', 'error', 'timeout'
  duration_ms INTEGER,
  memory_used_mb REAL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_requests_provider ON api_requests(provider);
CREATE INDEX IF NOT EXISTS idx_api_requests_client_ip ON api_requests(client_ip);
CREATE INDEX IF NOT EXISTS idx_api_requests_request_time ON api_requests(request_time);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_repository ON webhook_events(repository);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at);

CREATE INDEX IF NOT EXISTS idx_ai_insights_scan_id ON ai_insights(scan_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_project_id ON ai_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_insight_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);

CREATE INDEX IF NOT EXISTS idx_analysis_embeddings_scan_id ON analysis_embeddings(scan_id);
CREATE INDEX IF NOT EXISTS idx_analysis_embeddings_analysis_type ON analysis_embeddings(analysis_type);

CREATE INDEX IF NOT EXISTS idx_scan_queue_status ON scan_queue(status);
CREATE INDEX IF NOT EXISTS idx_scan_queue_priority ON scan_queue(priority);
CREATE INDEX IF NOT EXISTS idx_scan_queue_queued_at ON scan_queue(queued_at);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_resource ON rate_limits(resource);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_function_logs_function_name ON function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_function_logs_status ON function_logs(status);
CREATE INDEX IF NOT EXISTS idx_function_logs_created_at ON function_logs(created_at);

-- Enable Row Level Security
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (should be restricted in production)
CREATE POLICY "Allow service role full access to api_requests" ON api_requests FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to webhook_events" ON webhook_events FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to ai_insights" ON ai_insights FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to analysis_embeddings" ON analysis_embeddings FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to scan_queue" ON scan_queue FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to rate_limits" ON rate_limits FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Allow service role full access to function_logs" ON function_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read their own ai_insights" ON ai_insights FOR SELECT USING (true);
CREATE POLICY "Users can read their own analysis_embeddings" ON analysis_embeddings FOR SELECT USING (true);

-- Utility functions for edge functions
CREATE OR REPLACE FUNCTION check_rate_limit(
  identifier TEXT,
  resource TEXT,
  limit_value INTEGER,
  window_duration INTERVAL DEFAULT '1 hour'
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - window_duration;
  
  -- Clean up old entries
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - window_duration;
  
  -- Get current count
  SELECT COALESCE(count, 0) INTO current_count
  FROM rate_limits
  WHERE rate_limits.identifier = check_rate_limit.identifier
    AND rate_limits.resource = check_rate_limit.resource
    AND rate_limits.window_start >= window_start;
  
  -- Check if limit exceeded
  IF current_count >= limit_value THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO rate_limits (identifier, resource, count, limit_value, window_duration)
  VALUES (identifier, resource, 1, limit_value, window_duration)
  ON CONFLICT (identifier, resource, window_start) 
  DO UPDATE SET 
    count = rate_limits.count + 1,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get AI insights summary
CREATE OR REPLACE FUNCTION get_ai_insights_summary(scan_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_insights', COUNT(*),
    'by_type', json_object_agg(insight_type, type_count),
    'by_priority', json_object_agg(priority, priority_count),
    'avg_confidence', ROUND(AVG(confidence_score)::numeric, 2)
  ) INTO result
  FROM (
    SELECT 
      insight_type,
      priority,
      confidence_score,
      COUNT(*) OVER (PARTITION BY insight_type) as type_count,
      COUNT(*) OVER (PARTITION BY priority) as priority_count
    FROM ai_insights 
    WHERE scan_id = scan_id_param
  ) subq;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql;

-- Function to queue scan for processing
CREATE OR REPLACE FUNCTION queue_scan_processing(
  scan_id_param UUID,
  priority_param TEXT DEFAULT 'normal'
) RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO scan_queue (scan_id, priority)
  VALUES (scan_id_param, priority_param)
  RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rate_limits_updated_at 
  BEFORE UPDATE ON rate_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
