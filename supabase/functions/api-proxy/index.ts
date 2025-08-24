import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  provider: 'openai' | 'anthropic';
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider, model, messages, temperature = 0.7, max_tokens = 1000 } = await req.json() as AIRequest;

    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `rate_limit_${clientIP}`;
    
    // Initialize Supabase client for logging
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Log the request
    await supabase
      .from('api_requests')
      .insert({
        provider,
        model,
        client_ip: clientIP,
        request_time: new Date().toISOString(),
        message_count: messages.length
      });

    let response;

    if (provider === 'openai') {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      response = await openaiResponse.json();
    } else if (provider === 'anthropic') {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens,
        }),
      });

      if (!anthropicResponse.ok) {
        throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
      }

      response = await anthropicResponse.json();
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Log successful response
    await supabase
      .from('api_requests')
      .update({ 
        response_time: new Date().toISOString(),
        success: true,
        tokens_used: response.usage?.total_tokens || 0
      })
      .eq('client_ip', clientIP)
      .eq('request_time', new Date().toISOString());

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('API Proxy Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})
