/**
 * Multi-Language Code Analyzer
 * Supports analysis beyond JavaScript/TypeScript
 */

import fs from 'fs/promises';
import path from 'path';

export class MultiLanguageAnalyzer {
  constructor() {
    this.supportedLanguages = {
      'python': { extensions: ['.py'], analyzer: this.analyzePython.bind(this) },
      'go': { extensions: ['.go'], analyzer: this.analyzeGo.bind(this) },
      'rust': { extensions: ['.rs'], analyzer: this.analyzeRust.bind(this) },
      'java': { extensions: ['.java'], analyzer: this.analyzeJava.bind(this) },
      'cpp': { extensions: ['.cpp', '.cxx', '.cc', '.c'], analyzer: this.analyzeCpp.bind(this) },
      'csharp': { extensions: ['.cs'], analyzer: this.analyzeCSharp.bind(this) },
      'php': { extensions: ['.php'], analyzer: this.analyzePhp.bind(this) },
      'ruby': { extensions: ['.rb'], analyzer: this.analyzeRuby.bind(this) },
      'swift': { extensions: ['.swift'], analyzer: this.analyzeSwift.bind(this) },
      'kotlin': { extensions: ['.kt', '.kts'], analyzer: this.analyzeKotlin.bind(this) }
    };
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    for (const [language, config] of Object.entries(this.supportedLanguages)) {
      if (config.extensions.includes(ext)) {
        return language;
      }
    }
    
    return 'unknown';
  }

  /**
   * Analyze file based on detected language
   */
  async analyzeFile(filePath) {
    const language = this.detectLanguage(filePath);
    
    if (language === 'unknown') {
      return this.analyzeGeneric(filePath);
    }

    const config = this.supportedLanguages[language];
    return await config.analyzer(filePath);
  }

  /**
   * Python file analysis
   */
  async analyzePython(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const analysis = {
      language: 'python',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      imports: this.extractPythonImports(content),
      functions: this.extractPythonFunctions(content),
      classes: this.extractPythonClasses(content),
      complexity: this.calculatePythonComplexity(content),
      dependencies: this.extractPythonDependencies(content)
    };

    return analysis;
  }

