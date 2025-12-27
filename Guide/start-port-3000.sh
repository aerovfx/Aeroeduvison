#!/bin/bash

echo "🚀 Starting server on PORT 3000..."
echo ""

# Set port 3000
export PORT=3000
export NEXTAUTH_URL="http://localhost:3000"

# Start Next.js dev server
npm run dev


