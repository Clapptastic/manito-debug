import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fetch from 'node-fetch';

// Dynamic port discovery function
const discoverServerPort = async () => {
  const commonPorts = [3000, 3001, 3002, 3003, 3004, 3005];
  
  for (const port of commonPorts) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, { timeout: 1000 });
      if (response.ok) {
        const data = await response.text();
        if (data.includes('Manito')) {
          console.log(`✅ Discovered Manito server on port ${port}`);
          return port;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  console.log('⚠️  Could not discover server port, using default 3000');
  return 3000;
};

// Dynamic port configuration
const getPortConfig = async () => {
  const clientPort = process.env.CLIENT_PORT || 5173;
  
  // Try to discover the actual server port
  let serverPort = process.env.SERVER_PORT || 3000;
  
  // In development, try to discover the running server
  if (process.env.NODE_ENV !== 'production') {
    try {
      serverPort = await discoverServerPort();
    } catch (error) {
      console.warn('Failed to discover server port, using default:', error.message);
    }
  }
  
  return {
    server: parseInt(serverPort),
    client: parseInt(clientPort)
  };
};

// Create dynamic proxy configuration
const createDynamicProxy = (serverPort) => ({
  '/api': {
    target: `http://localhost:${serverPort}`,
    changeOrigin: true,
    secure: false,
    configure: (proxy, options) => {
      // Add dynamic reconfiguration capability
      proxy.on('error', (err, req, res) => {
        console.log('Proxy error, attempting to reconnect...', err.message);
      });
    }
  },
  '/ws': {
    target: `ws://localhost:${serverPort}`,
    ws: true,
    changeOrigin: true
  }
});

export default defineConfig(async () => {
  const portConfig = await getPortConfig();
  
  console.log(`🔧 Vite configuration:
  Client: ${portConfig.client}
  Server: ${portConfig.server}
  Proxy: /api -> http://localhost:${portConfig.server}`);
  
  return {
    plugins: [react()],
    server: {
      port: portConfig.client,
      host: true,
      open: true, // Automatically open browser
      proxy: createDynamicProxy(portConfig.server)
    },
    define: {
      __PORT_CONFIG__: JSON.stringify(portConfig)
    }
  };
});