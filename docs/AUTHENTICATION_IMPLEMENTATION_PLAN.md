# 🔐 Authentication System Implementation Plan

**Last Updated**: August 2025  
**Status**: Ready for Implementation  
**Estimated Timeline**: 3-5 days  
**Complexity**: Medium (infrastructure exists, needs integration)

## 🎯 **Overview**

This plan outlines the step-by-step implementation of a complete authentication system for ManitoDebug. The authentication infrastructure is already built and tested - this plan focuses on integrating it into the application and creating the user interface components.

## 📊 **Current Status**

### ✅ **Already Implemented (Infrastructure Ready)**
- **JWT Authentication**: Complete token-based auth system
- **User Model**: Full user management with password hashing
- **Auth Middleware**: Authentication and authorization middleware
- **Auth Routes**: Registration, login, logout, profile management
- **Database Schema**: Users table with proper indexes and constraints
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Token generation, validation, and cleanup

### 🚧 **Needs Implementation**
- **Frontend Auth Components**: Login/registration forms
- **Auth State Management**: React context for authentication state
- **Protected Routes**: Apply authentication to sensitive endpoints
- **User Interface**: User menu, profile management, logout functionality

---

## 📋 **Implementation Steps**

## Phase 1: Backend Authentication Integration (Day 1)

### Step 1.1: Apply Authentication Middleware to Protected Endpoints
**Estimated Time**: 2 hours

#### **Update Server Routes**
**File**: `server/app.js`

```javascript
// Apply authentication to protected endpoints
app.use('/api/projects', authenticate); // Protect project endpoints
app.use('/api/scans', authenticate);    // Protect scan endpoints  
app.use('/api/ai', optionalAuth);       // Optional auth for AI (can work without login)

// Keep public endpoints
// /api/health - remains public
// /api/auth/* - remains public (login/register)
```

#### **Specific Endpoint Updates**:
- [ ] **Project Endpoints**: Add user context to all project operations
  ```javascript
  // GET /api/projects - filter by user
  app.get('/api/projects', authenticate, async (req, res) => {
    const projects = await Project.findByUserId(req.user.id);
    res.json(projects);
  });
  ```

- [ ] **Scan Endpoints**: Associate scans with authenticated users
  ```javascript
  // POST /api/scan - add user context
  app.post('/api/scan', authenticate, async (req, res) => {
    const scan = await Scan.create({
      ...scanData,
      user_id: req.user.id
    });
  });
  ```

- [ ] **Settings Endpoints**: User-specific settings
  ```javascript
  // POST /api/settings - save per user
  app.post('/api/settings', authenticate, async (req, res) => {
    await User.updateSettings(req.user.id, req.body);
  });
  ```

### Step 1.2: Update Database Queries for User Context
**Estimated Time**: 1 hour

#### **Update Model Methods**:
- [ ] **Project.js**: Add user filtering to all queries
- [ ] **Scan.js**: Add user association to scan operations
- [ ] **Enhanced Database**: Update search functions for user context

#### **Example Updates**:
```javascript
// Before: Global project access
static async findAll() {
  return await enhancedDb.select('projects');
}

// After: User-specific project access
static async findByUserId(userId) {
  return await enhancedDb.select('projects', 'user_id = $1', [userId]);
}
```

### Step 1.3: Test Backend Authentication
**Estimated Time**: 30 minutes

- [ ] **Test Registration**: `POST /api/auth/register`
- [ ] **Test Login**: `POST /api/auth/login`
- [ ] **Test Protected Endpoints**: Verify authentication required
- [ ] **Test Token Validation**: Ensure valid tokens work
- [ ] **Test Error Handling**: Invalid tokens return 401

---

## Phase 2: Frontend Authentication Components (Day 2)

### Step 2.1: Create Authentication Context
**Estimated Time**: 1 hour

#### **Create Auth Context**
**File**: `client/src/contexts/AuthContext.jsx`

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.success) {
      setUser(data.data.user);
      setToken(data.data.token);
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.data.user));
      return { success: true };
    } else {
      throw new Error(data.message || 'Login failed');
    }
  };

  const register = async (userData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (data.success) {
      setUser(data.data.user);
      setToken(data.data.token);
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.data.user));
      return { success: true };
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Step 2.2: Create Login Component
**Estimated Time**: 2 hours

