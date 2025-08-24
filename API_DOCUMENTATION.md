# ManitoDebug API Documentation

## 📋 **Overview**

The ManitoDebug API provides comprehensive endpoints for code analysis, project management, AI integration, and system monitoring. All endpoints return JSON responses and use standard HTTP status codes.

### **Base URL**
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

### **Authentication**
Currently, the API does not require authentication. Future versions will include JWT-based authentication.

### **Rate Limiting**
- **Default**: 100 requests per minute per IP
- **AI Endpoints**: 10 requests per minute per IP
- **Scan Endpoints**: 5 requests per minute per IP

---

## 🔍 **Core Endpoints**

### **Health & Status**

#### **GET /api/health**
Get basic health status of the application.

**Query Parameters:**
- `detailed` (boolean): Include detailed health information

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-08-24T19:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "ok",
      "connected": true,
      "pool": {
        "total": 10,
        "idle": 8,
        "waiting": 0
      }
    },
    "redis": {
      "status": "ok",
      "connected": true
    },
    "ai": {
      "status": "ok",
      "providers": ["openai", "anthropic", "local"]
    }
  }
}
```

#### **GET /api/health?detailed=true**
Get detailed health information including performance metrics.

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-08-24T19:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "ok",
      "connected": true,
      "pool": {
        "total": 10,
        "idle": 8,
        "waiting": 0
      },
      "cache": {
        "hits": 1500,
        "misses": 200,
        "hitRate": 0.88
      },
      "serverTime": "2025-08-24T19:30:00.000Z",
      "version": "PostgreSQL 15.0",
      "mockMode": false,
      "tables": 25,
      "functions": 12,
      "indexes": 45
    },
    "redis": {
      "status": "ok",
      "connected": true,
      "memory": "2.5MB",
      "keys": 150
    },
    "ai": {
      "status": "ok",
      "providers": ["openai", "anthropic", "local"],
      "requests": 45,
      "errors": 2
    }
  },
  "performance": {
    "memory": {
      "used": "256MB",
      "total": "1GB",
      "percentage": 25
    },
    "cpu": {
      "usage": 15,
      "load": 0.5
    }
  }
}
```

---

## 🔍 **Scanning Endpoints**

### **POST /api/scan**
Scan a codebase for analysis.

**Request Body:**
```json
{
  "path": "/path/to/codebase",
  "options": {
    "patterns": ["**/*.{js,jsx,ts,tsx}"],
    "excludePatterns": ["node_modules/**", "dist/**", "build/**"],
    "maxDepth": 10,
    "includeHidden": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "async": false,
  "data": {
    "id": "scan_123456",
    "timestamp": "2025-08-24T19:30:00.000Z",
    "scanTime": 2500,
    "rootPath": "/path/to/codebase",
    "files": [
      {
        "filePath": "src/app.js",
        "lines": 150,
        "size": 4500,
        "isTypeScript": false,
        "isJSX": false,
        "complexity": 8,
        "imports": ["react", "express"],
        "exports": ["App", "default"],
        "functions": ["App", "main"],
        "variables": ["config", "data"]
      }
    ],
    "dependencies": {
      "src/app.js": ["src/utils/helper.js", "src/components/Header.jsx"],
      "src/utils/helper.js": ["src/lib/validator.js"]
    },
    "metrics": {
      "filesScanned": 45,
      "linesOfCode": 12500,
      "dependencies": 89,
      "conflicts": 3
    },
    "conflicts": [
      {
        "type": "circular_dependency",
        "files": ["src/app.js", "src/utils/helper.js"],
        "severity": "high",
        "description": "Circular dependency detected"
      }
    ],
    "scanId": "scan_123456",
    "projectId": 78,
    "project": {
      "name": "My Project",
      "path": "/path/to/codebase"
    },
    "savedAt": "2025-08-24T19:30:00.000Z"
  }
}
```

