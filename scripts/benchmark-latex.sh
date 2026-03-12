#!/bin/bash

# LaTeX Compilation Benchmark Runner
# Usage: ./scripts/benchmark-latex.sh

echo "🚀 LaTeX Compilation Benchmark"
echo "================================"
echo ""

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "❌ tsx not found. Installing..."
    npm install -g tsx
fi

# Run benchmark
echo "Running benchmark..."
echo ""

cd "$(dirname "$0")/.."

tsx scripts/benchmark-latex.ts

echo ""
echo "✅ Benchmark complete!"
echo ""
echo "📄 View results:"
echo "   - Console output above"
echo "   - JSON: tmp/benchmark-results.json"
