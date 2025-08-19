#!/usr/bin/env node

import fetch from 'node-fetch';
import enhancedDb from '../server/services/enhancedDatabase.js';

class SystemMonitor {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.metrics = {
      uptime: 0,
      memory: {},
      database: {},
      websocket: {},
      search: {},
      errors: []
    };
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health?detailed=true`);
      const health = await response.json();
      
      this.metrics.uptime = health.uptime;
      this.metrics.memory = health.system?.memory || {};
      this.metrics.database = health.services?.database || {};
      this.metrics.websocket = health.services?.websocket || {};
      this.metrics.search = health.services?.semanticSearch || {};
      
      return health.status === 'ok' || health.status === 'degraded';
    } catch (error) {
      this.metrics.errors.push(`Health check failed: ${error.message}`);
      return false;
    }
  }

  async checkSearch() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/search?q=test&limit=1`);
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      return {
        success: result.success,
        duration,
        results: result.data?.data?.total || 0
      };
    } catch (error) {
      this.metrics.errors.push(`Search check failed: ${error.message}`);
      return { success: false, duration: 0, results: 0 };
    }
  }

  async checkDatabase() {
    try {
      const health = await enhancedDb.health();
      return {
        connected: health.connected,
        poolSize: health.pool?.totalCount || 0,
        cacheHitRate: health.cache?.hitRate || '0%',
        tables: health.tables?.length || 0,
        functions: health.functions?.length || 0
      };
    } catch (error) {
      this.metrics.errors.push(`Database check failed: ${error.message}`);
      return { connected: false, poolSize: 0, cacheHitRate: '0%', tables: 0, functions: 0 };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  async generateReport() {
    console.clear();
    console.log('🔍 Manito System Monitor');
    console.log('========================');
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('');

    // Overall Status
    const healthOk = await this.checkHealth();
    const searchResult = await this.checkSearch();
    const dbStatus = await this.checkDatabase();

    console.log('📊 SYSTEM STATUS');
    console.log('----------------');
    console.log(`🟢 Overall: ${healthOk ? 'HEALTHY' : 'ISSUES DETECTED'}`);
    console.log(`⏱️  Uptime: ${this.formatUptime(this.metrics.uptime)}`);
    console.log(`💾 Memory: ${this.formatBytes(this.metrics.memory.heapUsed || 0)} / ${this.formatBytes(this.metrics.memory.heapTotal || 0)}`);
    console.log('');

    // Database Status
    console.log('🗄️  DATABASE');
    console.log('-----------');
    console.log(`🔗 Connection: ${dbStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}`);
    console.log(`🔌 Pool Size: ${dbStatus.poolSize} connections`);
    console.log(`💾 Cache Hit Rate: ${dbStatus.cacheHitRate}`);
    console.log(`📋 Tables: ${dbStatus.tables}`);
    console.log(`⚙️  Functions: ${dbStatus.functions}`);
    console.log('');

    // Search Status
    console.log('🔍 SEMANTIC SEARCH');
    console.log('------------------');
    console.log(`🔎 Status: ${searchResult.success ? '🟢 Operational' : '🔴 Failed'}`);
    console.log(`⚡ Response Time: ${searchResult.duration}ms`);
    console.log(`📊 Results: ${searchResult.results} items`);
    console.log(`📈 Features: ${this.metrics.search.features ? Object.keys(this.metrics.search.features).length : 0} active`);
    console.log('');

    // WebSocket Status
    console.log('🔌 WEBSOCKET');
    console.log('-------------');
    console.log(`📡 Status: ${this.metrics.websocket.status || 'Unknown'}`);
    console.log(`👥 Connections: ${this.metrics.websocket.connections || 0}`);
    console.log(`⏱️  Uptime: ${this.metrics.websocket.uptime ? this.formatUptime(this.metrics.websocket.uptime) : 'Unknown'}`);
    console.log('');

    // Performance Metrics
    console.log('📈 PERFORMANCE');
    console.log('---------------');
    const memoryUsage = ((this.metrics.memory.heapUsed || 0) / (this.metrics.memory.heapTotal || 1)) * 100;
    console.log(`💾 Memory Usage: ${memoryUsage.toFixed(1)}%`);
    console.log(`🔍 Search Speed: ${searchResult.duration}ms`);
    console.log(`🗄️  DB Pool Utilization: ${dbStatus.poolSize}/20`);
    console.log('');

    // Errors
    if (this.metrics.errors.length > 0) {
      console.log('⚠️  ERRORS');
      console.log('---------');
      this.metrics.errors.slice(-5).forEach(error => {
        console.log(`❌ ${error}`);
      });
      console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('------------------');
    if (memoryUsage > 80) {
      console.log('⚠️  High memory usage detected. Consider restarting the application.');
    }
    if (searchResult.duration > 1000) {
      console.log('⚠️  Slow search response. Check database indexes.');
    }
    if (dbStatus.poolSize === 0) {
      console.log('⚠️  Database pool not configured properly.');
    }
    if (this.metrics.errors.length > 0) {
      console.log('⚠️  Errors detected. Check logs for details.');
    }
    if (memoryUsage < 50 && searchResult.duration < 100 && dbStatus.connected && this.metrics.errors.length === 0) {
      console.log('✅ System is performing optimally!');
    }
    console.log('');

    console.log('🔄 Auto-refresh every 30 seconds... (Press Ctrl+C to exit)');
  }

  start() {
    this.generateReport();
    setInterval(() => this.generateReport(), 30000);
  }
}

// Start monitoring
const monitor = new SystemMonitor();
monitor.start();
