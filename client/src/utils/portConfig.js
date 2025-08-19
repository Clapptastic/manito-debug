/**
 * Client-side Port Configuration Utility
 * Provides consistent port configuration across the client application
 */

class DynamicPortConfig {
  constructor() {
    this.config = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return this.config;
    }

    try {
      // First try to get port configuration from server via proxy
      const response = await fetch('/api/ports');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.config = result.data;
          this.initialized = true;
          console.log('✅ Dynamic port configuration loaded via proxy:', this.config);
          return this.config;
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch via proxy, trying auto-discovery:', error.message);
    }

    // Fallback: Try to auto-discover server port
    try {
      const serverPort = await this.autoDetectServerPort();
      
      // Get port configuration from discovered server
      const response = await fetch(`http://localhost:${serverPort}/api/ports`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.config = result.data;
          this.initialized = true;
          console.log('✅ Dynamic port configuration loaded via auto-discovery:', this.config);
          return this.config;
        }
      }
    } catch (error) {
      console.warn('⚠️  Auto-discovery failed:', error.message);
    }

    // Final fallback to environment variables or defaults
    this.config = {
      server: parseInt(import.meta.env.VITE_SERVER_PORT) || 3000,
      client: parseInt(import.meta.env.VITE_CLIENT_PORT) || 5173,
      websocket: parseInt(import.meta.env.VITE_WEBSOCKET_PORT) || 3000,
      environment: import.meta.env.NODE_ENV || 'development'
    };

    this.initialized = true;
    console.log('✅ Using fallback port configuration:', this.config);
    return this.config;
  }

  getConfig() {
    if (!this.initialized) {
      throw new Error('Port config not initialized. Call initialize() first.');
    }
    return this.config;
  }

  getServerPort() {
    return this.getConfig().server;
  }

  getClientPort() {
    return this.getConfig().client;
  }

  getWebSocketPort() {
    return this.getConfig().websocket;
  }

  getServerUrl() {
    return `http://localhost:${this.getServerPort()}`;
  }

  getClientUrl() {
    return `http://localhost:${this.getClientPort()}`;
  }

  getWebSocketUrl() {
    // WebSocket service is attached to the HTTP server, so use the same port
    return `ws://localhost:${this.getServerPort()}/ws`;
  }

  // Auto-detect server port by trying common ports
  async autoDetectServerPort() {
    const commonPorts = [3000, 3001, 3002, 3003, 3004, 3005, 8080];
    
    for (const port of commonPorts) {
      try {
        const response = await fetch(`http://localhost:${port}/api/health`);
        if (response.ok) {
          console.log(`✅ Auto-detected server on port ${port}`);
          return port;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('Could not auto-detect server port');
  }
}

// Create singleton instance
const dynamicPortConfig = new DynamicPortConfig();

export default dynamicPortConfig;