### **GET /api/scan/queue**
Get scan queue status and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "running",
    "jobs": {
      "queued": 2,
      "running": 1,
      "completed": 45,
      "failed": 3
    },
    "performance": {
      "averageTime": 2500,
      "totalScans": 51,
      "successRate": 0.94
    }
  }
}
```

### **GET /api/scan/jobs**
Get list of scan jobs.

**Query Parameters:**
- `limit` (number): Number of jobs to return (default: 20)
- `status` (string): Filter by status (queued, running, completed, failed)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "job_123456",
      "status": "completed",
      "path": "/path/to/codebase",
      "createdAt": "2025-08-24T19:25:00.000Z",
      "startedAt": "2025-08-24T19:26:00.000Z",
      "completedAt": "2025-08-24T19:28:30.000Z",
      "duration": 150000,
      "result": {
        "filesScanned": 45,
        "linesOfCode": 12500,
        "conflicts": 3
      }
    }
  ]
}
```

---

## 📁 **Project Management**

### **GET /api/projects**
Get list of all projects.

**Query Parameters:**
- `limit` (number): Number of projects to return (default: 50)
- `offset` (number): Number of projects to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 78,
      "name": "My Project",
      "path": "/path/to/codebase",
      "description": "A sample project for testing",
      "created_at": "2025-08-24T10:00:00.000Z",
      "updated_at": "2025-08-24T19:30:00.000Z",
      "last_scanned_at": "2025-08-24T19:30:00.000Z",
      "scan_status": "completed",
      "scanCount": 5,
      "totalSize": 45000
    }
  ]
}
```

### **POST /api/projects**
Create a new project.

**Request Body:**
```json
{
  "name": "New Project",
  "path": "/path/to/project",
  "description": "Project description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 79,
    "name": "New Project",
    "path": "/path/to/project",
    "description": "Project description",
    "created_at": "2025-08-24T19:35:00.000Z",
    "updated_at": "2025-08-24T19:35:00.000Z"
  }
}
```

### **GET /api/projects/:id**
Get project details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 78,
    "name": "My Project",
    "path": "/path/to/codebase",
    "description": "A sample project for testing",
    "created_at": "2025-08-24T10:00:00.000Z",
    "updated_at": "2025-08-24T19:30:00.000Z",
    "last_scanned_at": "2025-08-24T19:30:00.000Z",
    "scan_status": "completed",
    "latest_scan": {
      "id": "scan_123456",
      "files_scanned": 45,
      "lines_of_code": 12500,
      "conflicts_found": 3,
      "health_score": 85
    }
  }
}
```

### **⚠️ GET /api/projects/:id/scans** (BROKEN)
Get scan history for a project.

**Status**: ⚠️ **BROKEN** - Database schema mismatch error

**Error Response:**
```json
{
  "error": "Failed to get project scans",
  "message": "column \"started_at\" does not exist"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "scan_123456",
      "project_id": 78,
      "status": "completed",
      "started_at": "2025-08-24T19:25:00.000Z",
      "completed_at": "2025-08-24T19:28:30.000Z",
      "files_scanned": 45,
      "lines_of_code": 12500,
      "conflicts_found": 3,
      "results": {
        "files": [...],
        "dependencies": {...},
        "metrics": {...},
        "conflicts": [...]
      }
    }
  ]
}
```

### **DELETE /api/projects/:id**
Delete a project.

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

---

## 🤖 **AI Analysis Endpoints**

