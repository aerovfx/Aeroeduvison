#!/bin/bash

# Quick API validation - no auth required for local testing
# This tests the basic connectivity and schema validation

BASE_URL="http://localhost:3000"

echo "═══════════════════════════════════════════════════"
echo "Quick API Validation Tests"
echo "═══════════════════════════════════════════════════"
echo ""

# Test 1: Health check - see if server responds
echo "1️⃣  Testing server health..."
echo "GET /api/health (if exists)"
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/health" || echo "Server not running yet - that's OK, will start it"
echo ""

# Test 2: Verify database - check grading tables exist
echo "2️⃣  Database validation:"
echo "Run this in a separate terminal:"
echo ""
echo "psql \$DATABASE_URL -c \"SELECT COUNT(*) as rubric_count FROM \\\"GradingRubric\\\";\""
echo ""

# Test 3: Check seed data exists
echo "3️⃣  Verify seed data was created:"
echo "psql \$DATABASE_URL -c \"SELECT id, name, subject, grade FROM \\\"KgConcept\\\" LIMIT 3;\""
echo ""

# Test 4: View grading schema
echo "4️⃣  View grading rubric structure:"
echo "psql \$DATABASE_URL -c \"SELECT * FROM \\\"GradingRubric\\\" LIMIT 1;\""
echo ""

echo "═══════════════════════════════════════════════════"
echo ""
echo "Next Steps:"
echo "1. Start the Next.js dev server: npm run dev"
echo "2. In another terminal, run database queries above"
echo "3. Then test API endpoints with curl commands"
echo ""
