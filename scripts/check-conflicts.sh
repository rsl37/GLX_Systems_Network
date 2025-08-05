#!/bin/bash

# GLX App - Merge Conflict Detection Script
# Use this script to check for unmerged files and conflicts

echo "🔍 GLX App - Merge Conflict Detection"
echo "======================================="
echo ""

# Check current branch
echo "📍 Current Branch:"
git branch --show-current
echo ""

# Check git status
echo "📋 Git Status:"
git status --porcelain
if [ $? -eq 0 ] && [ -z "$(git status --porcelain)" ]; then
    echo "✅ Working tree is clean"
else
    echo "⚠️  Working tree has changes"
fi
echo ""

# Check for unmerged files
echo "🔀 Unmerged Files Check:"
unmerged_files=$(git ls-files -u)
if [ -z "$unmerged_files" ]; then
    echo "✅ No unmerged files detected"
else
    echo "❌ Unmerged files found:"
    echo "$unmerged_files"
fi
echo ""

# Check for conflict markers in common file types
echo "⚡ Conflict Markers Search:"
conflict_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -exec grep -l "<<<<<<< HEAD\|=======\|>>>>>>> " {} \; 2>/dev/null | grep -v "ANALYSIS_REPORT\|SOLVING_UNMERGE\|REPOSITORY_ANALYSIS")

if [ -z "$conflict_files" ]; then
    echo "✅ No conflict markers found in source files"
else
    echo "❌ Conflict markers found in:"
    echo "$conflict_files"
fi
echo ""

# Build system check
echo "🏗️  Build System Check:"
if [ -f "GLX_App_files/package.json" ]; then
    cd GLX_App_files
    echo "📦 Checking dependencies..."
    if npm list --depth=0 > /dev/null 2>&1; then
        echo "✅ Dependencies are satisfied"
    else
        echo "⚠️  Dependency issues detected - run 'npm install'"
    fi
    
    echo "🔨 Testing build..."
    if npm run build > /dev/null 2>&1; then
        echo "✅ Build successful"
    else
        echo "❌ Build failed - check for compilation errors"
    fi
    cd ..
else
    echo "⚠️  Package.json not found in expected location"
fi
echo ""

# Summary
echo "📊 Summary:"
if [ -z "$unmerged_files" ] && [ -z "$conflict_files" ]; then
    echo "🎉 Repository is clean and ready for development!"
else
    echo "⚠️  Issues detected - review above findings"
fi

echo ""
echo "For detailed analysis, see: MERGE_CONFLICT_STATUS_REPORT.md"