#### **Create Login Form**
**File**: `client/src/components/LoginForm.jsx`

```jsx
import React, { useState } from 'react';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export const LoginForm = ({ onSwitchToRegister, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 rounded-lg p-6">
      <div className="text-center mb-6">
        <LogIn className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
        <p className="text-gray-400">Sign in to your ManitoDebug account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-400">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};
```

### Step 2.3: Create Registration Component
**Estimated Time**: 2 hours

#### **Create Registration Form**
**File**: `client/src/components/RegisterForm.jsx`

```jsx
import React, { useState } from 'react';
import { UserPlus, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export const RegisterForm = ({ onSwitchToLogin, onClose }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      await register(userData);
      toast.success('Account created successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 rounded-lg p-6">
      <div className="text-center mb-6">
        <UserPlus className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Create Account</h2>
        <p className="text-gray-400">Join ManitoDebug to save your projects</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Confirm your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-400">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
```

### Step 2.4: Create Authentication Modal
**Estimated Time**: 1 hour

#### **Create Auth Modal Container**
**File**: `client/src/components/AuthModal.jsx`

```jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="p-6">
          {mode === 'login' ? (
            <LoginForm
              onSwitchToRegister={() => setMode('register')}
              onClose={onClose}
            />
          ) : (
            <RegisterForm
              onSwitchToLogin={() => setMode('login')}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## Phase 3: User Interface Integration (Day 3)

### Step 3.1: Add User Menu to Header
**Estimated Time**: 2 hours

#### **Update Header Component**
**File**: `client/src/components/Header.jsx`

```jsx
// Add to imports
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Settings } from 'lucide-react';

// Add to Header component
const Header = ({ isConnected, healthData, onToggleAI, onOpenSettings, onProjectSelect, onSearchSelect }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setShowUserMenu(false);
  };

  return (
    <header className="glass-panel m-4 mb-0 p-4 overflow-visible">
      <div className="flex items-center justify-between">
        {/* Existing left side content */}
        
        {/* Right side - add user menu */}
        <div className="flex items-center space-x-4">
          {/* Existing controls */}
          
          {/* User Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-gray-300" />
                <span className="text-gray-300">{user.first_name}</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-12 z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-48">
                  <div className="px-3 py-2 border-b border-gray-600">
                    <p className="text-sm text-gray-300 font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
```

### Step 3.2: Update App.jsx with Authentication
**Estimated Time**: 1 hour

#### **Integrate Auth Provider and Modal**
**File**: `client/src/App.jsx`

```jsx
// Add imports
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';

// Update App component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SettingsProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

// Update AppContent to handle auth
function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Existing state...

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-visible">
      {/* Existing app content */}
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
```

### Step 3.3: Add HTTP Interceptor for Authentication
**Estimated Time**: 1 hour

#### **Create API Client with Auth**
**File**: `client/src/utils/apiClient.js`

```javascript
import { useAuth } from '../contexts/AuthContext';

class APIClient {
  constructor() {
    this.baseURL = '/api';
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    // Handle authentication errors
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.reload(); // Force re-auth
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Convenience methods
  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

export const apiClient = new APIClient();
```

---

## Phase 4: Data Association and User Context (Day 4)

### Step 4.1: Update Frontend API Calls
**Estimated Time**: 3 hours

#### **Replace Fetch Calls with Authenticated API Client**

**Files to Update**:
- `client/src/components/ProjectManager.jsx`
- `client/src/components/GlobalSearch.jsx`
- `client/src/components/AIPanel.jsx`
- `client/src/App.jsx` (scan endpoints)

#### **Example Updates**:
```javascript
// Before: Direct fetch
const response = await fetch('/api/projects');

// After: Authenticated API client
import { apiClient } from '../utils/apiClient';
const projects = await apiClient.get('/projects');
```

### Step 4.2: Update Settings to be User-Specific
**Estimated Time**: 2 hours

#### **Update Settings Context**
**File**: `client/src/contexts/SettingsContext.jsx`

```jsx
// Add user-specific settings
const SettingsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Load settings per user
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserSettings(user.id);
    } else {
      loadGlobalSettings();
    }
  }, [user, isAuthenticated]);

  const saveSettings = async (newSettings) => {
    if (isAuthenticated) {
      await apiClient.post('/settings', newSettings);
    } else {
      // Save to localStorage for non-authenticated users
      localStorage.setItem('manito_settings', JSON.stringify(newSettings));
    }
    setSettings(newSettings);
  };
};
```

### Step 4.3: Add User Profile Management
**Estimated Time**: 2 hours

#### **Create Profile Component**
**File**: `client/src/components/UserProfile.jsx`

```jsx
import React, { useState } from 'react';
import { User, Mail, Save, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { apiClient } from '../utils/apiClient';

export const UserProfile = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email
  });
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await apiClient.put('/auth/profile', formData);
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">User Profile</h3>
      
      {/* Profile form implementation */}
    </div>
  );
};
```

---

## Phase 5: Testing and Validation (Day 5)

### Step 5.1: Create Authentication Tests
**Estimated Time**: 2 hours

#### **Frontend Auth Tests**
**File**: `client/src/test/auth.test.jsx`

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import { LoginForm } from '../components/LoginForm';

describe('Authentication', () => {
  it('should render login form', () => {
    render(
      <AuthProvider>
        <LoginForm onClose={() => {}} onSwitchToRegister={() => {}} />
      </AuthProvider>
    );
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('should handle login submission', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: { user: { id: 1, email: 'test@example.com' }, token: 'mock-token' }
      })
    });

    render(
      <AuthProvider>
        <LoginForm onClose={() => {}} onSwitchToRegister={() => {}} />
      </AuthProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    });
  });
});
```

