import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIAnalysisRequest {
  scanId: string;
  projectId: string;
  codeContext: {
    files: Array<{
      path: string;
      content: string;
      language: string;
    }>;
    dependencies: string[];
    framework?: string;
  };
  analysisType: 'code_review' | 'bug_detection' | 'optimization' | 'security_audit';
  customPrompt?: string;
}

const ANALYSIS_PROMPTS = {
  code_review: `You are an expert code reviewer. Analyze the provided code and provide:
1. Code quality assessment
2. Best practices recommendations
3. Potential improvements
4. Maintainability concerns
Format your response as structured JSON with sections for each aspect.`,

  bug_detection: `You are a bug detection expert. Analyze the code for:
1. Potential runtime errors
2. Logic bugs
3. Edge cases not handled
4. Type-related issues
Provide specific line numbers and fix suggestions.`,

  optimization: `You are a performance optimization expert. Analyze the code for:
1. Performance bottlenecks
2. Memory usage issues
3. Algorithm improvements
4. Caching opportunities
Provide specific optimization recommendations.`,

  security_audit: `You are a security expert. Analyze the code for:
1. Security vulnerabilities
2. Input validation issues
3. Authentication/authorization flaws
4. Data exposure risks
Provide severity levels and mitigation strategies.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { scanId, projectId, codeContext, analysisType, customPrompt } = await req.json() as AIAnalysisRequest;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Prepare code context for AI analysis
    const codeSnippets = codeContext.files.map(file => 
      `// File: ${file.path} (${file.language})\n${file.content}`
    ).join('\n\n---\n\n');

    const contextInfo = `
Project Context:
- Framework: ${codeContext.framework || 'Not specified'}
- Dependencies: ${codeContext.dependencies.join(', ')}
- Total Files: ${codeContext.files.length}

Code to analyze:
${codeSnippets}
`;

    const prompt = customPrompt || ANALYSIS_PROMPTS[analysisType];
    const fullPrompt = `${prompt}\n\n${contextInfo}`;

    // Make AI API call
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software engineer and code analyst. Provide detailed, actionable feedback in JSON format.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = aiResult.choices[0]?.message?.content;

    // Try to parse AI response as JSON, fallback to plain text
    let structuredAnalysis;
    try {
      structuredAnalysis = JSON.parse(analysis);
    } catch {
      structuredAnalysis = {
        type: analysisType,
        analysis: analysis,
        recommendations: [],
        issues: [],
        score: null
      };
    }

    // Store AI analysis results
    const analysisResult = {
      scanId,
      analysisType,
      aiProvider: 'openai',
      model: 'gpt-4-turbo-preview',
      analysis: structuredAnalysis,
      metadata: {
        filesAnalyzed: codeContext.files.length,
        totalLines: codeContext.files.reduce((sum, file) => sum + file.content.split('\n').length, 0),
        dependencies: codeContext.dependencies,
        timestamp: new Date().toISOString()
      }
    };

    // Update scan with AI analysis
    await supabase
      .from('scans')
      .update({ 
        results: {
          ...analysisResult,
          ai_analysis: structuredAnalysis
        },
        metadata: {
          ai_analysis_completed: true,
          ai_analysis_type: analysisType
        }
      })
      .eq('id', scanId);

    // Store AI insights as separate records for querying
    if (structuredAnalysis.recommendations) {
      for (const recommendation of structuredAnalysis.recommendations) {
        await supabase
          .from('ai_insights')
          .insert({
            scan_id: scanId,
            project_id: projectId,
            insight_type: 'recommendation',
            title: recommendation.title || 'AI Recommendation',
            description: recommendation.description || recommendation,
            priority: recommendation.priority || 'medium',
            category: analysisType,
            file_path: recommendation.file_path,
            line_number: recommendation.line_number
          });
      }
    }

    if (structuredAnalysis.issues) {
      for (const issue of structuredAnalysis.issues) {
        await supabase
          .from('ai_insights')
          .insert({
            scan_id: scanId,
            project_id: projectId,
            insight_type: 'issue',
            title: issue.title || 'AI Detected Issue',
            description: issue.description || issue,
            severity: issue.severity || 'medium',
            category: analysisType,
            file_path: issue.file_path,
            line_number: issue.line_number
          });
      }
    }

    // Generate embeddings for semantic search (simplified)
    const embeddingText = `${analysisType} analysis: ${JSON.stringify(structuredAnalysis)}`;
    
    // Store for vector search (you would typically use a proper embedding model here)
    await supabase
      .from('analysis_embeddings')
      .insert({
        scan_id: scanId,
        analysis_type: analysisType,
        content: embeddingText,
        embedding: null, // Would generate actual embeddings in production
        metadata: analysisResult.metadata
      });

    return new Response(
      JSON.stringify(analysisResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'AI analysis failed',
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
