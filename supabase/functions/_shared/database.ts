// Shared database utilities for edge functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

export function createAnonClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )
}

// Rate limiting utility
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  resource: string,
  limit: number,
  windowDuration: string = '1 hour'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    identifier,
    resource,
    limit_value: limit,
    window_duration: windowDuration
  })

  if (error) {
    console.error('Rate limit check error:', error)
    return false
  }

  return data === true
}

// Log function execution
export async function logFunctionExecution(
  supabase: any,
  functionName: string,
  status: 'success' | 'error' | 'timeout',
  duration: number,
  errorMessage?: string,
  metadata?: any
) {
  await supabase
    .from('function_logs')
    .insert({
      function_name: functionName,
      status,
      duration_ms: duration,
      error_message: errorMessage,
      metadata: metadata || {}
    })
}