  /**
   * Go file analysis
   */
  async analyzeGo(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'go',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      package: this.extractGoPackage(content),
      imports: this.extractGoImports(content),
      functions: this.extractGoFunctions(content),
      structs: this.extractGoStructs(content),
      interfaces: this.extractGoInterfaces(content),
      complexity: this.calculateGoComplexity(content)
    };
  }

  /**
   * Rust file analysis
   */
  async analyzeRust(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'rust',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      uses: this.extractRustUses(content),
      functions: this.extractRustFunctions(content),
      structs: this.extractRustStructs(content),
      traits: this.extractRustTraits(content),
      mods: this.extractRustMods(content),
      complexity: this.calculateRustComplexity(content)
    };
  }

  /**
   * Java file analysis
   */
  async analyzeJava(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'java',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      package: this.extractJavaPackage(content),
      imports: this.extractJavaImports(content),
      classes: this.extractJavaClasses(content),
      methods: this.extractJavaMethods(content),
      interfaces: this.extractJavaInterfaces(content),
      complexity: this.calculateJavaComplexity(content)
    };
  }

  /**
   * Generic file analysis for unsupported languages
   */
  async analyzeGeneric(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'generic',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      complexity: Math.min(Math.floor(lines.length / 50), 10), // Simple line-based complexity
      hasComments: /\/\/|\/\*|\#|<!--/.test(content),
      isEmpty: content.trim().length === 0
    };
  }

  // Language-specific extraction methods

  extractPythonImports(content) {
    const imports = [];
    const importRegex = /(?:from\s+(\S+)\s+)?import\s+([^#\n]+)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        module: match[1] || null,
        items: match[2].split(',').map(item => item.trim()),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return imports;
  }

  extractPythonFunctions(content) {
    const functions = [];
    const funcRegex = /def\s+(\w+)\s*\([^)]*\):/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  extractPythonClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)(?:\([^)]*\))?:/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  calculatePythonComplexity(content) {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const patterns = [
      /\bif\b/g, /\belif\b/g, /\belse\b/g,
      /\bfor\b/g, /\bwhile\b/g,
      /\btry\b/g, /\bexcept\b/g,
      /\band\b/g, /\bor\b/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  extractPythonDependencies(content) {
    const deps = [];
    const importRegex = /from\s+(\w+)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      if (!match[1].startsWith('.')) { // External dependency
        deps.push(match[1]);
      }
    }
    
    return [...new Set(deps)]; // Remove duplicates
  }

  // Go language methods
  extractGoPackage(content) {
    const match = content.match(/package\s+(\w+)/);
    return match ? match[1] : null;
  }

  extractGoImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        // Multi-line import
        const lines = match[1].split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed && trimmed.startsWith('"')) {
            imports.push(trimmed.slice(1, -1));
          }
        });
      } else if (match[2]) {
        // Single import
        imports.push(match[2]);
      }
    }
    
    return imports;
  }

  extractGoFunctions(content) {
    const functions = [];
    const funcRegex = /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\([^)]*\)/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  extractGoStructs(content) {
    const structs = [];
    const structRegex = /type\s+(\w+)\s+struct/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
      structs.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return structs;
  }

  extractGoInterfaces(content) {
    const interfaces = [];
    const interfaceRegex = /type\s+(\w+)\s+interface/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return interfaces;
  }

  calculateGoComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bswitch\b/g, /\bcase\b/g,
      /\bfor\b/g, /\brange\b/g,
      /\bselect\b/g, /\bgo\b/g,
      /&&/g, /\|\|/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // Rust language methods
  extractRustUses(content) {
    const uses = [];
    const useRegex = /use\s+([^;]+);/g;
    let match;
    
    while ((match = useRegex.exec(content)) !== null) {
      uses.push({
        path: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return uses;
  }

  extractRustFunctions(content) {
    const functions = [];
    const funcRegex = /fn\s+(\w+)\s*\(/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  extractRustStructs(content) {
    const structs = [];
    const structRegex = /struct\s+(\w+)/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
      structs.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return structs;
  }

  extractRustTraits(content) {
    const traits = [];
    const traitRegex = /trait\s+(\w+)/g;
    let match;
    
    while ((match = traitRegex.exec(content)) !== null) {
      traits.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return traits;
  }

  extractRustMods(content) {
    const mods = [];
    const modRegex = /mod\s+(\w+)/g;
    let match;
    
    while ((match = modRegex.exec(content)) !== null) {
      mods.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return mods;
  }

  calculateRustComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bmatch\b/g,
      /\bfor\b/g, /\bwhile\b/g, /\bloop\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // Java language methods
  extractJavaPackage(content) {
    const match = content.match(/package\s+([^;]+);/);
    return match ? match[1].trim() : null;
  }

  extractJavaImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:static\s+)?([^;]+);/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        path: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return imports;
  }

  extractJavaClasses(content) {
    const classes = [];
    const classRegex = /(?:public\s+|private\s+|protected\s+)?class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  extractJavaMethods(content) {
    const methods = [];
    const methodRegex = /(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      if (match[1] !== 'class' && match[1] !== 'interface') {
        methods.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
    
    return methods;
  }

  extractJavaInterfaces(content) {
    const interfaces = [];
    const interfaceRegex = /(?:public\s+|private\s+|protected\s+)?interface\s+(\w+)/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return interfaces;
  }

  calculateJavaComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bswitch\b/g, /\bcase\b/g,
      /\bfor\b/g, /\bwhile\b/g, /\bdo\b/g,
      /\btry\b/g, /\bcatch\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // C++ analysis
  async analyzeCpp(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'cpp',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      includes: this.extractCppIncludes(content),
      functions: this.extractCppFunctions(content),
      classes: this.extractCppClasses(content),
      namespaces: this.extractCppNamespaces(content),
      complexity: this.calculateCppComplexity(content)
    };
  }

  extractCppIncludes(content) {
    const includes = [];
    const includeRegex = /#include\s*[<"](.*?)[>"]/g;
    let match;
    
    while ((match = includeRegex.exec(content)) !== null) {
      includes.push({
        header: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return includes;
  }

  extractCppFunctions(content) {
    const functions = [];
    const funcRegex = /(?:(?:inline|static|virtual|explicit)\s+)*(?:\w+(?:\s*\*|\s*&)?(?:\s*::\s*\w+)*\s+)+(\w+)\s*\([^)]*\)\s*(?:const\s*)?(?:override\s*)?(?:final\s*)?[{;]/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  extractCppClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  extractCppNamespaces(content) {
    const namespaces = [];
    const nsRegex = /namespace\s+(\w+)/g;
    let match;
    
    while ((match = nsRegex.exec(content)) !== null) {
      namespaces.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return namespaces;
  }

  calculateCppComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bswitch\b/g, /\bcase\b/g,
      /\bfor\b/g, /\bwhile\b/g, /\bdo\b/g,
      /\btry\b/g, /\bcatch\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // C# analysis
  async analyzeCSharp(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'csharp',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      namespace: this.extractCSharpNamespace(content),
      usings: this.extractCSharpUsings(content),
      classes: this.extractCSharpClasses(content),
      methods: this.extractCSharpMethods(content),
      complexity: this.calculateCSharpComplexity(content)
    };
  }

  extractCSharpNamespace(content) {
    const match = content.match(/namespace\s+([^{]+)/);
    return match ? match[1].trim() : null;
  }

  extractCSharpUsings(content) {
    const usings = [];
    const usingRegex = /using\s+([^;]+);/g;
    let match;
    
    while ((match = usingRegex.exec(content)) !== null) {
      usings.push({
        namespace: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return usings;
  }

  extractCSharpClasses(content) {
    const classes = [];
    const classRegex = /(?:public\s+|private\s+|internal\s+|protected\s+)?(?:static\s+|abstract\s+|sealed\s+)?class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  extractCSharpMethods(content) {
    const methods = [];
    const methodRegex = /(?:public\s+|private\s+|internal\s+|protected\s+)?(?:static\s+|virtual\s+|override\s+|abstract\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*[{;]/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      if (match[1] !== 'class' && match[1] !== 'interface' && match[1] !== 'namespace') {
        methods.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
    
    return methods;
  }

  calculateCSharpComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bswitch\b/g, /\bcase\b/g,
      /\bfor\b/g, /\bforeach\b/g, /\bwhile\b/g, /\bdo\b/g,
      /\btry\b/g, /\bcatch\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // PHP analysis
  async analyzePhp(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'php',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      namespace: this.extractPhpNamespace(content),
      uses: this.extractPhpUses(content),
      classes: this.extractPhpClasses(content),
      functions: this.extractPhpFunctions(content),
      complexity: this.calculatePhpComplexity(content)
    };
  }

  extractPhpNamespace(content) {
    const match = content.match(/namespace\s+([^;]+);/);
    return match ? match[1].trim() : null;
  }

  extractPhpUses(content) {
    const uses = [];
    const useRegex = /use\s+([^;]+);/g;
    let match;
    
    while ((match = useRegex.exec(content)) !== null) {
      uses.push({
        class: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return uses;
  }

  extractPhpClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  extractPhpFunctions(content) {
    const functions = [];
    const funcRegex = /function\s+(\w+)\s*\(/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  calculatePhpComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\belseif\b/g, /\bswitch\b/g, /\bcase\b/g,
      /\bfor\b/g, /\bforeach\b/g, /\bwhile\b/g, /\bdo\b/g,
      /\btry\b/g, /\bcatch\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // Ruby analysis
  async analyzeRuby(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'ruby',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      requires: this.extractRubyRequires(content),
      classes: this.extractRubyClasses(content),
      modules: this.extractRubyModules(content),
      methods: this.extractRubyMethods(content),
      complexity: this.calculateRubyComplexity(content)
    };
  }

  extractRubyRequires(content) {
    const requires = [];
    const requireRegex = /require\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = requireRegex.exec(content)) !== null) {
      requires.push({
        gem: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return requires;
  }

  extractRubyClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  extractRubyModules(content) {
    const modules = [];
    const moduleRegex = /module\s+(\w+)/g;
    let match;
    
    while ((match = moduleRegex.exec(content)) !== null) {
      modules.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return modules;
  }

  extractRubyMethods(content) {
    const methods = [];
    const methodRegex = /def\s+(\w+)/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return methods;
  }

  calculateRubyComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\belsif\b/g, /\bunless\b/g, /\bcase\b/g, /\bwhen\b/g,
      /\bfor\b/g, /\bwhile\b/g, /\buntil\b/g,
      /\brescue\b/g, /\bensure\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // Swift analysis
  async analyzeSwift(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'swift',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      imports: this.extractSwiftImports(content),
      classes: this.extractSwiftClasses(content),
      structs: this.extractSwiftStructs(content),
      functions: this.extractSwiftFunctions(content),
      protocols: this.extractSwiftProtocols(content),
      complexity: this.calculateSwiftComplexity(content)
    };
  }

  extractSwiftImports(content) {
    const imports = [];
    const importRegex = /import\s+(\w+)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        module: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return imports;
  }

  extractSwiftClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  extractSwiftStructs(content) {
    const structs = [];
    const structRegex = /struct\s+(\w+)/g;
    let match;
    
    while ((match = structRegex.exec(content)) !== null) {
      structs.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return structs;
  }

  extractSwiftFunctions(content) {
    const functions = [];
    const funcRegex = /func\s+(\w+)\s*\(/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  extractSwiftProtocols(content) {
    const protocols = [];
    const protocolRegex = /protocol\s+(\w+)/g;
    let match;
    
    while ((match = protocolRegex.exec(content)) !== null) {
      protocols.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return protocols;
  }

  calculateSwiftComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bswitch\b/g, /\bcase\b/g,
      /\bfor\b/g, /\bwhile\b/g,
      /\bguard\b/g, /\btry\b/g, /\bcatch\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  // Kotlin analysis
  async analyzeKotlin(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      language: 'kotlin',
      filePath,
      lines: lines.length,
      size: Buffer.byteLength(content, 'utf8'),
      package: this.extractKotlinPackage(content),
      imports: this.extractKotlinImports(content),
      classes: this.extractKotlinClasses(content),
      functions: this.extractKotlinFunctions(content),
      complexity: this.calculateKotlinComplexity(content)
    };
  }

  extractKotlinPackage(content) {
    const match = content.match(/package\s+([^;\n]+)/);
    return match ? match[1].trim() : null;
  }

  extractKotlinImports(content) {
    const imports = [];
    const importRegex = /import\s+([^;\n]+)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        path: match[1].trim(),
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return imports;
  }

  extractKotlinClasses(content) {
    const classes = [];
    const classRegex = /(?:data\s+|abstract\s+|open\s+|final\s+)?class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return classes;
  }

  extractKotlinFunctions(content) {
    const functions = [];
    const funcRegex = /fun\s+(\w+)\s*\(/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  calculateKotlinComplexity(content) {
    let complexity = 1;
    
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bwhen\b/g,
      /\bfor\b/g, /\bwhile\b/g, /\bdo\b/g,
      /\btry\b/g, /\bcatch\b/g,
      /&&/g, /\|\|/g, /\?/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return Math.min(complexity, 10);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return Object.keys(this.supportedLanguages);
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language) {
    return this.supportedLanguages.hasOwnProperty(language);
  }
}