### **GET /api/ai/providers**
Get available AI providers and their status.

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "openai",
        "status": "available",
        "model": "gpt-4",
        "capabilities": ["code_review", "bug_detection", "optimization"]
      },
      {
        "name": "anthropic",
        "status": "available",
        "model": "claude-3-sonnet",
        "capabilities": ["code_review", "security_analysis", "documentation"]
      },
      {
        "name": "local",
        "status": "available",
        "model": "rule-based",
        "capabilities": ["basic_analysis", "pattern_detection"]
      }
    ],
    "default": "openai",
    "fallback": "local"
  }
}
```

### **POST /api/ai/send**
Send a message to an AI provider.

**Request Body:**
```json
{
  "message": "Analyze this code for potential issues",
  "provider": "openai",
  "context": {
    "scanResults": {...},
    "fileContent": "...",
    "language": "javascript"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I've analyzed your code and found several potential issues...",
    "provider": "openai",
    "model": "gpt-4",
    "tokens": 150,
    "confidence": 0.95,
    "suggestions": [
      {
        "type": "performance",
        "description": "Consider using memoization for expensive calculations",
        "severity": "medium"
      }
    ]
  }
}
```

### **POST /api/ai/analyze**
Perform comprehensive AI analysis on a codebase.

**Request Body:**
```json
{
  "path": "/path/to/codebase",
  "options": {
    "patterns": ["**/*.{js,jsx,ts,tsx}"],
    "excludePatterns": ["node_modules/**", "dist/**"],
    "analysisTypes": ["security", "performance", "quality"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_123456",
    "timestamp": "2025-08-24T19:30:00.000Z",
    "duration": 5000,
    "files": {
      "scanned": 45,
      "analyzed": 45,
      "issues": 12
    },
    "issues": [
      {
        "type": "security",
        "severity": "high",
        "file": "src/auth.js",
        "line": 25,
        "description": "Potential SQL injection vulnerability",
        "suggestion": "Use parameterized queries"
      }
    ],
    "metrics": {
      "security_score": 85,
      "performance_score": 92,
      "quality_score": 88,
      "overall_score": 88
    },
    "recommendations": [
      {
        "category": "security",
        "priority": "high",
        "description": "Implement input validation",
        "effort": "medium"
      }
    ]
  }
}
```

---

## 🔗 **Code Knowledge Graph (CKG)**

### **GET /api/ckg/projects/:id/dependencies**
Get dependency graph for a project.

**Query Parameters:**
- `maxDepth` (number): Maximum depth for dependency traversal (default: 3)

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": 78,
    "dependencies": [
      {
        "from_node_id": "node_123",
        "to_node_id": "node_456",
        "from_name": "app.js",
        "to_name": "utils.js",
        "from_type": "file",
        "to_type": "file",
        "relationship": "imports",
        "weight": 1.0,
        "depth": 1
      }
    ],
    "count": 45,
    "maxDepth": 3
  }
}
```

### **GET /api/ckg/search**
Search for symbols in the code knowledge graph.

**Query Parameters:**
- `q` (string): Search query
- `projectId` (number): Filter by project ID
- `type` (string): Filter by symbol type (function, class, variable)
- `limit` (number): Number of results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "symbol_123",
        "name": "calculateTotal",
        "type": "function",
        "file": "src/utils.js",
        "line": 15,
        "project": "My Project",
        "references": 5,
        "definition": "function calculateTotal(items) { ... }"
      }
    ],
    "total": 5,
    "query": "calculateTotal"
  }
}
```

---

## 📊 **Metrics & Analytics**

### **GET /api/metrics**
Get system performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "system": {
      "cpu": {
        "usage": 15.5,
        "load": 0.5
      },
      "memory": {
        "used": "256MB",
        "total": "1GB",
        "percentage": 25
      },
      "disk": {
        "used": "2.5GB",
        "total": "10GB",
        "percentage": 25
      }
    },
    "application": {
      "requests": {
        "total": 1500,
        "perMinute": 25,
        "errors": 12
      },
      "scans": {
        "total": 45,
        "active": 1,
        "averageTime": 2500
      },
      "ai": {
        "requests": 89,
        "errors": 3,
        "averageResponseTime": 1200
      }
    }
  }
}
```

### **GET /api/metrics/projects/:id**
Get project-specific metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": 78,
    "scans": {
      "total": 5,
      "lastScan": "2025-08-24T19:30:00.000Z",
      "averageTime": 2500
    },
    "code": {
      "files": 45,
      "lines": 12500,
      "complexity": 8.5,
      "maintainability": 85
    },
    "quality": {
      "score": 88,
      "issues": 12,
      "conflicts": 3
    },
    "trends": {
      "filesGrowth": 5,
      "complexityChange": -0.5,
      "qualityImprovement": 3
    }
  }
}
```

---

## 🔍 **Search Endpoints**

### **GET /api/search**
Search across projects, files, and code.

**Query Parameters:**
- `q` (string): Search query
- `type` (string): Search type (projects, files, code)
- `projectId` (number): Filter by project ID
- `limit` (number): Number of results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "result_123",
        "type": "file",
        "title": "app.js",
        "description": "Main application file",
        "project": "My Project",
        "path": "src/app.js",
        "matches": [
          {
            "line": 15,
            "content": "function calculateTotal(items) {",
            "highlight": "calculateTotal"
          }
        ]
      }
    ],
    "total": 5,
    "query": "calculateTotal"
  }
}
```

