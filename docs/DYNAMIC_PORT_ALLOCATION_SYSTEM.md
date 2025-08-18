# Dynamic Port Allocation System

## 🎯 **Overview**

The ManitoDebug application features a comprehensive dynamic port allocation system that automatically manages port assignments across all services, preventing conflicts and ensuring seamless communication between components.

## ✅ **Current Status: FULLY OPERATIONAL**

All components of the dynamic port allocation system are working correctly:

- ✅ **Server Port Management**: Intelligent port discovery and assignment
- ✅ **Client-Server Coordination**: Automatic detection of running services
- ✅ **WebSocket Communication**: Real-time updates with proper port inheritance
- ✅ **CLI Integration**: Dynamic server discovery across port ranges
- ✅ **Conflict Resolution**: Automatic handling of port conflicts

## 🏗️ **Architecture**

### **Core Components**

#### 1. **Server-Side Port Manager** (`server/config/ports.js`)
```javascript
class DynamicPortManager extends EventEmitter {
  // Service definitions with intelligent port preferences
  serviceDefinitions = {
    server: { preferred: [3000, 3001, 3002], conflicts: ['client'] },
    client: { preferred: [5173, 5174, 5175], conflicts: ['server'] },
    websocket: { inheritFrom: 'server' },
    database: { preferred: [5432, 5433, 5434] },
    redis: { preferred: [6379, 6380, 6381] },
    monitoring: { preferred: [9090, 9091, 9092] }
  }
}
```

**Key Features:**
- **Intelligent Port Discovery**: Scans and assigns optimal ports
- **Service Detection**: Automatically detects running Vite servers
- **Health Monitoring**: Continuous port availability checks
- **Conflict Resolution**: Multiple strategies (minimal, aggressive, conservative)

#### 2. **Client-Side Port Configuration** (`client/src/utils/portConfig.js`)
```javascript
class DynamicPortConfig {
  async initialize() {
    // Fetch port configuration from server API
    const response = await fetch('/api/ports');
    // Fallback to environment variables or defaults
  }
}
```

**Key Features:**
- **Dynamic Discovery**: Fetches live port configuration from server
- **Fallback Handling**: Uses sensible defaults if server unavailable
- **Vite Integration**: Seamless proxy configuration for API calls

#### 3. **CLI Port Discovery** (`cli/index.js`)
```javascript
async function detectServerPort() {
  const commonPorts = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
  
  for (const port of commonPorts) {
    // Health check and Manito server verification
    const response = await fetch(`http://localhost:${port}/api/health`);
    if (response.ok && response.text().includes('Manito')) {
      return port;
    }
  }
}
```

**Key Features:**
- **Auto-Discovery**: Scans common ports to find running server
- **Health Validation**: Verifies server health before connecting
- **Port Range Scanning**: Systematic port checking with fallbacks

## 📊 **Current Port Configuration**

| Service | Port | Status | Strategy | Description |
|---------|------|--------|----------|-------------|
| **🖥️ Server** | 3000 | ✅ Running | Preferred | Main API server |
| **🌐 Client** | 5173 | ✅ Running | Detected | Vite development server |
| **🔌 WebSocket** | 3000 | ✅ Running | Inherited | Real-time communication |
| **🗄️ Database** | 5432 | ✅ Connected | Standard | PostgreSQL database |
| **📦 Redis** | 6379 | ✅ Connected | Standard | Cache and sessions |
| **📊 Monitoring** | 9091 | ✅ Available | Fallback | Prometheus metrics |

## 🔧 **API Endpoints**

### **Port Configuration API**
```bash
GET /api/ports
```

**Response:**
```json
{
  "success": true,
  "data": {
    "server": 3000,
    "client": 5173,
    "websocket": 3000,
    "environment": "development",
    "urls": {
      "server": "http://localhost:3000",
      "client": "http://localhost:5173",
      "websocket": "ws://localhost:3000"
    }
  }
}
```

### **Health Check API**
```bash
GET /api/health?detailed=true
```

**WebSocket Status:**
```json
{
  "services": {
    "websocket": {
      "status": "healthy",
      "connections": 4,
      "uptime": 177.630381583,
      "timestamp": "2025-08-18T15:01:00.802Z"
    }
  }
}
```

## 🚀 **Usage Examples**

### **Starting the Full Stack**
```bash
npm run start:fullstack
```
- Server automatically detects available ports
- Client (Vite) starts on preferred port 5173
- WebSocket inherits server port for seamless communication
- All services coordinate automatically

### **CLI Usage**
```bash
# CLI automatically discovers server port
manito status
# Output: ✅ ManitoDebug server detected on port 3000