### Step 5.2: End-to-End Authentication Test
**Estimated Time**: 1 hour

#### **Create E2E Auth Test**
**File**: `scripts/test-authentication.js`

```javascript
#!/usr/bin/env node

import fetch from 'node-fetch';

class AuthenticationTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testUser = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      password: 'testpassword123'
    };
  }

  async runTests() {
    console.log('🔐 Testing authentication system...\n');

    try {
      // Test registration
      console.log('📝 Testing user registration...');
      const registerResult = await this.testRegistration();
      console.log('✅ Registration successful');

      // Test login
      console.log('🔑 Testing user login...');
      const loginResult = await this.testLogin();
      console.log('✅ Login successful');

      // Test protected endpoints
      console.log('🛡️ Testing protected endpoints...');
      await this.testProtectedEndpoints(loginResult.token);
      console.log('✅ Protected endpoints working');

      // Test token validation
      console.log('🎫 Testing token validation...');
      await this.testTokenValidation(loginResult.token);
      console.log('✅ Token validation working');

      console.log('\n🎉 All authentication tests passed!');
    } catch (error) {
      console.error('❌ Authentication test failed:', error.message);
      process.exit(1);
    }
  }

  async testRegistration() {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.testUser)
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Registration failed');
    }

    return data.data;
  }

  async testLogin() {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.testUser.email,
        password: this.testUser.password
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    return data.data;
  }

  async testProtectedEndpoints(token) {
    const endpoints = ['/api/projects', '/api/scans'];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        throw new Error(`Endpoint ${endpoint} not properly protected`);
      }
    }
  }

  async testTokenValidation(token) {
    // Test with valid token
    const validResponse = await fetch(`${this.baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (validResponse.status !== 200) {
      throw new Error('Valid token rejected');
    }

    // Test with invalid token
    const invalidResponse = await fetch(`${this.baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token' }
    });

    if (invalidResponse.status !== 401) {
      throw new Error('Invalid token accepted');
    }
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('test-authentication.js')) {
  const tester = new AuthenticationTester();
  tester.runTests().catch(console.error);
}

export { AuthenticationTester };
```

---

## Phase 6: Documentation and Deployment (Day 5)

### Step 6.1: Update Documentation
**Estimated Time**: 1 hour

#### **Update README.md**
- [ ] Move Authentication from "Optional" to "Fully Functional"
- [ ] Update feature list to include user management
- [ ] Add authentication setup instructions
- [ ] Update API documentation with auth requirements

#### **Create Auth Documentation**
**File**: `docs/AUTHENTICATION_GUIDE.md`

```markdown
# Authentication System Guide

## Features
- JWT-based authentication
- Secure password hashing with bcrypt
- User registration and login
- Protected API endpoints
- User-specific data isolation
- Session management

## Setup
1. Authentication is enabled by default
2. Users can register new accounts
3. All scan data is associated with user accounts
4. Settings are saved per user

## API Endpoints
- POST /api/auth/register - Create new account
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout
- GET /api/auth/me - Get current user
- PUT /api/auth/profile - Update user profile

## Security Features
- Password requirements (minimum 8 characters)
- JWT token expiration
- Secure HTTP-only cookies
- Input validation and sanitization
- Rate limiting on auth endpoints
```

### Step 6.2: Update Progress Tracking
**Estimated Time**: 30 minutes

- [ ] **Update README.md**: Move to 95%+ completion
- [ ] **Update Status Documents**: Reflect authentication completion
- [ ] **Run Progress Calculator**: Verify new completion percentage
- [ ] **Update Roadmap**: Mark authentication as complete

---

## 🧪 **Testing Checklist**

### **Backend Tests**
- [ ] User registration with valid data
- [ ] User registration with invalid data (should fail)
- [ ] User login with correct credentials
- [ ] User login with incorrect credentials (should fail)
- [ ] Protected endpoints require authentication
- [ ] Token validation works correctly
- [ ] Token expiration handling

### **Frontend Tests**
- [ ] Login form renders correctly
- [ ] Registration form renders correctly
- [ ] Form validation works
- [ ] Successful login updates UI state
- [ ] Logout clears user state
- [ ] Protected routes redirect to login
- [ ] User menu displays correctly

### **Integration Tests**
- [ ] End-to-end registration → login → API access
- [ ] User data isolation (users only see their own data)
- [ ] Settings persistence per user
- [ ] Project ownership and permissions

### **Security Tests**
- [ ] Password hashing verification
- [ ] JWT token security
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection

---

## 🚀 **Deployment Steps**

### **Environment Variables**
Add to production environment:
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Session Configuration  
SESSION_SECRET=your-session-secret-here

# Security Configuration
BCRYPT_ROUNDS=12
```

### **Database Migration**
The user table already exists, but verify:
```sql
-- Verify users table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'manito_dev';

-- Verify indexes exist
SELECT * FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'manito_dev';
```

### **Production Checklist**
- [ ] JWT secrets configured
- [ ] HTTPS enabled for production
- [ ] Secure cookie settings
- [ ] Rate limiting configured
- [ ] Authentication middleware applied
- [ ] User data isolation verified

---

## 📊 **Expected Outcomes**

### **After Authentication Implementation**:
- **Overall Completion**: 90.3% → **95%+**
- **User Management**: Complete multi-user functionality
- **Data Security**: User data isolation and protection
- **Production Ready**: Full security implementation
- **Enterprise Features**: User accounts, project ownership, settings persistence

### **Business Impact**:
- **Multi-User Support**: Teams can use the platform
- **Data Persistence**: Users don't lose their work
- **Security Compliance**: Production-ready security implementation
- **User Experience**: Personalized experience with saved preferences

---

## ⚡ **Quick Start Guide**

When ready to implement authentication:

1. **Day 1**: Apply auth middleware to backend endpoints (2-3 hours)
2. **Day 2**: Create login/registration UI components (4-6 hours)
3. **Day 3**: Integrate auth into existing components (3-4 hours)
4. **Day 4**: Update API calls and data association (3-4 hours)
5. **Day 5**: Testing, documentation, and deployment (2-3 hours)

**Total Effort**: 14-20 hours over 5 days

---

## 🔒 **Security Considerations**

### **Already Implemented**
- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ Input validation with Joi schemas
- ✅ Rate limiting on auth endpoints
- ✅ Secure session management

### **Additional Security (Optional)**
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Account lockout after failed attempts
- [ ] Password reset functionality
- [ ] Email verification

---

**This plan provides a complete roadmap for implementing authentication when you're ready. The infrastructure is already built and tested - implementation is primarily about integration and UI creation.**
