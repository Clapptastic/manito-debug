import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScanProcessRequest {
  scanId: string;
  priority?: 'low' | 'normal' | 'high';
  options?: {
    includeAI?: boolean;
    analysisTypes?: string[];
    timeout?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { scanId, priority = 'normal', options = {} } = await req.json() as ScanProcessRequest;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get scan details
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        *,
        projects (*)
      `)
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      throw new Error(`Scan not found: ${scanId}`);
    }

    // Update scan status
    await supabase
      .from('scans')
      .update({ 
        status: 'processing',
        metadata: {
          ...scan.metadata,
          processing_started: new Date().toISOString(),
          priority,
          options
        }
      })
      .eq('id', scanId);

    // Get files for this scan
    const { data: files } = await supabase
      .from('files')
      .select('*')
      .eq('scan_id', scanId);

    if (!files || files.length === 0) {
      throw new Error(`No files found for scan: ${scanId}`);
    }

    const results = {
      scanId,
      startTime: new Date().toISOString(),
      totalFiles: files.length,
      processedFiles: 0,
      errors: [],
      analysis: {
        syntax: [],
        dependencies: [],
        security: [],
        performance: [],
        ai_insights: []
      }
    };

    // Process files in batches to avoid memory issues
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (file) => {
        try {
          // Basic code analysis
          const analysis = await analyzeFile(file);
          
          // Store analysis results
          if (analysis.issues.length > 0) {
            for (const issue of analysis.issues) {
              await supabase
                .from('conflicts')
                .insert({
                  scan_id: scanId,
                  type: issue.type,
                  description: issue.description,
                  severity: issue.severity,
                  file_path: file.path,
                  line_number: issue.line
                });
            }
          }

          results.analysis.syntax.push(...analysis.issues.filter(i => i.type === 'syntax'));
          results.analysis.security.push(...analysis.issues.filter(i => i.type === 'security'));
          results.analysis.performance.push(...analysis.issues.filter(i => i.type === 'performance'));
          results.processedFiles++;

          return { success: true, file: file.path };
        } catch (error) {
          results.errors.push({
            file: file.path,
            error: error.message
          });
          return { success: false, file: file.path, error: error.message };
        }
      });

      await Promise.all(batchPromises);

      // Update progress
      await supabase
        .from('scans')
        .update({
          metadata: {
            ...scan.metadata,
            progress: Math.round((results.processedFiles / results.totalFiles) * 100)
          }
        })
        .eq('id', scanId);
    }

    // AI Analysis (if requested and API keys available)
    if (options.includeAI && Deno.env.get('OPENAI_API_KEY')) {
      try {
        const aiAnalysisResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            scanId,
            projectId: scan.project_id,
            codeContext: {
              files: files.map(f => ({
                path: f.path,
                content: f.content || '',
                language: f.language || 'unknown'
              })),
              dependencies: [], // Would extract from package.json files
              framework: scan.projects?.framework
            },
            analysisType: options.analysisTypes?.[0] || 'code_review'
          })
        });

        if (aiAnalysisResponse.ok) {
          const aiResults = await aiAnalysisResponse.json();
          results.analysis.ai_insights.push(aiResults);
        }
      } catch (aiError) {
        console.error('AI Analysis failed:', aiError);
        results.errors.push({
          component: 'ai_analysis',
          error: aiError.message
        });
      }
    }

    // Calculate final metrics
    const totalIssues = results.analysis.syntax.length + 
                       results.analysis.security.length + 
                       results.analysis.performance.length;

    const metrics = {
      totalFiles: results.totalFiles,
      processedFiles: results.processedFiles,
      totalIssues,
      securityIssues: results.analysis.security.length,
      performanceIssues: results.analysis.performance.length,
      codeQualityScore: Math.max(0, 100 - (totalIssues * 2)),
      completionTime: new Date().toISOString()
    };

    // Update scan with final results
    await supabase
      .from('scans')
      .update({
        status: results.errors.length > 0 ? 'completed_with_errors' : 'completed',
        results: {
          ...results.analysis,
          metrics,
          processing_summary: {
            totalFiles: results.totalFiles,
            processedFiles: results.processedFiles,
            errors: results.errors.length,
            duration: Date.now() - new Date(results.startTime).getTime()
          }
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', scanId);

    // Clean up any temporary data
    await cleanupScanData(supabase, scanId);

    return new Response(
      JSON.stringify({
        scanId,
        status: 'completed',
        metrics,
        summary: {
          filesProcessed: results.processedFiles,
          totalIssues,
          errors: results.errors.length,
          duration: Date.now() - new Date(results.startTime).getTime()
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Scan Processing Error:', error);
    
    // Update scan status to failed
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase
        .from('scans')
        .update({
          status: 'failed',
          results: { error: error.message },
          completed_at: new Date().toISOString()
        })
        .eq('id', (await req.json()).scanId);
    } catch (updateError) {
      console.error('Failed to update scan status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Scan processing failed',
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

async function analyzeFile(file: any) {
  const issues = [];
  const content = file.content || '';
  const lines = content.split('\n');

  // Basic syntax analysis
  lines.forEach((line, index) => {
    // Security checks
    if (line.includes('eval(')) {
      issues.push({
        type: 'security',
        description: 'Use of eval() is potentially dangerous',
        severity: 'high',
        line: index + 1
      });
    }

    if (line.includes('innerHTML') && line.includes('=')) {
      issues.push({
        type: 'security',
        description: 'Potential XSS vulnerability with innerHTML',
        severity: 'high',
        line: index + 1
      });
    }

    // Performance checks
    if (line.includes('document.getElementById') && file.language === 'javascript') {
      issues.push({
        type: 'performance',
        description: 'Consider caching DOM queries',
        severity: 'medium',
        line: index + 1
      });
    }

    // Syntax checks
    if (file.language === 'javascript' || file.language === 'typescript') {
      if (line.includes('console.log') && !file.path.includes('test')) {
        issues.push({
          type: 'syntax',
          description: 'Console.log found in production code',
          severity: 'low',
          line: index + 1
        });
      }
    }
  });

  return { issues };
}

async function cleanupScanData(supabase: any, scanId: string) {
  // Remove any temporary processing data
  // This is a placeholder for cleanup operations
  console.log(`Cleaning up scan data for: ${scanId}`);
}
