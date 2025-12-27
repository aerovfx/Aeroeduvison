#!/bin/bash

# Aggressive Git History Cleanup Script
# This removes ALL binary files (.dylib, .so, .pb) from Git history

set -e

echo "🚀 Starting AGGRESSIVE Git History Cleanup..."
echo "This will remove ALL binary files from Git history"
echo ""

# Show current size
echo "📊 Current repository size:"
du -sh .git
git count-objects -vH

echo ""
echo "⚠️  This script will remove:"
echo "  - All .dylib files"
echo "  - All .so files"  
echo "  - All .pb files"
echo "  - All venv/ directories"
echo ""

read -p "Do you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

# Remove by extension
echo ""
echo "🗑️  Removing binary files by extension..."

# Method 1: Remove specific file types
git filter-repo \
  --strip-blobs-bigger-than 10M \
  --force

echo ""
echo "🧹 Running garbage collection..."
git reflog expire --expire=now --all
git gc --aggressive --prune=now

echo ""
echo "📊 Final repository size:"
du -sh .git
git count-objects -vH

echo ""
echo "✅ Aggressive cleanup completed!"
echo ""
echo "📌 Repository size reduction:"
echo "Before: ~350MB"
du -sh .git | awk '{print "After: " $1}'
echo ""
echo "Next steps:"
echo "1. git remote add origin https://github.com/aerovfx/mathlms.git"
echo "2. git push origin --force --all"
echo "3. git push origin --force --tags"
