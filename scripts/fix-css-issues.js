#!/usr/bin/env node

/**
 * CSS Issues Fix Script
 * Automatically fixes identified CSS issues in the Manito Debug application
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSSFixer {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.clientDir = path.join(this.rootDir, 'client');
    this.cssFile = path.join(this.clientDir, 'src', 'index.css');
    this.tailwindConfig = path.join(this.clientDir, 'tailwind.config.js');
    this.postcssConfig = path.join(this.clientDir, 'postcss.config.js');
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async fixZIndexScale() {
    await this.log('Fixing z-index scale...');
    
    const zIndexCSS = `
/* Z-Index Scale - Standardized hierarchy */
:root {
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-toast: 1080;
}

/* Z-Index utility classes */
.z-dropdown { z-index: var(--z-dropdown) !important; }
.z-sticky { z-index: var(--z-sticky) !important; }
.z-fixed { z-index: var(--z-fixed) !important; }
.z-modal-backdrop { z-index: var(--z-modal-backdrop) !important; }
.z-modal { z-index: var(--z-modal) !important; }
.z-popover { z-index: var(--z-popover) !important; }
.z-tooltip { z-index: var(--z-tooltip) !important; }
.z-toast { z-index: var(--z-toast) !important; }
`;

    // Read current CSS file
    let cssContent = fs.readFileSync(this.cssFile, 'utf8');
    
    // Add z-index scale after @tailwind imports
    const tailwindImports = '@tailwind base;\n@tailwind components;\n@tailwind utilities;';
    const updatedImports = tailwindImports + '\n\n' + zIndexCSS;
    
    cssContent = cssContent.replace(tailwindImports, updatedImports);
    
    // Write updated CSS
    fs.writeFileSync(this.cssFile, cssContent);
    await this.log('Z-index scale added to CSS', 'success');
  }

  async fixModalZIndexes() {
    await this.log('Fixing modal z-index values...');
    
    const componentFiles = [
      'src/components/ProjectManager.jsx',
      'src/components/AIProviderConfig.jsx',
      'src/components/SettingsModal.jsx',
      'src/components/GlobalSearch.jsx',
      'src/components/ScanQueueDashboard.jsx',
      'src/components/SystemMetricsDashboard.jsx',
      'src/components/AIPanel.jsx',
      'src/components/ProgressTracker.jsx',
      'src/components/ConfirmDialog.jsx',
      'src/components/Loading.jsx',
      'src/components/Tooltip.jsx',
      'src/components/Toast.jsx'
    ];

    const zIndexMappings = {
      'z-[99999]': 'z-modal',
      'z-[99997]': 'z-modal',
      'z-[99996]': 'z-modal',
      'z-[99995]': 'z-modal',
      'z-[99994]': 'z-modal',
      'z-[99993]': 'z-modal',
      'z-[99990]': 'z-modal',
      'z-[10011]': 'z-tooltip',
      'z-[10010]': 'z-toast',
      'z-[1]': 'z-dropdown'
    };

    for (const file of componentFiles) {
      const filePath = path.join(this.clientDir, file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        for (const [oldZIndex, newZIndex] of Object.entries(zIndexMappings)) {
          if (content.includes(oldZIndex)) {
            content = content.replace(new RegExp(oldZIndex, 'g'), newZIndex);
            updated = true;
          }
        }

        if (updated) {
          fs.writeFileSync(filePath, content);
          await this.log(`Updated z-index values in ${file}`, 'success');
        }
      }
    }
  }

  async consolidateAnimations() {
    await this.log('Consolidating animations...');
    
    const animationsCSS = `
