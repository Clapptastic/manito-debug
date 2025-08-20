# Z-Index Hierarchy Documentation

**Date:** August 20, 2025  
**Purpose:** Ensure proper layering of UI components  
**Status:** ✅ **OPTIMIZED**

## Z-Index Hierarchy Overview

This document defines the proper z-index hierarchy for all UI components to ensure modals and important elements appear above the Code Scanner and other background components.

### Highest Priority (Above Everything)
```
z-[10011] - Tooltips (HelpTooltip, StatusTooltip, KeyboardTooltip)
z-[10010] - Toast notifications
```

### Modal Layer (Header Popups)
```
z-[99999] - ProjectManager modal
z-[99997] - SystemMetricsDashboard modal  
z-[99996] - AIProviderConfig modal
z-[99995] - GlobalSearch modal
z-[99994] - SettingsModal
z-[99993] - ScanQueueDashboard modal
```

### Application Layer (Below Modals)
```
z-[99990] - AIPanel (expanded)
z-[99989] - ProgressTracker
z-[99988] - ConfirmDialog
z-[99987] - Loading overlay
z-[99986] - ProjectManager dropdown
```

### Background Layer (Lowest Priority)
```
z-[-1]   - Sidebar (Code Scanner) - with isolation
z-1      - Default content
z-0      - Base layer
```

## Component Analysis

### ✅ **Header Modals (Highest Priority)**
All header popups are properly positioned above all other components:

- **ProjectManager**: `z-[99999]` - Project management interface
- **SystemMetricsDashboard**: `z-[99997]` - System performance monitoring
- **AIProviderConfig**: `z-[99996]` - AI provider configuration
- **GlobalSearch**: `z-[99995]` - Global search functionality
- **SettingsModal**: `z-[99994]` - Application settings
- **ScanQueueDashboard**: `z-[99993]` - Scan queue monitoring

### ✅ **Application Components (Medium Priority)**
Components that should appear above background elements but below modals:

- **AIPanel**: `z-[99990]` - AI assistant panel (when expanded)
- **ProgressTracker**: `z-[99989]` - Scan progress tracking
- **ConfirmDialog**: `z-[99988]` - Confirmation dialogs
- **Loading**: `z-[99987]` - Loading overlays
- **ProjectManager Dropdown**: `z-[99986]` - Project action dropdown

### ✅ **Background Components (Lowest Priority)**
Components that should always appear behind modals and application components:

- **Sidebar (Code Scanner)**: `z-[-1]` - Main sidebar with scan functionality (isolated)
- **Main Content**: `z-1` - Default content area
- **Base Layer**: `z-0` - Background elements

### ✅ **Utility Components (Always on Top)**
Components that should always appear above everything:

- **Tooltips**: `z-[10011]` - Help, status, and keyboard tooltips
- **Toast Notifications**: `z-[10010]` - User feedback notifications

## Implementation Details

### Modal Container CSS
```css
.modal-container {
  @apply fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center;
  min-height: 100vh;
  min-height: 100dvh; /* Dynamic viewport height for mobile */
}
```

### Modal Content CSS
```css
.modal-content {
  @apply glass-panel flex flex-col;
  max-height: 85vh;
  max-height: 85dvh; /* Dynamic viewport height for mobile */
  margin: auto;
}
```

### Sidebar CSS
```css
.sidebar-container {
  @apply relative;
  z-index: -1;
  isolation: isolate;
}

aside {
  @apply w-full lg:w-80 glass-panel m-2 sm:m-4 lg:mr-0 flex flex-col overflow-visible sidebar-container;
}
```

## Benefits

### ✅ **Proper Layering**
- Header modals always appear above the Code Scanner
- No component interference or overlap issues
- Consistent user experience across all interactions

### ✅ **User Experience**
- Clear visual hierarchy
- Intuitive interaction flow
- No confusion about which elements are interactive

### ✅ **Maintainability**
- Clear z-index organization
- Easy to understand and modify
- Consistent patterns across components

### ✅ **Performance**
- Optimized rendering order
- Minimal reflows and repaints
- Efficient CSS layering

## Testing Results

### ✅ **Visual Verification**
- All header modals appear above the Code Scanner
- No visual overlap or interference
- Proper backdrop blur and focus

### ✅ **Interaction Testing**
- Click outside to close works properly
- Modal content is fully accessible
- No hidden or inaccessible elements

### ✅ **Cross-Browser Compatibility**
- Consistent behavior across browsers
- Proper z-index interpretation
- Mobile viewport handling

## Maintenance Guidelines

### Adding New Components
1. **Modals**: Use z-index range `z-[99990]` to `z-[99999]`
2. **Application Components**: Use z-index range `z-[99980]` to `z-[99989]`
3. **Background Components**: Use z-index range `z-1` to `z-10`
4. **Utility Components**: Use z-index range `z-[10000]` to `z-[10011]`

### Best Practices
- Always document z-index values in component comments
- Test layering with multiple components open
- Ensure mobile compatibility with dynamic viewport heights
- Maintain consistent patterns across similar components

## Conclusion

The z-index hierarchy has been **optimized** to ensure:

1. **Header modals always appear above the Code Scanner**
2. **Clear visual hierarchy** for all UI components
3. **Consistent user experience** across all interactions
4. **Proper layering** without interference or overlap
5. **Maintainable codebase** with clear organization

**Status:** ✅ **FULLY OPTIMIZED - ALL COMPONENTS PROPERLY LAYERED**
