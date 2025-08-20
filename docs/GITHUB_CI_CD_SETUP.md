# GitHub CI/CD Setup for ManitoDebug

This document provides a comprehensive guide to the GitHub Actions CI/CD pipeline setup for the ManitoDebug project.

## Overview

The CI/CD pipeline consists of multiple workflows that handle different aspects of the development and deployment process:

- **Main CI/CD Pipeline** (`ci-cd.yml`): Complete pipeline for testing, building, and deployment
- **Quick Test** (`quick-test.yml`): Fast testing for pull requests
- **Security Scan** (`security-scan.yml`): Security vulnerability scanning
- **Railway Deployment** (`deploy-railway.yml`): Deployment to Railway platform
- **Docker Deployment** (`deploy-docker.yml`): Containerized deployment

## Workflow Structure

### 1. Main CI/CD Pipeline (`ci-cd.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Release publication

**Jobs:**
1. **Lint and Test**: Parallel testing of core, client, and server components
2. **Integration Tests**: End-to-end testing with PostgreSQL and Redis
3. **Security Scan**: Vulnerability scanning with npm audit and Snyk
4. **Build**: Application building and artifact creation
5. **Docker Build**: Container image building and pushing to GitHub Container Registry
6. **Deploy Staging**: Deployment to staging environment (develop branch)
7. **Deploy Production**: Deployment to production environment (releases)
8. **Performance Testing**: Performance benchmarks
9. **Documentation Update**: Automatic documentation updates

### 2. Quick Test (`quick-test.yml`)

**Purpose:** Fast feedback for pull requests
**Triggers:** Pull requests to `main` or `develop` branches

**Jobs:**
- Linting
- Unit tests for all components
- Build verification

### 3. Security Scan (`security-scan.yml`)

**Purpose:** Security vulnerability detection
**Triggers:** 
- Weekly schedule (Mondays at 2 AM)
- Push to `main` or `develop` branches

**Tools:**
- npm audit
- Snyk vulnerability scanner
- OWASP ZAP (for main branch)

### 4. Railway Deployment (`deploy-railway.yml`)

**Purpose:** Deployment to Railway platform
**Triggers:** Push to `main` branch or release publication

### 5. Docker Deployment (`deploy-docker.yml`)

**Purpose:** Containerized deployment
**Triggers:** Push to `main` branch or release publication

## Environment Configuration

### Production Environment
- **File:** `.github/environments/production.yml`
- **Branch:** `main`
- **Required Reviewers:** Configured reviewers
- **Wait Timer:** 5 minutes
- **Protected Branches:** Enabled

### Staging Environment
- **File:** `.github/environments/staging.yml`
- **Branch:** `develop`
- **Required Reviewers:** Configured reviewers
- **Wait Timer:** 2 minutes
- **Protected Branches:** Enabled

## Required Secrets

Configure the following secrets in your GitHub repository settings:

### Core Secrets
- `GITHUB_TOKEN`: Automatically provided by GitHub

### Security Scanning
- `SNYK_TOKEN`: Snyk API token for vulnerability scanning

### Railway Deployment
- `RAILWAY_TOKEN`: Railway CLI token
- `RAILWAY_SERVICE`: Railway service name
- `RAILWAY_URL`: Railway deployment URL

### Docker Hub (Optional)
- `DOCKERHUB_TOKEN`: Docker Hub access token
- `DOCKERHUB_USERNAME`: Docker Hub username

### Production Deployment
- `PRODUCTION_SSH_KEY`: SSH private key for production server
- `PRODUCTION_HOST`: Production server hostname
- `PRODUCTION_USER`: Production server username

## Setup Instructions

### 1. Repository Configuration

1. **Enable GitHub Actions:**
   - Go to your repository settings
   - Navigate to "Actions" → "General"
   - Enable "Allow all actions and reusable workflows"

2. **Configure Environments:**
   - Go to "Settings" → "Environments"
   - Create `staging` and `production` environments
   - Configure protection rules and required reviewers

3. **Set up Branch Protection:**
   - Go to "Settings" → "Branches"
   - Add protection rules for `main` and `develop` branches
   - Require status checks to pass before merging

