#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function openBrowser() {
  const clientPort = process.env.CLIENT_PORT || 5173;
  const serverPort = process.env.SERVER_PORT || 3000;
  
  const clientUrl = `http://localhost:${clientPort}`;
  const serverUrl = `http://localhost:${serverPort}`;
  
  console.log(`🚀 Opening browser to: ${clientUrl}`);
  console.log(`🔧 Server API available at: ${serverUrl}/api/health`);
  
  try {
    // Wait a moment for servers to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Open browser based on platform
    const platform = process.platform;
    let command;
    
    if (platform === 'darwin') {
      command = `open "${clientUrl}"`;
    } else if (platform === 'win32') {
      command = `start "${clientUrl}"`;
    } else {
      command = `xdg-open "${clientUrl}"`;
    }
    
    await execAsync(command);
    console.log('✅ Browser opened successfully!');
  } catch (error) {
    console.error('❌ Failed to open browser:', error.message);
    console.log(`📱 Please manually open: ${clientUrl}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  openBrowser();
}

export default openBrowser;
