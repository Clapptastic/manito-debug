# ManitoDebug User Guide

## 🎯 **Getting Started**

### **What is ManitoDebug?**

ManitoDebug is an AI-powered code analysis and debugging tool that helps developers identify dependencies, conflicts, and potential issues in their codebases. It provides comprehensive insights through advanced visualization, AI analysis, and real-time monitoring.

### **Key Features**
- 🔍 **Intelligent Code Scanning**: AST-based analysis with dependency extraction
- 🤖 **AI-Powered Analysis**: OpenAI, Anthropic, and local AI providers
- 📊 **Real-time Metrics**: Performance monitoring and code quality insights
- 🔗 **Dependency Mapping**: Visual dependency graphs and conflict detection
- 🌐 **Dynamic Port Management**: Automatic port conflict resolution
- 📱 **Modern Web UI**: React-based interface with real-time updates

---

## 🚀 **Quick Start Guide**

### **1. Access the Application**

#### **Docker (Recommended)**
```bash
# Production version
docker run -p 3000:3000 clapptastic/manito-debug:latest

# Development version
docker run -p 3000-3010:3000-3010 -p 5173-5180:5173-5180 clapptastic/manito-debug:dev-latest
```

#### **Local Development**
```bash
# Clone and start
git clone https://github.com/Clapptastic/manito-debug.git
cd manito-debug
npm install
npm run dev
```

### **2. First Scan**

1. **Open the application** in your browser
2. **Choose your input method**:
   - **Path Input**: Enter the path to your codebase
   - **File Upload**: Upload a ZIP file of your project
   - **Directory Browse**: Use browser directory access
3. **Click "Scan"** to start analysis
4. **Wait for completion** - you'll see real-time progress

### **3. View Results**

Once scanning is complete, you'll see:
- **Dependency Graph**: Interactive visualization of file relationships
- **Metrics Panel**: Code quality and performance metrics
- **Conflicts List**: Potential issues and circular dependencies
- **Files Tab**: Detailed file analysis
- **Knowledge Graph**: Advanced code intelligence

---

## 📊 **Understanding the Interface**

### **Main Dashboard**

#### **Header Section**
- **Project Manager**: Switch between different projects
- **Scan Queue**: Monitor background scan jobs
- **System Metrics**: Real-time system performance
- **AI Provider Config**: Configure AI analysis settings
- **Global Search**: Search across all projects and files

#### **Sidebar**
- **Scan Path**: Current project path
- **Scan Button**: Start new analysis
- **Upload Options**: File upload and directory browse
- **Settings**: Application configuration

#### **Main Content Area**
- **Tab Navigation**: Switch between different views
- **Content Panels**: Detailed analysis results
- **Interactive Elements**: Clickable graphs and data

### **Available Tabs**

#### **1. Dependency Graph**
- **Interactive Graph**: Click nodes to explore relationships
- **Zoom Controls**: Pan and zoom through large graphs
- **Filter Options**: Filter by file type, complexity, etc.
- **Export Options**: Save graph as image or data

#### **2. Metrics**
- **Code Quality**: Lines of code, complexity, maintainability
- **Performance**: File sizes, dependencies, build times
- **Security**: Vulnerability analysis and recommendations
- **Trends**: Historical data and improvements

#### **3. Conflicts**
- **Circular Dependencies**: Files that depend on each other
- **Unused Imports**: Dead code and unused dependencies
- **Version Conflicts**: Package version mismatches
- **Resolution Suggestions**: AI-powered fix recommendations

#### **4. Files**
- **File List**: All scanned files with metadata
- **Search & Filter**: Find specific files quickly
- **File Details**: Individual file analysis
- **Actions**: View, edit, or analyze specific files

#### **5. Knowledge Graph**
- **Symbol Search**: Find functions, classes, and variables
- **Dependency Analysis**: Understand code relationships
- **Impact Analysis**: See what changes affect
- **AI Insights**: Get optimization suggestions

---

## 🔧 **Using Project Manager**

### **⚠️ Current Limitation**
**Important**: The Project Manager currently has a critical issue where switching between projects does not load existing scan results. This is being fixed in the next update.

### **Available Actions**

#### **Creating Projects**
1. Click the **Projects** button in the header
2. Click **"New Project"**
3. Enter project name and optional path
4. Click **"Create Project"**

