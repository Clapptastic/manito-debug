#!/bin/bash

# Test All Edge Functions

set -e

echo "🚀 Testing All Supabase Edge Functions"
echo "======================================"

# Check if Supabase is running
if ! curl -s http://127.0.0.1:54321/health > /dev/null; then
  echo "❌ Supabase is not running locally"
  echo "   Please run: supabase start"
  exit 1
fi

# Check if functions server is running
if ! curl -s http://127.0.0.1:54321/functions/v1 > /dev/null; then
  echo "❌ Edge functions server is not running"
  echo "   Please run: supabase functions serve"
  exit 1
fi

echo "✅ Supabase services are running"
echo ""

# Make test scripts executable
chmod +x scripts/test-edge-functions/*.sh

# Test each function
functions_to_test=(
  "api-proxy"
  "analyze-code"
)

total_tests=0
passed_tests=0
failed_tests=0

for func in "${functions_to_test[@]}"; do
  echo "🧪 Testing $func function..."
  echo "----------------------------------------"
  
  test_script="scripts/test-edge-functions/test-$func.sh"
  
  if [ -f "$test_script" ]; then
    total_tests=$((total_tests + 1))
    
    if bash "$test_script"; then
      echo "✅ $func: ALL TESTS PASSED"
      passed_tests=$((passed_tests + 1))
    else
      echo "❌ $func: SOME TESTS FAILED"
      failed_tests=$((failed_tests + 1))
    fi
  else
    echo "⚠️  Test script not found: $test_script"
  fi
  
  echo ""
done

# Test database connectivity
echo "🗄️  Testing Database Connectivity..."
echo "----------------------------------------"

if psql "postgresql://postgres:postgres@127.0.0.1:54325/postgres" -c "SELECT 'Database connection successful' as status;" > /dev/null 2>&1; then
  echo "✅ Database connection: PASSED"
else
  echo "❌ Database connection: FAILED"
  failed_tests=$((failed_tests + 1))
fi

total_tests=$((total_tests + 1))
if [ $? -eq 0 ]; then
  passed_tests=$((passed_tests + 1))
fi

echo ""

# Test edge function tables
echo "📊 Testing Edge Function Tables..."
echo "----------------------------------------"

tables_to_check=(
  "api_requests"
  "webhook_events"
  "ai_insights"
  "analysis_embeddings"
  "scan_queue"
  "rate_limits"
  "function_logs"
)

table_tests=0
table_passed=0

for table in "${tables_to_check[@]}"; do
  table_tests=$((table_tests + 1))
  
  if psql "postgresql://postgres:postgres@127.0.0.1:54325/postgres" -c "SELECT COUNT(*) FROM $table;" > /dev/null 2>&1; then
    echo "✅ Table $table: EXISTS"
    table_passed=$((table_passed + 1))
  else
    echo "❌ Table $table: MISSING"
  fi
done

echo ""

# Summary
echo "📋 Test Summary"
echo "==============="
echo "Edge Functions Tested: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $failed_tests"
echo ""
echo "Database Tables Checked: $table_tests"
echo "Found: $table_passed"
echo "Missing: $((table_tests - table_passed))"
echo ""

if [ $failed_tests -eq 0 ] && [ $table_passed -eq $table_tests ]; then
  echo "🎉 ALL TESTS PASSED!"
  echo ""
  echo "✅ Edge functions are ready for deployment"
  echo "✅ Database schema is properly set up"
  echo "✅ All systems are operational"
  echo ""
  echo "🚀 Next steps:"
  echo "   1. Set up environment variables for production"
  echo "   2. Deploy to Supabase: npm run supabase:functions:deploy"
  echo "   3. Configure webhooks if needed"
  echo "   4. Update client code to use edge functions"
else
  echo "⚠️  SOME TESTS FAILED"
  echo ""
  echo "Please review the failed tests above and fix any issues before deployment."
  exit 1
fi