---

## 🚨 **Error Responses**

### **Standard Error Format**
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-24T19:30:00.000Z"
}
```

### **Common Error Codes**
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `RATE_LIMITED`: Rate limit exceeded
- `INTERNAL_ERROR`: Server internal error
- `DATABASE_ERROR`: Database operation failed
- `AI_PROVIDER_ERROR`: AI service error

### **HTTP Status Codes**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

---

## 🔧 **WebSocket Events**

### **Connection**
```javascript
const socket = io('http://localhost:3000');
```

### **Available Events**

#### **scan_progress**
Real-time scan progress updates.

```javascript
socket.on('scan_progress', (data) => {
  console.log('Scan progress:', data);
  // {
  //   stage: 'scanning',
  //   progress: 45,
  //   files: 20,
  //   details: 'Processing files...'
  // }
});
```

#### **scan_complete**
Scan completion notification.

```javascript
socket.on('scan_complete', (data) => {
  console.log('Scan completed:', data);
  // {
  //   scanId: 'scan_123456',
  //   projectId: 78,
  //   files: 45,
  //   conflicts: 3,
  //   duration: 2500
  // }
});
```

#### **ai_response**
Real-time AI response streaming.

```javascript
socket.on('ai_response', (data) => {
  console.log('AI response:', data);
  // {
  //   provider: 'openai',
  //   response: 'Partial response...',
  //   complete: false
  // }
});
```

#### **error**
Error notifications.

```javascript
socket.on('error', (data) => {
  console.error('Error:', data);
  // {
  //   type: 'scan_error',
  //   message: 'Scan failed',
  //   details: 'Detailed error information'
  // }
});
```

---

## 📝 **Examples**

### **Complete Scan Workflow**
```javascript
// 1. Start a scan
const scanResponse = await fetch('/api/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: '/path/to/codebase',
    options: {
      patterns: ['**/*.{js,jsx,ts,tsx}'],
      excludePatterns: ['node_modules/**']
    }
  })
});

const scanData = await scanResponse.json();

// 2. Get scan results
const resultsResponse = await fetch(`/api/scans/${scanData.data.scanId}`);
const results = await resultsResponse.json();

// 3. Perform AI analysis
const aiResponse = await fetch('/api/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: '/path/to/codebase',
    options: {
      analysisTypes: ['security', 'performance']
    }
  })
});

const aiData = await aiResponse.json();

// 4. Get dependency graph
const graphResponse = await fetch(`/api/ckg/projects/${scanData.data.projectId}/dependencies`);
const graph = await graphResponse.json();
```

### **Project Management**
```javascript
// 1. Create a project
const createResponse = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My New Project',
    path: '/path/to/project',
    description: 'A new project for analysis'
  })
});

const project = await createResponse.json();

// 2. Get project details
const projectResponse = await fetch(`/api/projects/${project.data.id}`);
const projectData = await projectResponse.json();

// 3. Get project metrics
const metricsResponse = await fetch(`/api/metrics/projects/${project.data.id}`);
const metrics = await metricsResponse.json();
```

---

## 🔮 **Future Endpoints**

### **Planned Endpoints**
- `GET /api/projects/:id/latest-scan` - Get latest scan results for a project
- `GET /api/projects/:id/analysis` - Get analysis data for a project
- `POST /api/projects/:id/export` - Export project data
- `GET /api/users/profile` - Get user profile (when auth is implemented)
- `POST /api/users/profile` - Update user profile (when auth is implemented)

---

**API Documentation** - ManitoDebug REST API Reference
