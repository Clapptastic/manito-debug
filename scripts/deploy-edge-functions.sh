#!/bin/bash

# Deploy Supabase Edge Functions
# This script deploys all edge functions to Supabase

set -e

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run 'supabase login' first."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Deploy each function
functions=(
    "api-proxy"
    "analyze-code"
    "ai-analysis"
    "webhooks"
    "process-scan"
)

echo "📦 Deploying functions..."

for func in "${functions[@]}"; do
    echo "  Deploying $func..."
    if supabase functions deploy "$func" --project-ref "${SUPABASE_PROJECT_REF:-}"; then
        echo "  ✅ $func deployed successfully"
    else
        echo "  ❌ Failed to deploy $func"
        exit 1
    fi
done

echo ""
echo "🎉 All edge functions deployed successfully!"
echo ""
echo "📋 Function URLs:"
for func in "${functions[@]}"; do
    echo "  $func: https://${SUPABASE_PROJECT_REF:-your-project}.supabase.co/functions/v1/$func"
done

echo ""
echo "🔧 Next steps:"
echo "  1. Set up environment variables in Supabase Dashboard"
echo "  2. Configure webhooks if using the webhooks function"
echo "  3. Update your client code to use the new function URLs"
echo "  4. Test the functions using the provided test scripts"

echo ""
echo "📚 Documentation: https://supabase.com/docs/guides/functions"
