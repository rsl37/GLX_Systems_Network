#!/bin/bash
# Code Scanning Setup Verification Script
# This script verifies that the CodeQL workflow is properly configured

echo "🔍 GALAX Code Scanning Setup Verification"
echo "=========================================="
echo

# Check if CodeQL workflow exists
if [ -f ".github/workflows/codeql.yml" ]; then
    echo "✅ CodeQL workflow file exists"
else
    echo "❌ CodeQL workflow file missing"
    exit 1
fi

# Check if CodeQL config exists
if [ -f ".github/codeql-config.yml" ]; then
    echo "✅ CodeQL configuration file exists"
else
    echo "❌ CodeQL configuration file missing"
    exit 1
fi

# Validate YAML syntax
if command -v yamllint &> /dev/null; then
    if yamllint .github/workflows/codeql.yml &> /dev/null; then
        echo "✅ CodeQL workflow YAML syntax is valid"
    else
        echo "⚠️  CodeQL workflow YAML has formatting warnings (non-critical)"
    fi
else
    echo "ℹ️  yamllint not available, skipping YAML validation"
fi

# Check required directories
if [ -d "GALAX_App_files" ]; then
    echo "✅ GALAX_App_files directory exists"
else
    echo "❌ GALAX_App_files directory missing"
    exit 1
fi

if [ -f "GALAX_App_files/package.json" ]; then
    echo "✅ Application package.json exists"
else
    echo "❌ Application package.json missing"
    exit 1
fi

echo
echo "🎯 Expected Outcome:"
echo "Once this PR is merged, GitHub should automatically:"
echo "  1. Detect the new CodeQL workflow"
echo "  2. Enable Code Scanning in repository settings"
echo "  3. Start generating security analysis results"
echo "  4. Display results in the Security tab"
echo
echo "📋 Verification Steps After Merge:"
echo "  1. Go to repository Settings > Code security and analysis"
echo "  2. Verify 'Code scanning' shows as 'Enabled'"
echo "  3. Check Security tab for CodeQL analysis results"
echo "  4. Verify workflow runs successfully on next push/PR"
echo
echo "✅ Code Scanning setup verification complete!"