### 2. Secrets Configuration

1. **Navigate to Repository Settings:**
   - Go to "Settings" → "Secrets and variables" → "Actions"

2. **Add Required Secrets:**
   ```bash
   # Security
   SNYK_TOKEN=your_snyk_token
   
   # Railway (if using Railway)
   RAILWAY_TOKEN=your_railway_token
   RAILWAY_SERVICE=your_service_name
   RAILWAY_URL=https://your-app.railway.app
   
   # Docker Hub (optional)
   DOCKERHUB_TOKEN=your_dockerhub_token
   DOCKERHUB_USERNAME=your_dockerhub_username
   
   # Production (if using VPS/cloud)
   PRODUCTION_SSH_KEY=your_private_key
   PRODUCTION_HOST=your_server_hostname
   PRODUCTION_USER=your_server_username
   ```

### 3. Workflow Customization

#### For Railway Deployment:
1. Update `deploy-railway.yml` with your Railway project details
2. Ensure your Railway project is configured for automatic deployments

#### For Docker Deployment:
1. Update `deploy-docker.yml` with your container registry details
2. Configure your production server deployment logic

#### For Custom Production Deployment:
1. Update the deployment steps in `ci-cd.yml`
2. Add your specific deployment commands and health checks

## Usage Examples

### Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

3. **Push and create pull request:**
   ```bash
   git push origin feature/new-feature
   ```

4. **CI/CD Pipeline runs automatically:**
   - Quick test workflow runs on PR
   - Full CI/CD pipeline runs when merged to develop

### Release Workflow

1. **Create a release:**
   - Go to "Releases" in GitHub
   - Click "Create a new release"
   - Tag with semantic version (e.g., `v1.0.0`)

2. **Publish the release:**
   - This triggers the production deployment pipeline
   - Docker images are built and pushed
   - Application is deployed to production

### Monitoring and Debugging

#### View Workflow Runs:
- Go to "Actions" tab in your repository
- Click on any workflow to see detailed logs

#### Debug Failed Workflows:
1. Check the specific job that failed
2. Review the logs for error messages
3. Test locally to reproduce the issue
4. Fix and push changes

#### Common Issues:

**Build Failures:**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Review build scripts in package.json

**Test Failures:**
- Run tests locally to reproduce
- Check for environment-specific issues
- Verify test database configuration

**Deployment Failures:**
- Check secrets configuration
- Verify deployment environment setup
- Review deployment scripts and permissions

## Best Practices

### 1. Branch Strategy
- Use `main` for production releases
- Use `develop` for staging and integration
- Use feature branches for development
- Require pull request reviews

### 2. Testing Strategy
- Run unit tests on every commit
- Run integration tests before deployment
- Use staging environment for testing
- Implement automated performance testing

### 3. Security
- Regular security scans
- Dependency vulnerability monitoring
- Secrets management
- Environment isolation

### 4. Monitoring
- Health checks after deployment
- Performance monitoring
- Error tracking and alerting
- Log aggregation

## Troubleshooting

### Workflow Not Triggering
- Check branch protection rules
- Verify workflow file syntax
- Ensure GitHub Actions are enabled

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are available
- Review build scripts and configurations

### Deployment Issues
- Verify secrets are correctly configured
- Check deployment environment setup
- Review deployment scripts and permissions
- Test deployment process locally

### Performance Issues
- Monitor resource usage during builds
- Optimize Docker images
- Use caching strategies
- Consider parallel job execution

## Support

For issues with the CI/CD pipeline:

1. Check the GitHub Actions documentation
2. Review workflow logs for specific error messages
3. Test locally to reproduce issues
4. Update workflow files as needed
5. Consider using GitHub's built-in debugging tools

## Updates and Maintenance

### Regular Maintenance Tasks:
- Update Node.js version as needed
- Review and update dependencies
- Monitor security advisories
- Update workflow actions to latest versions
- Review and optimize build times

### Workflow Updates:
- Test changes in a separate branch
- Use workflow dispatch for testing
- Monitor performance impact
- Update documentation accordingly
