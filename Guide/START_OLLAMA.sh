#!/bin/bash
echo "🦙 Starting Ollama service..."
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama not installed!"
    echo "Install: https://ollama.ai/download"
    exit 1
fi

# Check if model is available
if ! ollama list | grep -q "llama3.2"; then
    echo "⚠️ Model llama3.2 not found"
    echo "Pulling model (2GB)..."
    ollama pull llama3.2
fi

echo "✅ Ollama ready"
echo ""
echo "Starting Ollama server on http://localhost:11434..."
echo ""

# Start Ollama server
ollama serve
