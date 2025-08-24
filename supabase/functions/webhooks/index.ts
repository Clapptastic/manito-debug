import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-github-delivery, x-github-event, x-hub-signature-256',
}

interface GitHubWebhookPayload {
  action: string;
  repository: {
    name: string;
    full_name: string;
    html_url: string;
  };
  sender: {
    login: string;
  };
  pull_request?: {
    number: number;
    title: string;
    html_url: string;
    head: {
      sha: string;
      ref: string;
    };
  };
  push?: {
    commits: Array<{
      id: string;
      message: string;
      author: {
        name: string;
        email: string;
      };
    }>;
  };
}

// Verify GitHub webhook signature
async function verifyGitHubSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook payload
    const payload = await req.text();
    const webhookData = JSON.parse(payload) as GitHubWebhookPayload;

    // Get headers
    const githubEvent = req.headers.get('x-github-event');
    const githubDelivery = req.headers.get('x-github-delivery');
    const githubSignature = req.headers.get('x-hub-signature-256');

    // Verify signature if secret is configured
    const webhookSecret = Deno.env.get('GITHUB_WEBHOOK_SECRET');
    if (webhookSecret && githubSignature) {
      const isValid = await verifyGitHubSignature(payload, githubSignature, webhookSecret);
      if (!isValid) {
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }
    }

    // Log webhook event
    await supabase
      .from('webhook_events')
      .insert({
        event_type: githubEvent,
        delivery_id: githubDelivery,
        repository: webhookData.repository?.full_name,
        sender: webhookData.sender?.login,
        payload: webhookData,
        processed_at: new Date().toISOString()
      });

    let response = { message: 'Webhook received', processed: false };

    // Handle different webhook events
    switch (githubEvent) {
      case 'push':
        response = await handlePushEvent(supabase, webhookData);
        break;
      
      case 'pull_request':
        response = await handlePullRequestEvent(supabase, webhookData);
        break;
      
      case 'repository':
        response = await handleRepositoryEvent(supabase, webhookData);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${githubEvent}`);
    }

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
    console.error('Webhook Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Webhook processing failed',
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

async function handlePushEvent(supabase: any, payload: GitHubWebhookPayload) {
  // Find or create project for this repository
  let { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('name', payload.repository.name)
    .single();

  if (!project) {
    const { data: newProject } = await supabase
      .from('projects')
      .insert({
        name: payload.repository.name,
        description: `GitHub repository: ${payload.repository.full_name}`,
        path: payload.repository.html_url,
        framework: 'github'
      })
      .select('id')
      .single();
    
    project = newProject;
  }

  // Trigger automatic scan for significant changes
  if (payload.push?.commits && payload.push.commits.length > 0) {
    const { data: scan } = await supabase
      .from('scans')
      .insert({
        project_id: project.id,
        scan_type: 'webhook_triggered',
        status: 'queued',
        metadata: {
          trigger: 'github_push',
          commits: payload.push.commits.map(c => ({
            id: c.id,
            message: c.message,
            author: c.author.name
          }))
        }
      })
      .select('id')
      .single();

    // Queue the scan for processing
    await supabase
      .from('scan_queue')
      .insert({
        scan_id: scan.id,
        priority: 'normal',
        queued_at: new Date().toISOString()
      });

    return {
      message: 'Push event processed, scan queued',
      processed: true,
      scanId: scan.id,
      commits: payload.push.commits.length
    };
  }

  return { message: 'Push event received, no action needed', processed: false };
}

async function handlePullRequestEvent(supabase: any, payload: GitHubWebhookPayload) {
  if (payload.action === 'opened' || payload.action === 'synchronize') {
    // Find project
    let { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('name', payload.repository.name)
      .single();

    if (!project) {
      const { data: newProject } = await supabase
        .from('projects')
        .insert({
          name: payload.repository.name,
          description: `GitHub repository: ${payload.repository.full_name}`,
          path: payload.repository.html_url,
          framework: 'github'
        })
        .select('id')
        .single();
      
      project = newProject;
    }

    // Create scan for PR
    const { data: scan } = await supabase
      .from('scans')
      .insert({
        project_id: project.id,
        scan_type: 'pull_request',
        status: 'queued',
        metadata: {
          trigger: 'github_pr',
          pr_number: payload.pull_request?.number,
          pr_title: payload.pull_request?.title,
          pr_url: payload.pull_request?.html_url,
          head_sha: payload.pull_request?.head.sha,
          head_ref: payload.pull_request?.head.ref
        }
      })
      .select('id')
      .single();

    return {
      message: 'Pull request scan queued',
      processed: true,
      scanId: scan.id,
      prNumber: payload.pull_request?.number
    };
  }

  return { message: 'Pull request event received, no action needed', processed: false };
}

async function handleRepositoryEvent(supabase: any, payload: GitHubWebhookPayload) {
  if (payload.action === 'created') {
    // Auto-register new repository
    await supabase
      .from('projects')
      .insert({
        name: payload.repository.name,
        description: `GitHub repository: ${payload.repository.full_name}`,
        path: payload.repository.html_url,
        framework: 'github',
        metadata: {
          auto_registered: true,
          github_full_name: payload.repository.full_name
        }
      });

    return {
      message: 'Repository registered',
      processed: true,
      repository: payload.repository.full_name
    };
  }

  return { message: 'Repository event received, no action needed', processed: false };
}
