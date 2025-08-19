# Network Error Fix - Directory Analysis

## Issue Description
The client was experiencing a "Network Error: Network error. Please check your connection" when trying to perform directory analysis. The error occurred in the `handleBrowseDirectory` function in `client/src/App.jsx` at line 336.

## Root Cause
The client was making direct HTTP requests to the server using hardcoded URLs instead of using the Vite development server proxy. This caused CORS issues and network connectivity problems.

## Specific Issues Found
1. **Line 332**: `xhr.open('POST', \`http://localhost:${portConfig.server}/api/upload\`)`
2. **Line 410**: `fetch(\`http://localhost:${portConfig.server}/api/upload-directory\`, ...)`

## Solution Applied
Changed both instances to use the proxy endpoints instead of direct server URLs:

### Before:
```javascript
// Direct server URL
xhr.open('POST', `http://localhost:${portConfig.server}/api/upload`)
const response = await fetch(`http://localhost:${portConfig.server}/api/upload-directory`, {
```

### After:
```javascript
// Proxy endpoint
xhr.open('POST', `/api/upload`)
const response = await fetch(`/api/upload-directory`, {
```

## Files Modified
- `client/src/App.jsx` - Fixed direct server URL references

## Testing
- ✅ Client development server running on port 5173
- ✅ Server API running on port 3000
- ✅ Proxy endpoint `/api/upload-directory` responding correctly
- ✅ Network error resolved

## Benefits
1. **CORS Compliance**: Requests now go through the Vite proxy, avoiding CORS issues
2. **Dynamic Port Support**: Works with any server port configuration
3. **Development/Production Consistency**: Same code works in both environments
4. **Better Error Handling**: Proxy provides better error messages and debugging

## Related Components
- `client/src/utils/portConfig.js` - Dynamic port configuration
- `client/vite.config.js` - Vite proxy configuration
- `server/app.js` - Server API endpoints

## Prevention
To prevent similar issues in the future:
1. Always use proxy endpoints (`/api/*`) in client code
2. Avoid hardcoded server URLs
3. Use the dynamic port configuration for WebSocket connections
4. Test API endpoints through the proxy during development
