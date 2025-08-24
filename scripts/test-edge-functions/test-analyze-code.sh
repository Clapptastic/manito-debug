#!/bin/bash

# Test Code Analysis Edge Function

set -e

echo "🧪 Testing Code Analysis Edge Function..."

BASE_URL="http://127.0.0.1:54321/functions/v1"
FUNCTION_URL="$BASE_URL/analyze-code"

echo "📍 Function URL: $FUNCTION_URL"

# Test 1: Basic JavaScript analysis
echo ""
echo "Test 1: JavaScript code analysis"

# Create a test scan record first
SCAN_ID=$(uuidgen)
PROJECT_ID=$(uuidgen)

# Insert test project and scan into database
psql "postgresql://postgres:postgres@127.0.0.1:54325/postgres" -c "
INSERT INTO projects (id, name, description) VALUES ('$PROJECT_ID', 'Test Project', 'Test project for edge functions');
INSERT INTO scans (id, project_id, status, scan_type) VALUES ('$SCAN_ID', '$PROJECT_ID', 'processing', 'test');
"

response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"files\": [
      {
        \"path\": \"test.js\",
        \"content\": \"console.log('Hello World');\\neval('dangerous code');\\ndocument.getElementById('test').innerHTML = userInput;\",
        \"language\": \"javascript\"
      }
    ],
    \"scanId\": \"$SCAN_ID\",
    \"projectId\": \"$PROJECT_ID\",
    \"analysisType\": \"full\"
  }" \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Response Status: $http_status"
echo "Response Body: $response_body"

if [ "$http_status" = "200" ]; then
  echo "✅ JavaScript analysis: PASSED"
  
  # Check if issues were detected
  if echo "$response_body" | grep -q "eval" && echo "$response_body" | grep -q "innerHTML"; then
    echo "✅ Security issues detected: PASSED"
  else
    echo "⚠️  Security issues not detected as expected"
  fi
else
  echo "❌ JavaScript analysis: FAILED (Status: $http_status)"
fi

# Test 2: TypeScript analysis
echo ""
echo "Test 2: TypeScript code analysis"

SCAN_ID_2=$(uuidgen)
psql "postgresql://postgres:postgres@127.0.0.1:54325/postgres" -c "
INSERT INTO scans (id, project_id, status, scan_type) VALUES ('$SCAN_ID_2', '$PROJECT_ID', 'processing', 'test');
"

response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"files\": [
      {
        \"path\": \"test.ts\",
        \"content\": \"const data: any = fetchData();\\nconst result = data!.value;\",
        \"language\": \"typescript\"
      }
    ],
    \"scanId\": \"$SCAN_ID_2\",
    \"projectId\": \"$PROJECT_ID\",
    \"analysisType\": \"syntax\"
  }" \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Response Status: $http_status"

if [ "$http_status" = "200" ]; then
  echo "✅ TypeScript analysis: PASSED"
  
  # Check if TypeScript-specific issues were detected
  if echo "$response_body" | grep -q "any"; then
    echo "✅ TypeScript 'any' type detected: PASSED"
  else
    echo "⚠️  TypeScript issues not detected as expected"
  fi
else
  echo "❌ TypeScript analysis: FAILED (Status: $http_status)"
fi

# Test 3: Package.json dependency analysis
echo ""
echo "Test 3: Package.json dependency analysis"

SCAN_ID_3=$(uuidgen)
psql "postgresql://postgres:postgres@127.0.0.1:54325/postgres" -c "
INSERT INTO scans (id, project_id, status, scan_type) VALUES ('$SCAN_ID_3', '$PROJECT_ID', 'processing', 'test');
"

response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"files\": [
      {
        \"path\": \"package.json\",
        \"content\": \"{\\\"name\\\": \\\"test\\\", \\\"dependencies\\\": {\\\"express\\\": \\\"^4.18.0\\\"}, \\\"devDependencies\\\": {\\\"jest\\\": \\\"^29.0.0\\\"}}\",
        \"language\": \"json\"
      }
    ],
    \"scanId\": \"$SCAN_ID_3\",
    \"projectId\": \"$PROJECT_ID\",
    \"analysisType\": \"dependencies\"
  }" \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Response Status: $http_status"

if [ "$http_status" = "200" ]; then
  echo "✅ Package.json analysis: PASSED"
  
  # Check if dependencies were extracted
  if echo "$response_body" | grep -q "express" && echo "$response_body" | grep -q "jest"; then
    echo "✅ Dependencies extracted: PASSED"
  else
    echo "⚠️  Dependencies not extracted as expected"
  fi
else
  echo "❌ Package.json analysis: FAILED (Status: $http_status)"
fi

# Test 4: Error handling with invalid scan ID
echo ""
echo "Test 4: Error handling with invalid scan ID"

response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{"path": "test.js", "content": "console.log(\"test\");", "language": "javascript"}],
    "scanId": "invalid-uuid",
    "projectId": "invalid-uuid",
    "analysisType": "syntax"
  }' \
  -w "HTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$http_status" = "500" ]; then
  echo "✅ Invalid UUID handling: PASSED"
else
  echo "❌ Invalid UUID handling: FAILED (Status: $http_status)"
fi

# Cleanup test data
echo ""
echo "🧹 Cleaning up test data..."
psql "postgresql://postgres:postgres@127.0.0.1:54325/postgres" -c "
DELETE FROM scans WHERE project_id = '$PROJECT_ID';
DELETE FROM projects WHERE id = '$PROJECT_ID';
"

echo ""
echo "🎯 Code Analysis tests completed!"
