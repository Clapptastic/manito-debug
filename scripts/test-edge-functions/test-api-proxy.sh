#!/bin/bash

# Test API Proxy Edge Function

set -e

echo "🧪 Testing API Proxy Edge Function..."

BASE_URL="http://127.0.0.1:54321/functions/v1"
FUNCTION_URL="$BASE_URL/api-proxy"

echo "📍 Function URL: $FUNCTION_URL"

# Test 1: Basic health check (OPTIONS request)
echo ""
echo "Test 1: CORS preflight request"
response=$(curl -s -X OPTIONS "$FUNCTION_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
if [ "$http_status" = "200" ]; then
  echo "✅ CORS preflight: PASSED"
else
  echo "❌ CORS preflight: FAILED (Status: $http_status)"
fi

# Test 2: Test with mock OpenAI request (will fail without API key, but should handle gracefully)
echo ""
echo "Test 2: Mock OpenAI request (without API key)"
response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello, this is a test"}],
    "temperature": 0.7,
    "max_tokens": 50
  }' \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Response Status: $http_status"
echo "Response Body: $response_body"

if [ "$http_status" = "500" ]; then
  echo "✅ Error handling: PASSED (Expected error without API key)"
else
  echo "⚠️  Unexpected status code: $http_status"
fi

# Test 3: Test with invalid provider
echo ""
echo "Test 3: Invalid provider request"
response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "invalid_provider",
    "model": "test-model",
    "messages": [{"role": "user", "content": "test"}]
  }' \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Response Status: $http_status"
echo "Response Body: $response_body"

if [ "$http_status" = "500" ] && echo "$response_body" | grep -q "Unsupported provider"; then
  echo "✅ Invalid provider handling: PASSED"
else
  echo "❌ Invalid provider handling: FAILED"
fi

# Test 4: Test with malformed JSON
echo ""
echo "Test 4: Malformed JSON request"
response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "json"' \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$http_status" = "500" ]; then
  echo "✅ Malformed JSON handling: PASSED"
else
  echo "❌ Malformed JSON handling: FAILED (Status: $http_status)"
fi

echo ""
echo "🎯 API Proxy tests completed!"
echo ""
echo "💡 To test with real API keys:"
echo "   1. Set OPENAI_API_KEY environment variable"
echo "   2. Restart supabase functions serve"
echo "   3. Run this test again"
