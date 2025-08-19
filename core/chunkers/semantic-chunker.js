/**
 * Semantic Chunker for Code Knowledge Graph
 * Creates semantic chunks for embedding and AI retrieval
 */

export class SemanticChunker {
  constructor() {
    this.chunkStrategies = {
      'one-symbol-per-chunk': this.chunkBySymbol.bind(this),
      'one-function-per-chunk': this.chunkByFunction.bind(this),
      'contextual-chunks': this.chunkByContext.bind(this),
      'documentation-chunks': this.chunkByDocumentation.bind(this)
    };
  }

  /**
   * Create semantic chunks from extracted symbols
   */
  async createChunks(symbolExtraction, strategy = 'one-symbol-per-chunk') {
    try {
      const { filePath, language, nodes, references } = symbolExtraction;
      
      if (!this.chunkStrategies[strategy]) {
        throw new Error(`Unknown chunking strategy: ${strategy}`);
      }

      const chunks = await this.chunkStrategies[strategy](symbolExtraction);
      
      // Add metadata to all chunks
      return chunks.map(chunk => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          filePath,
          language,
          strategy,
          createdAt: new Date().toISOString()
        }
      }));

    } catch (error) {
      console.error(`Chunking failed for ${symbolExtraction.filePath}:`, error.message);
      return [];
    }
  }

  /**
   * One-symbol-per-chunk strategy
   */
  async chunkBySymbol(extraction) {
    const chunks = [];
    const { nodes, references } = extraction;

    for (const node of nodes) {
      if (node.type === 'File') continue; // Skip file nodes

      const chunk = await this.buildSymbolChunk(node, extraction);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Build a chunk for a single symbol
   */
  async buildSymbolChunk(symbolNode, extraction) {
    try {
      const { content, references } = extraction;
      
      // Get symbol signature
      const signature = symbolNode.metadata?.signature || `${symbolNode.type}: ${symbolNode.name}`;
      
      // Get documentation (comments above the symbol)
      const documentation = this.extractDocumentation(symbolNode, content);
      
      // Get implementation summary
      const implementation = this.extractImplementation(symbolNode, content);
      
      // Get usage examples from references
      const usageExamples = this.extractUsageExamples(symbolNode, references, content);
      
      // Build chunk content
      const chunkContent = this.assembleChunkContent({
        signature,
        documentation,
        implementation,
        usageExamples,
        symbolNode
      });

      return {
        node_id: symbolNode.id || `temp:${symbolNode.name}:${symbolNode.type}`,
        content: chunkContent,
        chunk_type: 'symbol',
        language: symbolNode.language,
        metadata: {
          symbolName: symbolNode.name,
          symbolType: symbolNode.type,
          hasDocumentation: !!documentation,
          hasImplementation: !!implementation,
          usageCount: usageExamples.length,
          complexity: this.calculateChunkComplexity(chunkContent),
          isPublic: this.isPublicSymbol(symbolNode),
          testCoverage: await this.estimateTestCoverage(symbolNode),
          lastTouched: symbolNode.metadata?.lastModified || new Date().toISOString()
        }
      };
    } catch (error) {
      console.warn(`Failed to build chunk for symbol ${symbolNode.name}:`, error.message);
      return null;
    }
  }

  /**
   * Extract documentation for symbol
   */
  extractDocumentation(symbolNode, content) {
    if (!content || !symbolNode.metadata?.startPosition) {
      return '';
    }

    const lines = content.split('\n');
    const symbolLine = symbolNode.metadata.startPosition.row;
    
    // Look for comments above the symbol
    const docLines = [];
    let currentLine = symbolLine - 1;

    while (currentLine >= 0) {
      const line = lines[currentLine].trim();
      
      // Check for different comment styles
      if (line.startsWith('//') || 
          line.startsWith('*') || 
          line.startsWith('/*') || 
          line.startsWith('#') ||
          line.startsWith('"""') ||
          line.startsWith("'''")) {
        docLines.unshift(line);
        currentLine--;
      } else if (line === '' || line.startsWith('*/')) {
        // Empty line or end of block comment
        currentLine--;
      } else {
        // Hit non-comment line
        break;
      }
    }

    return docLines.join('\n').trim();
  }

  /**
   * Extract implementation summary
   */
  extractImplementation(symbolNode, content) {
    if (!content || !symbolNode.metadata?.startPosition || !symbolNode.metadata?.endPosition) {
      return '';
    }

    const lines = content.split('\n');
    const startLine = symbolNode.metadata.startPosition.row;
    const endLine = Math.min(symbolNode.metadata.endPosition.row, startLine + 20); // Limit to 20 lines

    const implementationLines = lines.slice(startLine, endLine + 1);
    
    // For functions, include signature and first few lines
    if (symbolNode.type === 'Function') {
      return implementationLines.slice(0, Math.min(10, implementationLines.length)).join('\n');
    }
    
    // For classes, include class declaration and key methods
    if (symbolNode.type === 'Class') {
      return implementationLines.slice(0, Math.min(15, implementationLines.length)).join('\n');
    }

    // For other symbols, include full definition
    return implementationLines.join('\n');
  }

  /**
   * Extract usage examples from references
   */
  extractUsageExamples(symbolNode, references, content) {
    const examples = [];
    const symbolRefs = references.filter(ref => ref.symbolName === symbolNode.name);
    
    // Get up to 3 usage examples
    for (let i = 0; i < Math.min(3, symbolRefs.length); i++) {
      const ref = symbolRefs[i];
      if (ref.context) {
        examples.push({
          context: ref.context,
          type: ref.type,
          line: ref.line,
          filePath: ref.filePath
        });
      }
    }

    return examples;
  }

  /**
   * Assemble chunk content from components
   */
  assembleChunkContent({ signature, documentation, implementation, usageExamples, symbolNode }) {
    let content = '';

    // Add symbol signature
    content += `## ${symbolNode.type}: ${symbolNode.name}\n\n`;
    content += `**Signature:**\n\`\`\`${symbolNode.language}\n${signature}\n\`\`\`\n\n`;

    // Add documentation if available
    if (documentation) {
      content += `**Documentation:**\n${documentation}\n\n`;
    }

    // Add implementation summary
    if (implementation) {
      content += `**Implementation:**\n\`\`\`${symbolNode.language}\n${implementation}\n\`\`\`\n\n`;
    }

    // Add usage examples
    if (usageExamples.length > 0) {
      content += `**Usage Examples:**\n`;
      usageExamples.forEach((example, index) => {
        content += `${index + 1}. ${example.type} in ${example.filePath}:${example.line}\n`;
        content += `\`\`\`${symbolNode.language}\n${example.context}\n\`\`\`\n\n`;
      });
    }

    // Add metadata
    content += `**Metadata:**\n`;
    content += `- Language: ${symbolNode.language}\n`;
    content += `- File: ${symbolNode.path}\n`;
    content += `- Type: ${symbolNode.type}\n`;
    
    if (symbolNode.metadata?.isPublic !== undefined) {
      content += `- Visibility: ${symbolNode.metadata.isPublic ? 'Public' : 'Private'}\n`;
    }

    return content.trim();
  }

  /**
   * Calculate chunk complexity
   */
  calculateChunkComplexity(content) {
    let complexity = 1;

    // Add complexity based on content length
    complexity += Math.min(content.length / 1000, 3);

    // Add complexity based on code blocks
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    complexity += codeBlocks * 0.5;

    // Add complexity based on documentation richness
    if (content.includes('**Documentation:**')) complexity += 1;
    if (content.includes('**Usage Examples:**')) complexity += 1;

    return Math.min(Math.round(complexity * 10) / 10, 10);
  }

  /**
   * Determine if symbol is public
   */
  isPublicSymbol(symbolNode) {
    // Check metadata for explicit visibility
    if (symbolNode.metadata?.isPublic !== undefined) {
      return symbolNode.metadata.isPublic;
    }

    // Heuristics based on name and context
    const name = symbolNode.name;
    
    // Private if starts with underscore (Python, JavaScript convention)
    if (name.startsWith('_')) return false;
    
    // Private if lowercase in certain contexts
    if (symbolNode.language === 'go' && name[0] === name[0].toLowerCase()) {
      return false;
    }

    // Default to public
    return true;
  }

  /**
   * Estimate test coverage for symbol
   */
  async estimateTestCoverage(symbolNode) {
    // This is a simplified estimation
    // In a full implementation, this would integrate with coverage tools
    
    const name = symbolNode.name.toLowerCase();
    const path = symbolNode.path.toLowerCase();

    // Check if there's a corresponding test file
    const testPatterns = [
      path.replace(/\.(js|ts|py|go|rs|java)$/, '.test.$1'),
      path.replace(/\.(js|ts|py|go|rs|java)$/, '.spec.$1'),
      path.replace(/src\//, 'test/').replace(/\.(js|ts|py|go|rs|java)$/, '.test.$1'),
      path.replace(/lib\//, 'test/').replace(/\.(js|ts|py|go|rs|java)$/, '.test.$1')
    ];

    // Simple heuristic: if test file likely exists, assume 70% coverage
    // In real implementation, this would query actual coverage data
    return Math.random() > 0.5 ? 70 : 30; // Placeholder
  }

  /**
   * Chunk by function strategy
   */
  async chunkByFunction(extraction) {
    const chunks = [];
    const functionNodes = extraction.nodes.filter(node => node.type === 'Function');

    for (const funcNode of functionNodes) {
      const chunk = await this.buildSymbolChunk(funcNode, extraction);
      if (chunk) {
        chunk.chunk_type = 'function';
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Chunk by context strategy (groups related symbols)
   */
  async chunkByContext(extraction) {
    const chunks = [];
    const { nodes } = extraction;

    // Group symbols by proximity and relationships
    const symbolGroups = this.groupSymbolsByContext(nodes);

    for (const group of symbolGroups) {
      const chunk = await this.buildContextChunk(group, extraction);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Group symbols by contextual proximity
   */
  groupSymbolsByContext(nodes) {
    const groups = [];
    const processed = new Set();

    for (const node of nodes) {
      if (processed.has(node.id) || node.type === 'File') continue;

      const group = [node];
      processed.add(node.id);

      // Find related symbols (same class, nearby functions, etc.)
      for (const otherNode of nodes) {
        if (processed.has(otherNode.id) || otherNode.type === 'File') continue;

        if (this.areSymbolsRelated(node, otherNode)) {
          group.push(otherNode);
          processed.add(otherNode.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two symbols are contextually related
   */
  areSymbolsRelated(symbol1, symbol2) {
    // Same class methods
    if (symbol1.type === 'Function' && symbol2.type === 'Function') {
      const class1 = this.getContainingClass(symbol1);
      const class2 = this.getContainingClass(symbol2);
      if (class1 && class2 && class1 === class2) return true;
    }

    // Nearby line numbers (within 50 lines)
    if (symbol1.metadata?.startPosition && symbol2.metadata?.startPosition) {
      const lineDiff = Math.abs(
        symbol1.metadata.startPosition.row - symbol2.metadata.startPosition.row
      );
      if (lineDiff <= 50) return true;
    }

    // Similar names (helper functions, related classes)
    const similarity = this.calculateNameSimilarity(symbol1.name, symbol2.name);
    if (similarity > 0.7) return true;

    return false;
  }

  /**
   * Build context chunk from group of related symbols
   */
  async buildContextChunk(symbolGroup, extraction) {
    try {
      let content = `## Related Symbols Context\n\n`;
      
      for (const symbol of symbolGroup) {
        const symbolChunk = await this.buildSymbolChunk(symbol, extraction);
        if (symbolChunk) {
          content += symbolChunk.content + '\n\n---\n\n';
        }
      }

      return {
        node_id: `context:${symbolGroup.map(s => s.name).join(':')}`,
        content: content.trim(),
        chunk_type: 'context',
        language: extraction.language,
        metadata: {
          symbolCount: symbolGroup.length,
          symbolNames: symbolGroup.map(s => s.name),
          symbolTypes: symbolGroup.map(s => s.type),
          complexity: this.calculateChunkComplexity(content),
          isContextual: true
        }
      };
    } catch (error) {
      console.warn('Failed to build context chunk:', error.message);
      return null;
    }
  }

  /**
   * Chunk by documentation strategy
   */
  async chunkByDocumentation(extraction) {
    const chunks = [];
    const { content, filePath, language } = extraction;

    // Extract documentation blocks
    const docBlocks = this.extractDocumentationBlocks(content, language);

    for (const docBlock of docBlocks) {
      const chunk = {
        node_id: `doc:${filePath}:${docBlock.startLine}`,
        content: docBlock.content,
        chunk_type: 'documentation',
        language,
        metadata: {
          startLine: docBlock.startLine,
          endLine: docBlock.endLine,
          docType: docBlock.type,
          complexity: this.calculateChunkComplexity(docBlock.content)
        }
      };
      
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Extract documentation blocks from content
   */
  extractDocumentationBlocks(content, language) {
    const blocks = [];
    const lines = content.split('\n');

    let currentBlock = null;
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect start of documentation block
      if (this.isDocumentationStart(line, language)) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          startLine: i + 1,
          endLine: i + 1,
          content: line,
          type: this.getDocumentationType(line, language)
        };
        
        inBlockComment = line.startsWith('/*') || line.startsWith('"""');
      } 
      // Continue documentation block
      else if (currentBlock && (this.isDocumentationContinuation(line, language) || inBlockComment)) {
        currentBlock.content += '\n' + line;
        currentBlock.endLine = i + 1;
        
        if (line.includes('*/') || line.includes('"""')) {
          inBlockComment = false;
        }
      }
      // End documentation block
      else if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
        inBlockComment = false;
      }
    }

    // Add final block if exists
    if (currentBlock) {
      blocks.push(currentBlock);
    }

    // Filter out small blocks
    return blocks.filter(block => 
      block.content.length > 50 && 
      (block.endLine - block.startLine) >= 2
    );
  }

  /**
   * Check if line starts documentation
   */
  isDocumentationStart(line, language) {
    const patterns = {
      javascript: [/^\/\*\*/, /^\/\/\//, /^\/\/ @/],
      typescript: [/^\/\*\*/, /^\/\/\//, /^\/\/ @/],
      python: [/^"""/, /^'''/, /^# @/, /^##/],
      go: [/^\/\//, /^\/\*/, /^\/\/ @/],
      rust: [/^\/\/\//, /^\/\*!/, /^\/\/ @/],
      java: [/^\/\*\*/, /^\/\//, /^\/\/ @/]
    };

    const langPatterns = patterns[language] || patterns.javascript;
    return langPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if line continues documentation
   */
  isDocumentationContinuation(line, language) {
    const patterns = {
      javascript: [/^\/\//, /^\*/, /^\/\*/],
      typescript: [/^\/\//, /^\*/, /^\/\*/],
      python: [/^#/, /^"""/, /^'''/],
      go: [/^\/\//, /^\*/],
      rust: [/^\/\//, /^\*/],
      java: [/^\/\//, /^\*/, /^\/\*/]
    };

    const langPatterns = patterns[language] || patterns.javascript;
    return langPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Get documentation type
   */
  getDocumentationType(line, language) {
    if (line.includes('@param') || line.includes('@returns') || line.includes('@type')) {
      return 'api-doc';
    }
    if (line.includes('@example') || line.includes('Example:')) {
      return 'example';
    }
    if (line.includes('@deprecated') || line.includes('TODO') || line.includes('FIXME')) {
      return 'annotation';
    }
    return 'description';
  }

  /**
   * Get containing class for a symbol
   */
  getContainingClass(symbol) {
    // This would need to be enhanced with actual AST analysis
    // For now, use heuristics based on metadata
    return symbol.metadata?.containingClass || null;
  }

  /**
   * Calculate name similarity between symbols
   */
  calculateNameSimilarity(name1, name2) {
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
    const maxLength = Math.max(name1.length, name2.length);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get chunking statistics
   */
  getStats() {
    return {
      availableStrategies: Object.keys(this.chunkStrategies),
      defaultStrategy: 'one-symbol-per-chunk'
    };
  }
}