#### **Switching Projects**
1. Click the **Projects** button in the header
2. Click on any project in the list
3. The project will be selected (note: scan results not yet loaded)

#### **Managing Projects**
- **Copy Path**: Copy project path to clipboard
- **Copy Details**: Copy project information
- **Delete Project**: Remove project (use with caution)

---

## 🤖 **AI Analysis Features**

### **AI Assistant Panel**

#### **Accessing AI Help**
- Press **Alt+A** or click the AI button in the header
- The AI panel will slide in from the right

#### **Available AI Features**
- **Code Review**: Get AI-powered code analysis
- **Bug Detection**: Find potential issues and bugs
- **Optimization**: Get performance improvement suggestions
- **Documentation**: Generate code documentation
- **Refactoring**: Get refactoring recommendations

#### **Using AI Analysis**
1. **Ask Questions**: Type natural language questions
2. **Request Analysis**: Ask for specific code analysis
3. **Get Explanations**: Understand complex code sections
4. **Receive Suggestions**: Get improvement recommendations

### **AI Providers**

#### **OpenAI (GPT-4)**
- **Best for**: Complex analysis and explanations
- **Strengths**: Deep understanding, detailed responses
- **Setup**: Requires OpenAI API key

#### **Anthropic (Claude)**
- **Best for**: Code review and security analysis
- **Strengths**: Security-focused, detailed code analysis
- **Setup**: Requires Anthropic API key

#### **Local AI**
- **Best for**: Offline analysis and basic insights
- **Strengths**: No API costs, always available
- **Setup**: No setup required

---

## 📈 **Understanding Metrics**

### **Code Quality Metrics**

#### **Lines of Code**
- **Total LOC**: Total lines of code in project
- **Source LOC**: Lines of actual source code
- **Comment Ratio**: Percentage of comments
- **Blank Lines**: Percentage of blank lines

#### **Complexity Metrics**
- **Cyclomatic Complexity**: Code complexity measure
- **Cognitive Complexity**: Human-readable complexity
- **Maintainability Index**: How easy to maintain
- **Technical Debt**: Estimated refactoring effort

#### **Dependency Metrics**
- **Total Dependencies**: Number of external dependencies
- **Direct Dependencies**: Directly imported packages
- **Transitive Dependencies**: Indirect dependencies
- **Circular Dependencies**: Circular import chains

### **Performance Metrics**

#### **File Metrics**
- **Total Files**: Number of files scanned
- **Average File Size**: Average file size in bytes
- **Largest Files**: Biggest files in project
- **File Types**: Breakdown by file extension

#### **Build Metrics**
- **Build Time**: Estimated build duration
- **Bundle Size**: Estimated bundle size
- **Load Time**: Estimated page load time
- **Memory Usage**: Estimated memory consumption

---

## 🔍 **Advanced Features**

### **Dependency Graph Visualization**

#### **Graph Controls**
- **Zoom**: Mouse wheel or zoom buttons
- **Pan**: Click and drag to move around
- **Select**: Click nodes to select them
- **Filter**: Use filter panel to show/hide nodes

#### **Node Types**
- **Files**: Individual source files
- **Modules**: Grouped file collections
- **Packages**: External dependencies
- **Functions**: Individual functions

#### **Edge Types**
- **Imports**: File import relationships
- **Exports**: File export relationships
- **Calls**: Function call relationships
- **Inheritance**: Class inheritance relationships

### **Code Knowledge Graph**

#### **Symbol Search**
1. Enter function, class, or variable name
2. View all occurrences and definitions
3. See usage patterns and relationships
4. Get AI-powered insights

#### **Impact Analysis**
1. Select a file or symbol
2. See what other files depend on it
3. Understand change impact
4. Get refactoring suggestions

#### **Dependency Traversal**
1. Start from any file or symbol
2. Follow dependency chains
3. Understand code flow
4. Identify bottlenecks

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Scan Fails to Start**
- **Check Path**: Ensure the path is correct and accessible
- **File Permissions**: Make sure you have read access
- **Network Issues**: Check internet connection for AI features
- **Server Status**: Verify the server is running

