/**
 * Symbol Extractor for Code Knowledge Graph
 * Extracts symbols, references, and relationships from parsed AST
 */

import { TreeSitterEngine } from '../parsers/tree-sitter-engine.js';

export class SymbolExtractor {
  constructor() {
    this.treeSitterEngine = new TreeSitterEngine();
    this.symbolCache = new Map();
    this.referenceCache = new Map();
  }

  /**
   * Extract all symbols from a file
   */
  async extractFromFile(filePath, projectId, commitHash = null) {
    try {
      // Parse file with tree-sitter
      const parseResult = await this.treeSitterEngine.parseFile(filePath);
      
      // Extract symbols using tree-sitter
      const symbols = this.treeSitterEngine.extractSymbols(parseResult);
      
      // Convert to graph nodes
      const nodes = await this.convertSymbolsToNodes(symbols, filePath, projectId, commitHash);
      
      // Extract references and relationships
      const references = await this.extractReferences(parseResult, nodes);
      
      // Extract edges from references
      const edges = await this.convertReferencesToEdges(references, nodes);

      return {
        filePath,
        language: parseResult.language,
        nodes,
        edges,
        references,
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          extractedAt: new Date().toISOString(),
          commitHash
        }
      };
    } catch (error) {
      console.warn(`Symbol extraction failed for ${filePath}:`, error.message);
      return {
        filePath,
        language: 'unknown',
        nodes: [],
        edges: [],
        references: [],
        error: error.message
      };
    }
  }

  /**
   * Convert extracted symbols to graph nodes
   */
  async convertSymbolsToNodes(symbols, filePath, projectId, commitHash) {
    const nodes = [];

    // Create file node
    const fileNode = {
      type: 'File',
      name: filePath.split('/').pop(),
      path: filePath,
      language: symbols.language || 'unknown',
      metadata: {
        symbolCounts: {
          functions: symbols.functions?.length || 0,
          classes: symbols.classes?.length || 0,
          variables: symbols.variables?.length || 0,
          imports: symbols.imports?.length || 0,
          exports: symbols.exports?.length || 0
        }
      },
      project_id: projectId,
      commit_hash: commitHash
    };
    nodes.push(fileNode);

    // Convert functions to nodes
    if (symbols.functions) {
      for (const func of symbols.functions) {
        nodes.push({
          type: 'Function',
          name: func.name,
          path: filePath,
          language: symbols.language,
          metadata: {
            signature: func.signature,
            startPosition: func.startPosition,
            endPosition: func.endPosition,
            isAsync: func.metadata?.isAsync || false,
            parameters: func.metadata?.parameters || [],
            returnType: func.metadata?.returnType
          },
          project_id: projectId,
          commit_hash: commitHash
        });
      }
    }

    // Convert classes to nodes
    if (symbols.classes) {
      for (const cls of symbols.classes) {
        nodes.push({
          type: 'Class',
          name: cls.name,
          path: filePath,
          language: symbols.language,
          metadata: {
            signature: cls.signature,
            startPosition: cls.startPosition,
            endPosition: cls.endPosition,
            methods: cls.metadata?.methods || [],
            extends: cls.metadata?.extends,
            implements: cls.metadata?.implements
          },
          project_id: projectId,
          commit_hash: commitHash
        });
      }
    }

    // Convert variables to nodes
    if (symbols.variables) {
      for (const variable of symbols.variables) {
        nodes.push({
          type: 'Variable',
          name: variable.name,
          path: filePath,
          language: symbols.language,
          metadata: {
            startPosition: variable.startPosition,
            declarationType: variable.metadata?.declarationType || 'var',
            hasInitializer: variable.metadata?.hasInitializer || false,
            scope: variable.metadata?.scope || 'unknown'
          },
          project_id: projectId,
          commit_hash: commitHash
        });
      }
    }

    // Convert types/interfaces to nodes
    if (symbols.types) {
      for (const type of symbols.types) {
        nodes.push({
          type: 'Type',
          name: type.name,
          path: filePath,
          language: symbols.language,
          metadata: {
            signature: type.signature,
            startPosition: type.startPosition,
            typeKind: type.metadata?.typeKind || 'type',
            properties: type.metadata?.properties || []
          },
          project_id: projectId,
          commit_hash: commitHash
        });
      }
    }

    if (symbols.interfaces) {
      for (const iface of symbols.interfaces) {
        nodes.push({
          type: 'Interface',
          name: iface.name,
          path: filePath,
          language: symbols.language,
          metadata: {
            signature: iface.signature,
            startPosition: iface.startPosition,
            properties: iface.metadata?.properties || [],
            extends: iface.metadata?.extends
          },
          project_id: projectId,
          commit_hash: commitHash
        });
      }
    }

    return nodes;
  }

  /**
   * Extract references between symbols
   */
  async extractReferences(parseResult, nodes) {
    const references = [];
    const { rootNode, content, filePath, language } = parseResult;

    // Create symbol lookup map
    const symbolMap = new Map();
    nodes.forEach(node => {
      if (node.type !== 'File') {
        symbolMap.set(node.name, node);
      }
    });

    // Extract references based on language
    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'tsx':
        references.push(...this.extractJSReferences(rootNode, content, symbolMap, filePath));
        break;
      case 'python':
        references.push(...this.extractPythonReferences(rootNode, content, symbolMap, filePath));
        break;
      case 'go':
        references.push(...this.extractGoReferences(rootNode, content, symbolMap, filePath));
        break;
      case 'rust':
        references.push(...this.extractRustReferences(rootNode, content, symbolMap, filePath));
        break;
      case 'java':
        references.push(...this.extractJavaReferences(rootNode, content, symbolMap, filePath));
        break;
    }

    return references;
  }

  /**
   * Extract JavaScript/TypeScript references
   */
  extractJSReferences(rootNode, content, symbolMap, filePath) {
    const references = [];

    this.treeSitterEngine.traverseNode(rootNode, (node) => {
      switch (node.type) {
        case 'call_expression':
          const calleeNode = node.childForFieldName('function');
          if (calleeNode && calleeNode.type === 'identifier') {
            const calleeName = content.slice(calleeNode.startIndex, calleeNode.endIndex);
            if (symbolMap.has(calleeName)) {
              references.push({
                type: 'call',
                symbolName: calleeName,
                filePath,
                line: node.startPosition.row + 1,
                column: node.startPosition.column,
                context: this.extractContext(node, content)
              });
            }
          }
          break;

        case 'identifier':
          const identifierName = content.slice(node.startIndex, node.endIndex);
          if (symbolMap.has(identifierName)) {
            references.push({
              type: 'reference',
              symbolName: identifierName,
              filePath,
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
              context: this.extractContext(node, content)
            });
          }
          break;
      }
    });

    return references;
  }

  /**
   * Extract Python references
   */
  extractPythonReferences(rootNode, content, symbolMap, filePath) {
    const references = [];

    this.treeSitterEngine.traverseNode(rootNode, (node) => {
      if (node.type === 'call') {
        const functionNode = node.childForFieldName('function');
        if (functionNode && functionNode.type === 'identifier') {
          const functionName = content.slice(functionNode.startIndex, functionNode.endIndex);
          if (symbolMap.has(functionName)) {
            references.push({
              type: 'call',
              symbolName: functionName,
              filePath,
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
              context: this.extractContext(node, content)
            });
          }
        }
      }
    });

    return references;
  }

  /**
   * Extract Go references
   */
  extractGoReferences(rootNode, content, symbolMap, filePath) {
    const references = [];

    this.treeSitterEngine.traverseNode(rootNode, (node) => {
      if (node.type === 'call_expression') {
        const functionNode = node.childForFieldName('function');
        if (functionNode) {
          const functionName = content.slice(functionNode.startIndex, functionNode.endIndex);
          if (symbolMap.has(functionName)) {
            references.push({
              type: 'call',
              symbolName: functionName,
              filePath,
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
              context: this.extractContext(node, content)
            });
          }
        }
      }
    });

    return references;
  }

  /**
   * Extract Rust references
   */
  extractRustReferences(rootNode, content, symbolMap, filePath) {
    const references = [];

    this.treeSitterEngine.traverseNode(rootNode, (node) => {
      if (node.type === 'call_expression') {
        const functionNode = node.childForFieldName('function');
        if (functionNode) {
          const functionName = content.slice(functionNode.startIndex, functionNode.endIndex);
          if (symbolMap.has(functionName)) {
            references.push({
              type: 'call',
              symbolName: functionName,
              filePath,
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
              context: this.extractContext(node, content)
            });
          }
        }
      }
    });

    return references;
  }

  /**
   * Extract Java references
   */
  extractJavaReferences(rootNode, content, symbolMap, filePath) {
    const references = [];

    this.treeSitterEngine.traverseNode(rootNode, (node) => {
      if (node.type === 'method_invocation') {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const methodName = content.slice(nameNode.startIndex, nameNode.endIndex);
          if (symbolMap.has(methodName)) {
            references.push({
              type: 'call',
              symbolName: methodName,
              filePath,
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
              context: this.extractContext(node, content)
            });
          }
        }
      }
    });

    return references;
  }

  /**
   * Convert references to graph edges
   */
  async convertReferencesToEdges(references, nodes) {
    const edges = [];
    const nodeMap = new Map();
    
    // Create lookup map
    nodes.forEach(node => nodeMap.set(`${node.name}:${node.type}`, node));

    for (const ref of references) {
      const symbolKey = `${ref.symbolName}:Function`;
      const referenceKey = `${ref.filePath}:File`;
      
      const symbolNode = nodeMap.get(symbolKey);
      const fileNode = nodeMap.get(referenceKey);

      if (symbolNode && fileNode) {
        edges.push({
          from_node_id: fileNode.id || `file:${ref.filePath}`,
          to_node_id: symbolNode.id || `symbol:${ref.symbolName}`,
          relationship: ref.type,
          metadata: {
            line: ref.line,
            column: ref.column,
            context: ref.context
          },
          weight: 1.0,
          confidence: 0.9
        });
      }
    }

    return edges;
  }

  /**
   * Extract surrounding context for a node
   */
  extractContext(node, content, contextLines = 2) {
    const lines = content.split('\n');
    const startLine = Math.max(0, node.startPosition.row - contextLines);
    const endLine = Math.min(lines.length - 1, node.endPosition.row + contextLines);
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }

  /**
   * Cache symbol information
   */
  cacheSymbol(key, symbolData) {
    this.symbolCache.set(key, {
      data: symbolData,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.symbolCache.size > 10000) {
      const oldestKey = Array.from(this.symbolCache.keys())[0];
      this.symbolCache.delete(oldestKey);
    }
  }

  /**
   * Get cached symbol
   */
  getCachedSymbol(key) {
    const cached = this.symbolCache.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      return cached.data;
    }
    return null;
  }

  /**
   * Clear caches
   */
  clearCaches() {
    this.symbolCache.clear();
    this.referenceCache.clear();
  }

  /**
   * Get extraction statistics
   */
  getStats() {
    return {
      cacheSize: this.symbolCache.size,
      supportedLanguages: this.treeSitterEngine.getSupportedLanguages(),
      parserStats: this.treeSitterEngine.getStats()
    };
  }
}
