#!/usr/bin/env node

/**
 * Production Health Check Script
 * Comprehensive health monitoring for production deployment
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

class ProductionHealthChecker {
  constructor() {
    this.baseUrl = process.env.MANITO_BASE_URL || 'http://localhost:3000';
    this.timeout = 10000; // 10 seconds
    this.results = {
      overall: 'unknown',
      timestamp: new Date().toISOString(),
      checks: {},
      metrics: {},
      issues: []
    };
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck() {
    console.log('🏥 Running production health check...\n');

    const checks = [
      { name: 'API Health', fn: this.checkAPIHealth.bind(this) },
      { name: 'Database Connection', fn: this.checkDatabaseHealth.bind(this) },
      { name: 'WebSocket Service', fn: this.checkWebSocketHealth.bind(this) },
      { name: 'AI Service', fn: this.checkAIServiceHealth.bind(this) },
      { name: 'File System', fn: this.checkFileSystemHealth.bind(this) },
      { name: 'Performance', fn: this.checkPerformance.bind(this) },
      { name: 'Security', fn: this.checkSecurity.bind(this) }
    ];

    let passedChecks = 0;
    
    for (const check of checks) {
      try {
        console.log(`🔍 Checking ${check.name}...`);
        const result = await check.fn();
        this.results.checks[check.name] = result;
        
        if (result.status === 'ok') {
          console.log(`✅ ${check.name}: ${result.message}`);
          passedChecks++;
        } else {
          console.log(`❌ ${check.name}: ${result.message}`);
          this.results.issues.push(`${check.name}: ${result.message}`);
        }
      } catch (error) {
        console.log(`💥 ${check.name}: ${error.message}`);
        this.results.checks[check.name] = {
          status: 'error',
          message: error.message,
          error: true
        };
        this.results.issues.push(`${check.name}: ${error.message}`);
      }
    }

    // Calculate overall health
    const healthPercentage = (passedChecks / checks.length) * 100;
    this.results.overall = healthPercentage >= 90 ? 'healthy' : 
                          healthPercentage >= 70 ? 'degraded' : 'unhealthy';
    this.results.metrics.healthPercentage = healthPercentage;
    this.results.metrics.passedChecks = passedChecks;
    this.results.metrics.totalChecks = checks.length;

    return this.results;
  }

  /**
   * Check API health endpoint
   */
  async checkAPIHealth() {
    const response = await fetch(`${this.baseUrl}/api/health?detailed=true`, {
      timeout: this.timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      status: data.status === 'ok' ? 'ok' : 'error',
      message: data.message || 'API health check passed',
      data: {
        uptime: data.uptime,
        version: data.version,
        environment: data.environment
      }
    };
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    const response = await fetch(`${this.baseUrl}/api/health?detailed=true`, {
      timeout: this.timeout
    });

    const data = await response.json();
    const dbHealth = data.services?.database;

    if (!dbHealth) {
      throw new Error('Database health data not available');
    }

    if (!dbHealth.connected) {
      return {
        status: 'error',
        message: 'Database not connected',
        data: dbHealth
      };
    }

    if (dbHealth.mockMode) {
      return {
        status: 'warning',
        message: 'Database running in mock mode',
        data: dbHealth
      };
    }

    return {
      status: 'ok',
      message: `Database connected (${dbHealth.tables} tables, ${dbHealth.functions} functions)`,
      data: dbHealth
    };
  }

  /**
   * Check WebSocket service
   */
  async checkWebSocketHealth() {
    const response = await fetch(`${this.baseUrl}/api/health?detailed=true`, {
      timeout: this.timeout
    });

    const data = await response.json();
    const wsHealth = data.services?.websocket;

    if (!wsHealth) {
      throw new Error('WebSocket health data not available');
    }

    return {
      status: wsHealth.status === 'ok' ? 'ok' : 'error',
      message: `WebSocket service ${wsHealth.status} (${wsHealth.connections || 0} connections)`,
      data: wsHealth
    };
  }

  /**
   * Check AI service health
   */
  async checkAIServiceHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/providers`, {
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`AI providers endpoint failed: ${response.status}`);
      }

      const providers = await response.json();
      const availableProviders = providers.filter(p => p.available);

      if (availableProviders.length === 0) {
        return {
          status: 'warning',
          message: 'No AI providers configured (local fallback only)',
          data: { providers }
        };
      }

      return {
        status: 'ok',
        message: `AI service ready (${availableProviders.length} providers available)`,
        data: { providers: availableProviders }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `AI service check failed: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Check file system health
   */
  async checkFileSystemHealth() {
    try {
      // Check if required directories exist
      const requiredDirs = ['uploads', 'logs'];
      const checks = [];

      for (const dir of requiredDirs) {
        try {
          await fs.access(dir);
          checks.push({ dir, exists: true });
        } catch {
          checks.push({ dir, exists: false });
        }
      }

      const missingDirs = checks.filter(c => !c.exists);
      
      if (missingDirs.length > 0) {
        return {
          status: 'warning',
          message: `Missing directories: ${missingDirs.map(d => d.dir).join(', ')}`,
          data: { checks }
        };
      }

      return {
        status: 'ok',
        message: 'File system healthy',
        data: { checks }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `File system check failed: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformance() {
    const startTime = Date.now();
    
    try {
      // Test API response time
      const response = await fetch(`${this.baseUrl}/api/health`, {
        timeout: this.timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`Performance test failed: ${response.status}`);
      }

      let status = 'ok';
      let message = `API response time: ${responseTime}ms`;

      if (responseTime > 2000) {
        status = 'error';
        message += ' (too slow)';
      } else if (responseTime > 1000) {
        status = 'warning';
        message += ' (slow)';
      } else {
        message += ' (good)';
      }

      return {
        status,
        message,
        data: {
          responseTime,
          threshold: {
            good: 1000,
            warning: 2000
          }
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Performance check failed: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Check security configuration
   */
  async checkSecurity() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health?detailed=true`, {
        timeout: this.timeout
      });

      const data = await response.json();
      const securityChecks = [];

      // Check if running in production mode
      if (data.environment !== 'production') {
        securityChecks.push('Not running in production mode');
      }

      // Check for security headers (basic check)
      const securityHeaders = ['x-content-type-options', 'x-frame-options', 'x-xss-protection'];
      const missingHeaders = securityHeaders.filter(header => !response.headers.get(header));
      
      if (missingHeaders.length > 0) {
        securityChecks.push(`Missing security headers: ${missingHeaders.join(', ')}`);
      }

      if (securityChecks.length > 0) {
        return {
          status: 'warning',
          message: `Security issues found: ${securityChecks.length}`,
          data: { issues: securityChecks }
        };
      }

      return {
        status: 'ok',
        message: 'Security configuration looks good',
        data: { environment: data.environment }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Security check failed: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Generate health report
   */
  generateReport() {
    console.log('\n📊 Production Health Report');
    console.log('═'.repeat(50));
    console.log(`Overall Status: ${this.getStatusEmoji()} ${this.results.overall.toUpperCase()}`);
    console.log(`Health Score: ${this.results.metrics.healthPercentage.toFixed(1)}% (${this.results.metrics.passedChecks}/${this.results.metrics.totalChecks})`);
    console.log(`Timestamp: ${this.results.timestamp}\n`);

    if (this.results.issues.length > 0) {
      console.log('🚨 Issues Found:');
      this.results.issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('');
    }

    console.log('📋 Check Details:');
    for (const [name, result] of Object.entries(this.results.checks)) {
      const emoji = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${emoji} ${name}: ${result.message}`);
    }

    return this.results;
  }

  getStatusEmoji() {
    switch (this.results.overall) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * Save report to file
   */
  async saveReport() {
    const reportPath = 'health-report.json';
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Health report saved to: ${reportPath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const checker = new ProductionHealthChecker();
  
  try {
    await checker.runHealthCheck();
    const report = checker.generateReport();
    await checker.saveReport();

    // Exit with appropriate code
    const exitCode = report.overall === 'healthy' ? 0 : 
                    report.overall === 'degraded' ? 1 : 2;
    
    process.exit(exitCode);
  } catch (error) {
    console.error('💥 Health check failed:', error.message);
    process.exit(3);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('production-health-check.js')) {
  main().catch(console.error);
}

export { ProductionHealthChecker };