#### **No Results Displayed**
- **Wait for Completion**: Large projects take time to scan
- **Check Console**: Look for error messages in browser console
- **Refresh Page**: Try refreshing if results don't appear
- **Check Logs**: Review server logs for errors

#### **AI Features Not Working**
- **API Keys**: Ensure AI provider API keys are configured
- **Network**: Check internet connection
- **Rate Limits**: Some APIs have usage limits
- **Fallback**: Try switching to Local AI provider

#### **Performance Issues**
- **Large Projects**: Very large codebases may be slow
- **Browser**: Try a different browser
- **Memory**: Close other applications to free memory
- **Cache**: Clear browser cache and reload

### **Getting Help**

#### **Documentation**
- **User Guide**: This document
- **API Documentation**: Technical API reference
- **Architecture Guide**: System design overview
- **Troubleshooting**: Common issues and solutions

#### **Support Channels**
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Discord Community**: Real-time help and discussion
- **Email Support**: Direct support for enterprise users

---

## 🎯 **Best Practices**

### **Effective Scanning**

#### **Choose the Right Scope**
- **Full Project**: Scan entire codebase for comprehensive analysis
- **Specific Directory**: Focus on particular areas of interest
- **Individual Files**: Analyze specific files in detail

#### **Use Appropriate Patterns**
- **Include Patterns**: Specify which files to scan
- **Exclude Patterns**: Skip unnecessary files (node_modules, etc.)
- **File Types**: Focus on relevant file types

#### **Regular Scanning**
- **After Changes**: Scan after significant code changes
- **Before Reviews**: Scan before code reviews
- **Periodic Checks**: Regular scans to catch issues early

### **Interpreting Results**

#### **Focus on High-Priority Issues**
- **Critical Conflicts**: Address circular dependencies first
- **Security Issues**: Fix security vulnerabilities immediately
- **Performance Problems**: Optimize performance bottlenecks
- **Code Quality**: Improve maintainability issues

#### **Use AI Insights**
- **Ask Specific Questions**: Get targeted advice
- **Request Explanations**: Understand complex issues
- **Get Suggestions**: Receive improvement recommendations
- **Validate Solutions**: Confirm your fixes are correct

### **Team Collaboration**

#### **Share Results**
- **Export Reports**: Save analysis results for sharing
- **Document Issues**: Create tickets for identified problems
- **Track Progress**: Monitor improvements over time
- **Team Reviews**: Use results in code reviews

#### **Standardize Process**
- **Scan Before Commits**: Integrate scanning into workflow
- **Automated Checks**: Set up automated scanning
- **Quality Gates**: Use metrics as quality gates
- **Continuous Monitoring**: Regular monitoring of code quality

---

## 🔮 **Future Features**

### **Upcoming Improvements**

#### **Project Data Persistence** (Coming Soon)
- **Automatic Loading**: Load scan results when switching projects
- **Data Persistence**: Save analysis data between sessions
- **Project State**: Maintain project context and settings
- **User Sessions**: Personalized user experience

#### **Enhanced AI Features**
- **Code Generation**: AI-powered code generation
- **Test Generation**: Automatic test case generation
- **Documentation**: Automated documentation generation
- **Refactoring**: AI-assisted code refactoring

#### **Advanced Analytics**
- **Historical Trends**: Track improvements over time
- **Team Metrics**: Team performance and productivity
- **Custom Dashboards**: Personalized analytics views
- **Predictive Analysis**: Predict potential issues

#### **Enterprise Features**
- **Multi-User Support**: Team collaboration features
- **Role-Based Access**: User permissions and roles
- **Audit Logs**: Track all actions and changes
- **Integration**: CI/CD and IDE integrations

---

## 📞 **Support & Feedback**

### **Getting Help**
- **Documentation**: Comprehensive guides and references
- **Community**: Active community of users and developers
- **Support**: Professional support for enterprise users
- **Training**: Training sessions and workshops

### **Providing Feedback**
- **Feature Requests**: Suggest new features and improvements
- **Bug Reports**: Report issues and problems
- **User Experience**: Share feedback on usability
- **Performance**: Report performance issues

### **Contributing**
- **Open Source**: Contribute to the project
- **Documentation**: Help improve documentation
- **Testing**: Help test new features
- **Community**: Help other users

---

**ManitoDebug User Guide** - Empowering developers with AI-powered code analysis and debugging tools.