/* Consolidated Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
}

/* Animation utility classes */
.animate-fade-in { animation: fadeIn 0.3s ease-in; }
.animate-slide-up { animation: slideUp 0.3s ease-out; }
.animate-slide-in { animation: slideIn 0.3s ease-out; }
.animate-scale-up { animation: scaleUp 0.2s ease-out; }
.animate-shimmer { 
  animation: shimmer 2s infinite;
  background-size: 200% 100%;
}
.animate-pulse-glow { animation: pulseGlow 2s infinite; }
`;

    // Read current CSS file
    let cssContent = fs.readFileSync(this.cssFile, 'utf8');
    
    // Remove existing animation definitions
    cssContent = cssContent.replace(/@keyframes fadeIn[\s\S]*?}/g, '');
    cssContent = cssContent.replace(/@keyframes slideUp[\s\S]*?}/g, '');
    cssContent = cssContent.replace(/@keyframes slideIn[\s\S]*?}/g, '');
    cssContent = cssContent.replace(/@keyframes scaleUp[\s\S]*?}/g, '');
    cssContent = cssContent.replace(/@keyframes shimmer[\s\S]*?}/g, '');
    cssContent = cssContent.replace(/@keyframes pulseGlow[\s\S]*?}/g, '');
    
    // Add consolidated animations
    cssContent = cssContent.replace('@layer components {', '@layer components {\n' + animationsCSS);
    
    // Write updated CSS
    fs.writeFileSync(this.cssFile, cssContent);
    await this.log('Animations consolidated', 'success');
  }

  async addAccessibilityStyles() {
    await this.log('Adding accessibility styles...');
    
    const accessibilityCSS = `
/* Accessibility Improvements */
@layer components {
  /* Focus states */
  .focus-visible-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900;
  }
  
  /* High contrast text */
  .text-high-contrast {
    @apply text-gray-100;
  }
  
  .text-medium-contrast {
    @apply text-gray-300;
  }
  
  /* Interactive elements */
  .interactive-element {
    @apply focus-visible-ring cursor-pointer transition-colors;
  }
  
  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  /* Skip link */
  .skip-link {
    @apply sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-modal focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg;
  }
}
`;

    // Read current CSS file
    let cssContent = fs.readFileSync(this.cssFile, 'utf8');
    
    // Add accessibility styles to components layer
    cssContent = cssContent.replace('@layer components {', '@layer components {\n' + accessibilityCSS);
    
    // Write updated CSS
    fs.writeFileSync(this.cssFile, cssContent);
    await this.log('Accessibility styles added', 'success');
  }

  async optimizeTailwindConfig() {
    await this.log('Optimizing Tailwind configuration...');
    
    const optimizedConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-up': 'scaleUp 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulseGlow 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
      },
      zIndex: {
        'dropdown': 'var(--z-dropdown)',
        'sticky': 'var(--z-sticky)',
        'fixed': 'var(--z-fixed)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        'modal': 'var(--z-modal)',
        'popover': 'var(--z-popover)',
        'tooltip': 'var(--z-tooltip)',
        'toast': 'var(--z-toast)',
      },
    },
  },
  plugins: [],
  // Enable JIT mode for better performance
  mode: 'jit',
}`;

    fs.writeFileSync(this.tailwindConfig, optimizedConfig);
    await this.log('Tailwind configuration optimized', 'success');
  }

  async optimizePostCSSConfig() {
    await this.log('Optimizing PostCSS configuration...');
    
    const optimizedConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? { 
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          colormin: true,
          minifyFontValues: true,
          minifySelectors: true,
        }]
      }
    } : {})
  },
}`;

    fs.writeFileSync(this.postcssConfig, optimizedConfig);
    await this.log('PostCSS configuration optimized', 'success');
  }

  async createCSSDocumentation() {
    await this.log('Creating CSS documentation...');
    
    const documentation = `# CSS Architecture Documentation

## Overview
This document describes the CSS architecture and styling patterns used in the Manito Debug application.

## Architecture