manito scan ./src
# Automatically connects to detected server
```

### **Development Workflow**
```bash
# Start development environment
npm run dev

# Services automatically coordinate:
# - Server: Port 3000 (or next available)
# - Client: Port 5173 (or next available)
# - WebSocket: Inherits server port
# - Database: Standard port 5432
# - Redis: Standard port 6379
```

## 🛡️ **Conflict Resolution**

### **Automatic Port Detection**
The system automatically detects running services and adapts:

1. **Vite Server Detection**: Identifies running Vite development servers
2. **Port Health Checks**: Validates port availability before assignment
3. **Service Coordination**: Updates all components with correct port information
4. **Fallback Strategies**: Multiple preferred ports with intelligent fallbacks

### **Conflict Resolution Strategies**

#### **Minimal Strategy** (Default)
- Only moves conflicting services when necessary
- Preserves existing service ports where possible
- Minimal disruption to running services

#### **Aggressive Strategy**
- Prioritizes the requesting service
- Forces reassignment of conflicting services
- Used for critical service startup

#### **Conservative Strategy**
- Finds alternative ports for new services
- Never moves existing services
- Used for non-critical service additions

## 🔍 **Monitoring & Debugging**

### **Port Status Monitoring**
```bash
# Check current port assignments
curl http://localhost:3000/api/ports | jq .

# Detailed health check
curl "http://localhost:3000/api/health?detailed=true" | jq .services
```

### **CLI Status Check**
```bash
manito status
# Shows:
# - Server detection status
# - Port discovery results
# - Health check results
# - Environment information
```

### **Log Output Examples**
```
🔧 Initializing dynamic port manager for development environment...
✅ Detected Vite client server on port 5173
✅ server: port 3000 (preferred)
✅ client: port 5173 (detected_running)
✅ websocket: port 3000 (inherited)
✅ Dynamic port configuration complete
```

## 🌟 **Benefits**

### **Developer Experience**
- **Zero Configuration**: Automatic port discovery eliminates manual setup
- **Conflict-Free**: Intelligent conflict resolution prevents port collisions
- **Transparent**: Clear logging and status reporting throughout
- **CLI Integration**: Seamless command-line tool connectivity

### **Production Ready**
- **Scalable**: Supports multiple environments and deployment scenarios
- **Robust**: Comprehensive error handling and fallback mechanisms
- **Performant**: Minimal overhead with efficient port scanning
- **Reliable**: Health monitoring ensures service availability

### **Maintenance**
- **Self-Healing**: Automatic port reassignment on conflicts
- **Monitoring**: Built-in health checks and status reporting
- **Debugging**: Comprehensive logging for troubleshooting
- **Flexible**: Configurable strategies for different use cases

## 🔮 **Future Enhancements**

- **Docker Integration**: Enhanced container port mapping
- **Load Balancing**: Multi-instance port coordination
- **Service Discovery**: Advanced service mesh integration
- **Metrics Collection**: Port usage analytics and optimization

---

**Status**: ✅ **FULLY OPERATIONAL**  
**Last Updated**: 2025-08-18  
**Version**: 1.0.0
