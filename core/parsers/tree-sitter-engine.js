/**
 * Tree-sitter Parser Engine for Code Knowledge Graph
 * Provides multi-language AST parsing with symbol extraction
 */

import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Go from 'tree-sitter-go';
import Rust from 'tree-sitter-rust';
import Java from 'tree-sitter-java';
import fs from 'fs/promises';

export class TreeSitterEngine {
  constructor() {
    this.parsers = new Map();
    this.languageConfigs = new Map();
    this.initializeParsers();
  }

  /**
   * Initialize parsers for all supported languages
   */
  initializeParsers() {
    const languages = [
      { name: 'javascript', parser: JavaScript, extensions: ['.js', '.jsx', '.mjs'] },
      { name: 'typescript', parser: TypeScript.typescript, extensions: ['.ts'] },
      { name: 'tsx', parser: TypeScript.tsx, extensions: ['.tsx'] },
      { name: 'python', parser: Python, extensions: ['.py', '.pyw'] },
      { name: 'go', parser: Go, extensions: ['.go'] },
      { name: 'rust', parser: Rust, extensions: ['.rs'] },
      { name: 'java', parser: Java, extensions: ['.java'] }
    ];

    for (const lang of languages) {
      try {
        const parser = new Parser();
        parser.setLanguage(lang.parser);
        
        this.parsers.set(lang.name, parser);
        this.languageConfigs.set(lang.name, {
          extensions: lang.extensions,
          parser: lang.parser
        });
        
        console.log(`✅ Initialized ${lang.name} parser`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${lang.name} parser:`, error.message);
      }
    }
  }

  /**
   * Detect language from file path
   */
  detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    for (const [language, config] of this.languageConfigs.entries()) {
      if (config.extensions.some(e => e.includes(ext))) {
        return language;
      }
    }
    
    return null;
  }

  /**
   * Parse file and return AST
   */
  async parseFile(filePath, language = null) {
    try {
      const detectedLanguage = language || this.detectLanguage(filePath);
      
      if (!detectedLanguage || !this.parsers.has(detectedLanguage)) {
        throw new Error(`Unsupported language: ${detectedLanguage}`);
      }

      const content = await fs.readFile(filePath, 'utf8');
      const parser = this.parsers.get(detectedLanguage);
      const tree = parser.parse(content);

      return {
        language: detectedLanguage,
        tree,
        rootNode: tree.rootNode,
        content,
        filePath
      };
    } catch (error) {
      throw new Error(`Failed to parse ${filePath}: ${error.message}`);
    }
  }

  /**
   * Extract symbols from AST
   */
  extractSymbols(parseResult) {
    const { language, rootNode, content, filePath } = parseResult;
    
    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'tsx':
        return this.extractJSSymbols(rootNode, content, filePath);
      case 'python':
        return this.extractPythonSymbols(rootNode, content, filePath);
      case 'go':
        return this.extractGoSymbols(rootNode, content, filePath);
      case 'rust':
        return this.extractRustSymbols(rootNode, content, filePath);
      case 'java':
        return this.extractJavaSymbols(rootNode, content, filePath);
      default:
        return this.extractGenericSymbols(rootNode, content, filePath);
    }
  }

  /**
   * Extract JavaScript/TypeScript symbols
   */
  extractJSSymbols(rootNode, content, filePath) {
    const symbols = {
      functions: [],
      classes: [],
      variables: [],
      imports: [],
      exports: [],
      types: [],
      interfaces: []
    };

    this.traverseNode(rootNode, (node) => {
      switch (node.type) {
        case 'function_declaration':
        case 'function_expression':
        case 'arrow_function':
          symbols.functions.push(this.extractFunction(node, content, filePath));
          break;
          
        case 'class_declaration':
          symbols.classes.push(this.extractClass(node, content, filePath));
          break;
          
        case 'variable_declaration':
          symbols.variables.push(...this.extractVariables(node, content, filePath));
          break;
          
        case 'import_statement':
          symbols.imports.push(this.extractImport(node, content, filePath));
          break;
          
        case 'export_statement':
          symbols.exports.push(this.extractExport(node, content, filePath));
          break;
          
        case 'interface_declaration':
          symbols.interfaces.push(this.extractInterface(node, content, filePath));
          break;
          
        case 'type_alias_declaration':
          symbols.types.push(this.extractTypeAlias(node, content, filePath));
          break;
      }
    });

    return symbols;
  }

  /**
   * Extract Python symbols
   */
  extractPythonSymbols(rootNode, content, filePath) {
    const symbols = {
      functions: [],
      classes: [],
      imports: [],
      variables: []
    };

    this.traverseNode(rootNode, (node) => {
      switch (node.type) {
        case 'function_definition':
          symbols.functions.push(this.extractPythonFunction(node, content, filePath));
          break;
          
        case 'class_definition':
          symbols.classes.push(this.extractPythonClass(node, content, filePath));
          break;
          
        case 'import_statement':
        case 'import_from_statement':
          symbols.imports.push(this.extractPythonImport(node, content, filePath));
          break;
          
        case 'assignment':
          symbols.variables.push(this.extractPythonVariable(node, content, filePath));
          break;
      }
    });

    return symbols;
  }

  /**
   * Extract Go symbols
   */
  extractGoSymbols(rootNode, content, filePath) {
    const symbols = {
      functions: [],
      types: [],
      imports: [],
      structs: [],
      interfaces: []
    };

    this.traverseNode(rootNode, (node) => {
      switch (node.type) {
        case 'function_declaration':
        case 'method_declaration':
          symbols.functions.push(this.extractGoFunction(node, content, filePath));
          break;
          
        case 'type_declaration':
          symbols.types.push(this.extractGoType(node, content, filePath));
          break;
          
        case 'import_declaration':
          symbols.imports.push(this.extractGoImport(node, content, filePath));
          break;
          
        case 'struct_type':
          symbols.structs.push(this.extractGoStruct(node, content, filePath));
          break;
          
        case 'interface_type':
          symbols.interfaces.push(this.extractGoInterface(node, content, filePath));
          break;
      }
    });

    return symbols;
  }

  /**
   * Extract Rust symbols
   */
  extractRustSymbols(rootNode, content, filePath) {
    const symbols = {
      functions: [],
      structs: [],
      traits: [],
      uses: [],
      mods: []
    };

    this.traverseNode(rootNode, (node) => {
      switch (node.type) {
        case 'function_item':
          symbols.functions.push(this.extractRustFunction(node, content, filePath));
          break;
          
        case 'struct_item':
          symbols.structs.push(this.extractRustStruct(node, content, filePath));
          break;
          
        case 'trait_item':
          symbols.traits.push(this.extractRustTrait(node, content, filePath));
          break;
          
        case 'use_declaration':
          symbols.uses.push(this.extractRustUse(node, content, filePath));
          break;
          
        case 'mod_item':
          symbols.mods.push(this.extractRustMod(node, content, filePath));
          break;
      }
    });

    return symbols;
  }

  /**
   * Extract Java symbols
   */
  extractJavaSymbols(rootNode, content, filePath) {
    const symbols = {
      classes: [],
      methods: [],
      interfaces: [],
      imports: [],
      fields: []
    };

    this.traverseNode(rootNode, (node) => {
      switch (node.type) {
        case 'class_declaration':
          symbols.classes.push(this.extractJavaClass(node, content, filePath));
          break;
          
        case 'method_declaration':
          symbols.methods.push(this.extractJavaMethod(node, content, filePath));
          break;
          
        case 'interface_declaration':
          symbols.interfaces.push(this.extractJavaInterface(node, content, filePath));
          break;
          
        case 'import_declaration':
          symbols.imports.push(this.extractJavaImport(node, content, filePath));
          break;
          
        case 'field_declaration':
          symbols.fields.push(this.extractJavaField(node, content, filePath));
          break;
      }
    });

    return symbols;
  }

  /**
   * Generic symbol extraction for unsupported languages
   */
  extractGenericSymbols(rootNode, content, filePath) {
    return {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      metadata: {
        language: 'generic',
        nodeCount: this.countNodes(rootNode),
        hasContent: content.trim().length > 0
      }
    };
  }

  /**
   * Traverse AST nodes
   */
  traverseNode(node, callback) {
    callback(node);
    
    for (let i = 0; i < node.childCount; i++) {
      this.traverseNode(node.child(i), callback);
    }
  }

  /**
   * Extract function information
   */
  extractFunction(node, content, filePath) {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? content.slice(nameNode.startIndex, nameNode.endIndex) : 'anonymous';
    
    return {
      type: 'function',
      name,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      endPosition: {
        row: node.endPosition.row,
        column: node.endPosition.column
      },
      signature: content.slice(node.startIndex, node.endIndex).split('\n')[0],
      metadata: {
        nodeType: node.type,
        hasParameters: !!node.childForFieldName('parameters'),
        isAsync: content.slice(node.startIndex, node.endIndex).includes('async')
      }
    };
  }

  /**
   * Extract class information
   */
  extractClass(node, content, filePath) {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? content.slice(nameNode.startIndex, nameNode.endIndex) : 'anonymous';
    
    return {
      type: 'class',
      name,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      endPosition: {
        row: node.endPosition.row,
        column: node.endPosition.column
      },
      signature: content.slice(node.startIndex, node.endIndex).split('\n')[0],
      metadata: {
        nodeType: node.type,
        hasExtends: !!node.childForFieldName('superclass'),
        methods: this.extractClassMethods(node, content)
      }
    };
  }

  /**
   * Extract variables
   */
  extractVariables(node, content, filePath) {
    const variables = [];
    const declarations = node.childForFieldName('declarations');
    
    if (declarations) {
      for (let i = 0; i < declarations.childCount; i++) {
        const decl = declarations.child(i);
        const nameNode = decl.childForFieldName('name');
        
        if (nameNode) {
          const name = content.slice(nameNode.startIndex, nameNode.endIndex);
          variables.push({
            type: 'variable',
            name,
            filePath,
            startPosition: {
              row: decl.startPosition.row,
              column: decl.startPosition.column
            },
            metadata: {
              declarationType: node.childForFieldName('kind')?.text || 'var',
              hasInitializer: !!decl.childForFieldName('value')
            }
          });
        }
      }
    }
    
    return variables;
  }

  /**
   * Extract import statement
   */
  extractImport(node, content, filePath) {
    const sourceNode = node.childForFieldName('source');
    const source = sourceNode ? content.slice(sourceNode.startIndex + 1, sourceNode.endIndex - 1) : '';
    
    return {
      type: 'import',
      source,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      metadata: {
        isDefault: !!node.childForFieldName('default'),
        namedImports: this.extractNamedImports(node, content)
      }
    };
  }

  /**
   * Extract export statement
   */
  extractExport(node, content, filePath) {
    const exportedNode = node.childForFieldName('declaration') || node.childForFieldName('value');
    
    return {
      type: 'export',
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      metadata: {
        isDefault: node.type === 'export_default_declaration',
        exportType: exportedNode?.type || 'unknown',
        content: content.slice(node.startIndex, node.endIndex)
      }
    };
  }

  /**
   * Extract interface declaration
   */
  extractInterface(node, content, filePath) {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? content.slice(nameNode.startIndex, nameNode.endIndex) : 'anonymous';
    
    return {
      type: 'interface',
      name,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      signature: content.slice(node.startIndex, node.endIndex).split('\n')[0],
      metadata: {
        properties: this.extractInterfaceProperties(node, content)
      }
    };
  }

  /**
   * Extract type alias
   */
  extractTypeAlias(node, content, filePath) {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? content.slice(nameNode.startIndex, nameNode.endIndex) : 'anonymous';
    
    return {
      type: 'type',
      name,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      signature: content.slice(node.startIndex, node.endIndex),
      metadata: {
        typeDefinition: content.slice(node.startIndex, node.endIndex)
      }
    };
  }

  /**
   * Extract Python function
   */
  extractPythonFunction(node, content, filePath) {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? content.slice(nameNode.startIndex, nameNode.endIndex) : 'anonymous';
    
    return {
      type: 'function',
      name,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      signature: content.slice(node.startIndex, node.endIndex).split('\n')[0],
      metadata: {
        language: 'python',
        hasDecorators: this.hasDecorators(node),
        parameters: this.extractPythonParameters(node, content)
      }
    };
  }

  /**
   * Extract Python class
   */
  extractPythonClass(node, content, filePath) {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? content.slice(nameNode.startIndex, nameNode.endIndex) : 'anonymous';
    
    return {
      type: 'class',
      name,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      signature: content.slice(node.startIndex, node.endIndex).split('\n')[0],
      metadata: {
        language: 'python',
        hasInheritance: !!node.childForFieldName('superclasses'),
        methods: this.extractPythonMethods(node, content)
      }
    };
  }

  /**
   * Extract Python import
   */
  extractPythonImport(node, content, filePath) {
    const moduleNode = node.childForFieldName('module_name') || node.childForFieldName('name');
    const module = moduleNode ? content.slice(moduleNode.startIndex, moduleNode.endIndex) : '';
    
    return {
      type: 'import',
      source: module,
      filePath,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      metadata: {
        language: 'python',
        isFromImport: node.type === 'import_from_statement',
        names: this.extractPythonImportNames(node, content)
      }
    };
  }

  /**
   * Helper methods for extraction
   */
  extractClassMethods(classNode, content) {
    const methods = [];
    
    this.traverseNode(classNode, (node) => {
      if (node.type === 'method_definition' || node.type === 'function_declaration') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          methods.push({
            name: content.slice(nameNode.startIndex, nameNode.endIndex),
            line: node.startPosition.row + 1
          });
        }
      }
    });
    
    return methods;
  }

  extractNamedImports(importNode, content) {
    const namedImports = [];
    
    this.traverseNode(importNode, (node) => {
      if (node.type === 'import_specifier') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          namedImports.push(content.slice(nameNode.startIndex, nameNode.endIndex));
        }
      }
    });
    
    return namedImports;
  }

  extractInterfaceProperties(interfaceNode, content) {
    const properties = [];
    
    this.traverseNode(interfaceNode, (node) => {
      if (node.type === 'property_signature') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          properties.push({
            name: content.slice(nameNode.startIndex, nameNode.endIndex),
            line: node.startPosition.row + 1
          });
        }
      }
    });
    
    return properties;
  }

  hasDecorators(node) {
    return node.children.some(child => child.type === 'decorator');
  }

  extractPythonParameters(funcNode, content) {
    const parameters = [];
    const paramsNode = funcNode.childForFieldName('parameters');
    
    if (paramsNode) {
      this.traverseNode(paramsNode, (node) => {
        if (node.type === 'identifier') {
          parameters.push(content.slice(node.startIndex, node.endIndex));
        }
      });
    }
    
    return parameters;
  }

  extractPythonMethods(classNode, content) {
    const methods = [];
    
    this.traverseNode(classNode, (node) => {
      if (node.type === 'function_definition') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          methods.push({
            name: content.slice(nameNode.startIndex, nameNode.endIndex),
            line: node.startPosition.row + 1
          });
        }
      }
    });
    
    return methods;
  }

  extractPythonImportNames(importNode, content) {
    const names = [];
    
    this.traverseNode(importNode, (node) => {
      if (node.type === 'dotted_as_name' || node.type === 'aliased_import') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          names.push(content.slice(nameNode.startIndex, nameNode.endIndex));
        }
      }
    });
    
    return names;
  }

  extractPythonVariable(assignNode, content, filePath) {
    const leftNode = assignNode.childForFieldName('left');
    
    if (leftNode && leftNode.type === 'identifier') {
      return {
        type: 'variable',
        name: content.slice(leftNode.startIndex, leftNode.endIndex),
        filePath,
        startPosition: {
          row: assignNode.startPosition.row,
          column: assignNode.startPosition.column
        },
        metadata: {
          language: 'python',
          hasValue: !!assignNode.childForFieldName('right')
        }
      };
    }
    
    return null;
  }

  /**
   * Count total nodes in AST
   */
  countNodes(node) {
    let count = 1;
    for (let i = 0; i < node.childCount; i++) {
      count += this.countNodes(node.child(i));
    }
    return count;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return Array.from(this.parsers.keys());
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language) {
    return this.parsers.has(language);
  }

  /**
   * Get parser statistics
   */
  getStats() {
    return {
      supportedLanguages: this.getSupportedLanguages(),
      totalParsers: this.parsers.size,
      languageConfigs: Object.fromEntries(this.languageConfigs)
    };
  }
}
