#!/bin/bash

# GitHub CI/CD Setup Script for ManitoDebug
# This script helps configure the GitHub Actions CI/CD pipeline

set -e

echo "🚀 Setting up GitHub CI/CD for ManitoDebug"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This script must be run from the root of a git repository"
    exit 1
fi

# Check if GitHub Actions directory exists
if [ ! -d ".github/workflows" ]; then
    print_error "GitHub Actions workflows directory not found. Please ensure the CI/CD files are properly set up."
    exit 1
fi

print_status "Checking current repository configuration..."

# Get repository information
REPO_URL=$(git config --get remote.origin.url)
if [[ $REPO_URL == *"github.com"* ]]; then
    print_success "GitHub repository detected: $REPO_URL"
else
    print_warning "Repository doesn't appear to be on GitHub: $REPO_URL"
    print_warning "Please ensure you're using a GitHub repository for CI/CD"
fi

echo ""
print_status "Required GitHub Secrets Configuration"
echo "=========================================="

echo "Please configure the following secrets in your GitHub repository:"
echo ""
echo "1. Go to your repository on GitHub"
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo "3. Add the following secrets:"
echo ""

# Core secrets
echo "📋 Core Secrets (Required):"
echo "   - GITHUB_TOKEN (automatically provided)"
echo ""

# Security secrets
echo "🔒 Security Secrets (Recommended):"
echo "   - SNYK_TOKEN: Your Snyk API token for vulnerability scanning"
echo "     Get it from: https://app.snyk.io/account"
echo ""

# Railway secrets
echo "🚂 Railway Deployment (Optional):"
echo "   - RAILWAY_TOKEN: Railway CLI token"
echo "   - RAILWAY_SERVICE: Your Railway service name"
echo "   - RAILWAY_URL: Your Railway deployment URL"
echo ""

# Docker Hub secrets
echo "🐳 Docker Hub (Optional):"
echo "   - DOCKERHUB_TOKEN: Docker Hub access token"
echo "   - DOCKERHUB_USERNAME: Your Docker Hub username"
echo ""

# Production secrets
echo "🌐 Production Deployment (Optional):"
echo "   - PRODUCTION_SSH_KEY: SSH private key for production server"
echo "   - PRODUCTION_HOST: Production server hostname"
echo "   - PRODUCTION_USER: Production server username"
echo ""

echo ""
print_status "Environment Configuration"
echo "=============================="

echo "Configure the following environments in GitHub:"
echo ""
echo "1. Go to Settings → Environments"
echo "2. Create the following environments:"
echo ""

echo "📊 Staging Environment:"
echo "   - Name: staging"
echo "   - Branch: develop"
echo "   - Protection rules: Configure as needed"
echo ""

echo "🚀 Production Environment:"
echo "   - Name: production"
echo "   - Branch: main"
echo "   - Protection rules: Require reviewers"
echo ""

echo ""
print_status "Branch Protection Setup"
echo "============================"

echo "Set up branch protection rules:"
echo ""
echo "1. Go to Settings → Branches"
echo "2. Add protection rules for:"
echo "   - main branch"
echo "   - develop branch"
echo "3. Configure:"
echo "   - Require status checks to pass"
echo "   - Require pull request reviews"
echo "   - Restrict pushes to matching branches"
echo ""

echo ""
print_status "Workflow Files Verification"
echo "================================"

# Check if workflow files exist
WORKFLOW_FILES=(
    ".github/workflows/ci-cd.yml"
    ".github/workflows/quick-test.yml"
    ".github/workflows/security-scan.yml"
    ".github/workflows/deploy-railway.yml"
    ".github/workflows/deploy-docker.yml"
)

for file in "${WORKFLOW_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file missing"
    fi
done

echo ""
print_status "Environment Files Verification"
echo "===================================="

ENV_FILES=(
    ".github/environments/production.yml"
    ".github/environments/staging.yml"
)

for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file missing"
    fi
done

echo ""
print_status "Package.json Scripts Verification"
echo "========================================"

# Check if required scripts exist in package.json
REQUIRED_SCRIPTS=(
    "build"
    "test"
    "lint"
    "security"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if npm run "$script" --silent >/dev/null 2>&1; then
        print_success "✓ npm run $script available"
    else
        print_warning "⚠ npm run $script not found or failed"
    fi
done

echo ""
print_status "Docker Configuration Verification"
echo "======================================="

if [ -f "Dockerfile.prod" ]; then
    print_success "✓ Dockerfile.prod exists"
else
    print_warning "⚠ Dockerfile.prod not found"
fi

if [ -f "docker-compose.prod.yml" ]; then
    print_success "✓ docker-compose.prod.yml exists"
else
    print_warning "⚠ docker-compose.prod.yml not found"
fi

echo ""
print_status "Next Steps"
echo "============="

echo "1. Configure the secrets listed above in GitHub"
echo "2. Set up environments and branch protection"
echo "3. Push your changes to trigger the first workflow run"
echo "4. Monitor the Actions tab for workflow execution"
echo "5. Review and customize deployment configurations as needed"
echo ""

print_success "GitHub CI/CD setup verification complete!"
echo ""
echo "📚 For detailed documentation, see: docs/GITHUB_CI_CD_SETUP.md"
echo "🔧 For troubleshooting, check the GitHub Actions documentation"
echo ""

# Optional: Test workflow syntax
if command -v yamllint >/dev/null 2>&1; then
    print_status "Testing workflow syntax..."
    if yamllint .github/workflows/*.yml >/dev/null 2>&1; then
        print_success "✓ Workflow syntax is valid"
    else
        print_warning "⚠ Workflow syntax issues detected"
    fi
else
    print_warning "yamllint not found - skipping syntax validation"
fi

echo ""
print_success "Setup complete! 🎉"
