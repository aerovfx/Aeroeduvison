#!/bin/bash

# Nemotron-Orchestrator Setup Check Script
# Verifies Ollama and Nemotron are properly configured

set -e

echo "🔍 Checking Nemotron-Orchestrator Setup..."
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Ollama installed
echo "📦 Checking if Ollama is installed..."
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✅ Ollama is installed${NC}"
    ollama --version
else
    echo -e "${RED}❌ Ollama not found${NC}"
    echo "   Install from: https://ollama.ai/"
    exit 1
fi
echo ""

# Check 2: Ollama server running
echo "🌐 Checking if Ollama server is running..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama server is running${NC}"
else
    echo -e "${RED}❌ Ollama server not running${NC}"
    echo "   Start with: ollama serve"
    exit 1
fi
echo ""

# Check 3: Nemotron model installed
echo "🤖 Checking if nemotron-orchestrator is installed..."
if ollama list | grep -q "nemotron-orchestrator"; then
    echo -e "${GREEN}✅ nemotron-orchestrator is installed${NC}"
    ollama list | grep nemotron-orchestrator
else
    echo -e "${YELLOW}⚠️  nemotron-orchestrator not found${NC}"
    echo "   Pull with: ollama pull nemotron-orchestrator"
    echo ""
    read -p "   Would you like to pull it now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ollama pull nemotron-orchestrator
    else
        exit 1
    fi
fi
echo ""

# Check 4: Environment variables
echo "🔐 Checking environment variables..."
if [ -f .env.local ]; then
    echo -e "${GREEN}✅ .env.local exists${NC}"

    if grep -q "OPENAI_API_KEY=ollama" .env.local; then
        echo -e "${GREEN}✅ OPENAI_API_KEY configured${NC}"
    else
        echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set to 'ollama'${NC}"
    fi

    if grep -q "OPENAI_BASE_URL=http://localhost:11434/v1" .env.local; then
        echo -e "${GREEN}✅ OPENAI_BASE_URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  OPENAI_BASE_URL not configured${NC}"
    fi

    if grep -q "OPENAI_MODEL=nemotron-orchestrator" .env.local; then
        echo -e "${GREEN}✅ OPENAI_MODEL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  OPENAI_MODEL not set to 'nemotron-orchestrator'${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "   Create from: cp .env.local.example .env.local"
fi
echo ""

# Check 5: Test completion
echo "💬 Testing AI completion..."
RESPONSE=$(curl -s http://localhost:11434/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "nemotron-orchestrator",
        "messages": [
            {"role": "user", "content": "Say hello in Vietnamese"}
        ],
        "max_tokens": 50
    }')

if echo "$RESPONSE" | grep -q "content"; then
    echo -e "${GREEN}✅ AI completion successful${NC}"
    CONTENT=$(echo "$RESPONSE" | grep -o '"content":"[^"]*"' | sed 's/"content":"//' | sed 's/"$//')
    echo "   Response: $CONTENT"
else
    echo -e "${RED}❌ AI completion failed${NC}"
    echo "   Response: $RESPONSE"
    exit 1
fi
echo ""

# Summary
echo "============================================"
echo -e "${GREEN}🎉 All checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Run the full test: npm run test:nemotron"
echo "2. Start using Nemotron in your app"
echo "3. Check the guide: NEMOTRON_SETUP_GUIDE.md"
echo ""
