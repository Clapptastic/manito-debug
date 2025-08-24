import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CodeAnalysisRequest {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  scanId: string;
  projectId: string;
  analysisType: 'syntax' | 'dependencies' | 'security' | 'full';
}

interface AnalysisResult {
  scanId: string;
  results: {
    syntax: Array<{
      file: string;
      issues: Array<{
        line: number;
        message: string;
        severity: 'error' | 'warning' | 'info';
      }>;
    }>;
    dependencies: Array<{
      name: string;
      version: string;
      type: 'direct' | 'dev' | 'peer';
      vulnerabilities?: Array<{
        severity: string;
        description: string;
      }>;
    }>;
    security: Array<{
      file: string;
      line: number;
      rule: string;
      message: string;
      severity: 'high' | 'medium' | 'low';
    }>;
    metrics: {
      totalFiles: number;
      totalLines: number;
      complexity: number;
      maintainability: number;
    };
  };
}

// Language-specific analyzers
const analyzers = {
  javascript: (content: string, path: string) => {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Basic syntax checks
      if (line.includes('eval(')) {
        issues.push({
          line: index + 1,
          message: 'Use of eval() is potentially dangerous',
          severity: 'warning' as const
        });
      }
      
      if (line.includes('innerHTML') && line.includes('=')) {
        issues.push({
          line: index + 1,
          message: 'Potential XSS vulnerability with innerHTML',
          severity: 'error' as const
        });
      }
      
      // Check for console.log in production code
      if (line.includes('console.log') && !path.includes('test')) {
        issues.push({
          line: index + 1,
          message: 'Console.log found in production code',
          severity: 'info' as const
        });
      }
    });
    
    return issues;
  },
  
  typescript: (content: string, path: string) => {
    // Reuse JavaScript analyzer and add TypeScript-specific checks
    const jsIssues = analyzers.javascript(content, path);
    const issues = [...jsIssues];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for any type usage
      if (line.includes(': any')) {
        issues.push({
          line: index + 1,
          message: 'Avoid using "any" type, use specific types instead',
          severity: 'warning' as const
        });
      }
      
      // Check for non-null assertion
      if (line.includes('!.') || line.includes('!;')) {
        issues.push({
          line: index + 1,
          message: 'Non-null assertion operator used, ensure safety',
          severity: 'info' as const
        });
      }
    });
    
    return issues;
  },
  
  python: (content: string, path: string) => {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for exec/eval usage
      if (line.includes('exec(') || line.includes('eval(')) {
        issues.push({
          line: index + 1,
          message: 'Use of exec/eval is potentially dangerous',
          severity: 'error' as const
        });
      }
      
      // Check for hardcoded secrets
      if (/password|secret|key|token/i.test(line) && /=\s*["'][^"']+["']/.test(line)) {
        issues.push({
          line: index + 1,
          message: 'Potential hardcoded secret detected',
          severity: 'error' as const
        });
      }
    });
    
    return issues;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { files, scanId, projectId, analysisType } = await req.json() as CodeAnalysisRequest;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize analysis result
    const result: AnalysisResult = {
      scanId,
      results: {
        syntax: [],
        dependencies: [],
        security: [],
        metrics: {
          totalFiles: files.length,
          totalLines: 0,
          complexity: 0,
          maintainability: 0
        }
      }
    };

    // Analyze each file
    for (const file of files) {
      const lines = file.content.split('\n');
      result.results.metrics.totalLines += lines.length;

      // Syntax analysis
      if (analysisType === 'syntax' || analysisType === 'full') {
        const analyzer = analyzers[file.language as keyof typeof analyzers];
        if (analyzer) {
          const issues = analyzer(file.content, file.path);
          if (issues.length > 0) {
            result.results.syntax.push({
              file: file.path,
              issues
            });
          }
        }
      }

      // Security analysis
      if (analysisType === 'security' || analysisType === 'full') {
        const securityIssues = [];
        
        // Check for hardcoded secrets
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
          /password\s*[:=]\s*["'][^"']+["']/i,
          /secret\s*[:=]\s*["'][^"']+["']/i,
          /token\s*[:=]\s*["'][^"']+["']/i
        ];

        lines.forEach((line, index) => {
          secretPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              securityIssues.push({
                file: file.path,
                line: index + 1,
                rule: 'hardcoded-secret',
                message: 'Potential hardcoded secret detected',
                severity: 'high' as const
              });
            }
          });
        });

        result.results.security.push(...securityIssues);
      }

      // Dependencies analysis (for package.json files)
      if ((analysisType === 'dependencies' || analysisType === 'full') && 
          file.path.endsWith('package.json')) {
        try {
          const packageJson = JSON.parse(file.content);
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          for (const [name, version] of Object.entries(deps)) {
            result.results.dependencies.push({
              name,
              version: version as string,
              type: packageJson.dependencies?.[name] ? 'direct' : 'dev'
            });
          }
        } catch (error) {
          console.error('Error parsing package.json:', error);
        }
      }
    }

    // Calculate complexity and maintainability scores
    const totalIssues = result.results.syntax.reduce((sum, file) => sum + file.issues.length, 0);
    const securityIssues = result.results.security.length;
    
    result.results.metrics.complexity = Math.min(100, (totalIssues / result.results.metrics.totalFiles) * 10);
    result.results.metrics.maintainability = Math.max(0, 100 - (totalIssues * 2) - (securityIssues * 5));

    // Store results in database
    await supabase
      .from('scans')
      .update({ 
        results: result.results,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', scanId);

    // Store individual issues for detailed analysis
    for (const syntaxFile of result.results.syntax) {
      for (const issue of syntaxFile.issues) {
        await supabase
          .from('conflicts')
          .insert({
            scan_id: scanId,
            type: 'syntax',
            description: issue.message,
            severity: issue.severity,
            file_path: syntaxFile.file,
            line_number: issue.line
          });
      }
    }

    for (const securityIssue of result.results.security) {
      await supabase
        .from('conflicts')
        .insert({
          scan_id: scanId,
          type: 'security',
          description: securityIssue.message,
          severity: securityIssue.severity,
          file_path: securityIssue.file,
          line_number: securityIssue.line
        });
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Code Analysis Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Analysis failed',
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
