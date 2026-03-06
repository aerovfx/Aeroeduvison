#!/bin/bash

# Git History Cleanup Script
# This will remove large binary files and venv directories from Git history

set -e

echo "🚀 Starting Git History Cleanup..."
echo ""

# 1. Backup current state
echo "📦 Step 1: Creating backup..."
BACKUP_DIR="/Users/vietchung/lmsmath-backup-$(date +%Y%m%d-%H%M%S)"
echo "Backup location: $BACKUP_DIR"
# Note: User should manually backup if needed

# 2. Show current size
echo ""
echo "📊 Step 2: Current repository size:"
du -sh .git

# 3. Create paths file for removal
echo ""
echo "📝 Step 3: Creating removal list..."
cat > /tmp/git-cleanup-comprehensive.txt << 'EOF'
python-simulations/ocr-grading/venv/
python-simulations/ocr-simulation/venv/
python-simulations/ocr-simulation/models/
python-ocr/venv/
EOF

echo "Files/directories to remove from history:"
cat /tmp/git-cleanup-comprehensive.txt

# 4. Run git-filter-repo (DRY RUN first)
echo ""
echo "🔍 Step 4: Running DRY RUN first..."
git filter-repo --invert-paths --paths-from-file /tmp/git-cleanup-comprehensive.txt --force --dry-run

echo ""
echo "✅ DRY RUN completed successfully!"
echo ""
echo "⚠️  WARNING: The next step will REWRITE Git history!"
echo "This is IRREVERSIBLE. Make sure you have a backup."
echo ""
read -p "Do you want to proceed with the actual cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

# 5. Actual cleanup
echo ""
echo "🗑️  Step 5: Performing actual cleanup..."
git filter-repo --invert-paths --paths-from-file /tmp/git-cleanup-comprehensive.txt --force

# 6. Aggressive garbage collection
echo ""
echo "🧹 Step 6: Running aggressive garbage collection..."
git reflog expire --expire=now --all
git gc --aggressive --prune=now

# 7. Show results
echo ""
echo "📊 Step 7: Final repository size:"
du -sh .git

echo ""
echo "✅ Git history cleanup completed!"
echo ""
echo "📌 Next steps:"
echo "1. Test your repository locally"
echo "2. If everything works, force push to remote:"
echo "   git remote add origin https://github.com/aerovfx/mathlms.git"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "⚠️  Note: All collaborators will need to re-clone the repository!"