### Tailwind CSS
- **Utility-First**: Primary styling approach using Tailwind utility classes
- **Custom Components**: Extended with custom component classes in \`@layer components\`
- **Custom Utilities**: Extended with custom utility classes in \`@layer utilities\`

### Z-Index Scale
Standardized z-index hierarchy to prevent layering conflicts:

\`\`\`css
:root {
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-toast: 1080;
}
\`\`\`

### Responsive Design
- **Mobile-First**: All components designed for mobile first
- **Breakpoints**: xs (475px), sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- **Patterns**: Consistent responsive class usage across components

### Color System
- **Primary**: Blue-based color palette for main actions
- **Secondary**: Gray-based color palette for UI elements
- **Semantic**: Success (green), Warning (yellow), Error (red) colors
- **Accessibility**: High contrast ratios for text readability

### Typography
- **Sans**: Inter font family for UI text
- **Mono**: JetBrains Mono for code and technical content
- **Scaling**: Consistent text size scale (xs, sm, base, lg, xl, 2xl)

### Animations
Consolidated animation system:

\`\`\`css
.animate-fade-in     /* Fade in animation */
.animate-slide-up    /* Slide up animation */
.animate-slide-in    /* Slide in animation */
.animate-scale-up    /* Scale up animation */
.animate-shimmer     /* Shimmer effect */
.animate-pulse-glow  /* Pulsing glow effect */
\`\`\`

## Best Practices

### Component Styling
1. **Use Tailwind utilities** for most styling
2. **Create component classes** for repeated patterns
3. **Use CSS variables** for theming and customization
4. **Follow responsive patterns** consistently

### Accessibility
1. **High contrast** text colors
2. **Focus states** for all interactive elements
3. **Screen reader** friendly markup
4. **Keyboard navigation** support

### Performance
1. **Purge unused CSS** in production
2. **Minimize custom CSS** in favor of utilities
3. **Optimize animations** for performance
4. **Use efficient selectors**

## File Structure

\`\`\`
client/
├── src/
│   └── index.css          # Main CSS file with custom styles
├── tailwind.config.js     # Tailwind configuration
└── postcss.config.js      # PostCSS configuration
\`\`\`

## Usage Examples

### Modal Component
\`\`\`jsx
<div className="modal-container z-modal p-4 sm:p-6 animate-fade-in">
  <div className="modal-content animate-scale-up">
    {/* Modal content */}
  </div>
</div>
\`\`\`

### Button Component
\`\`\`jsx
<button className="btn-primary focus-visible-ring">
  Click me
</button>
\`\`\`

### Responsive Layout
\`\`\`jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid items */}
</div>
\`\`\`

## Maintenance

### Adding New Styles
1. **Use Tailwind utilities** when possible
2. **Create component classes** for repeated patterns
3. **Add to appropriate layer** (@layer components or @layer utilities)
4. **Document new patterns** in this file

### Updating Z-Index
1. **Use CSS variables** from the z-index scale
2. **Test layering** to ensure proper hierarchy
3. **Update documentation** if scale changes

### Performance Monitoring
1. **Monitor bundle size** for CSS
2. **Check for unused styles** regularly
3. **Optimize animations** for performance
4. **Test on various devices** and screen sizes
`;

    const docsPath = path.join(this.rootDir, 'docs', 'CSS_ARCHITECTURE.md');
    fs.writeFileSync(docsPath, documentation);
    await this.log('CSS documentation created', 'success');
  }

  async runAllFixes() {
    await this.log('Starting CSS fixes...');
    await this.log('=============================================');

    try {
      await this.fixZIndexScale();
      await this.fixModalZIndexes();
      await this.consolidateAnimations();
      await this.addAccessibilityStyles();
      await this.optimizeTailwindConfig();
      await this.optimizePostCSSConfig();
      await this.createCSSDocumentation();

      await this.log('=============================================');
      await this.log('All CSS fixes completed successfully!', 'success');
      await this.log('Next steps:');
      await this.log('1. Test the application to ensure styles work correctly');
      await this.log('2. Review the updated CSS files');
      await this.log('3. Check the new CSS documentation');
      await this.log('4. Run the build to verify optimizations');

    } catch (error) {
      await this.log(`CSS fixes failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run the CSS fixes
const fixer = new CSSFixer();
fixer.runAllFixes().then(() => {
  console.log('CSS fixes completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('CSS fixes failed:', error);
  process.exit(1);
});
