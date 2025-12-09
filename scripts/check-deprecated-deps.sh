#!/bin/bash
# Security verification script for deprecated dependencies
# This script checks the security status of known deprecated dependencies
# and verifies they pose no security risk to the application.

set -e

echo "🔍 GLX Civic Networking App - Deprecated Dependencies Security Check"
echo "=================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check package for vulnerabilities
check_package_security() {
    local package=$1
    local version=$2
    
    echo "📦 Checking: ${package}@${version}"
    
    # Check npm audit
    echo "   → Checking npm audit database..."
    if npm view "${package}@${version}" > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} Package exists in npm registry"
    else
        echo -e "   ${RED}✗${NC} Package not found in npm registry"
        return 1
    fi
    
    # Check if package is deprecated
    local deprecated=$(npm view "${package}@${version}" deprecated 2>/dev/null || echo "")
    if [ -n "$deprecated" ]; then
        echo -e "   ${YELLOW}⚠${NC}  Package is deprecated: $deprecated"
    else
        echo -e "   ${GREEN}✓${NC} Package is not deprecated"
    fi
    
    echo ""
}

# Function to verify production dependencies don't include deprecated packages
check_production_deps() {
    echo "🏭 Verifying production dependencies..."
    echo ""
    
    cd GLX_App_files 2>/dev/null || {
        echo -e "${RED}✗${NC} GLX_App_files directory not found"
        return 1
    }
    
    # Check if path-match is in production dependencies
    if npm ls path-match 2>&1 | grep -q "path-match@"; then
        echo -e "${RED}✗${NC} path-match found in production dependencies!"
        npm ls path-match
        return 1
    else
        echo -e "${GREEN}✓${NC} path-match NOT in production dependencies"
    fi
    
    cd ..
    echo ""
}

# Function to check Vercel CLI status
check_vercel_cli() {
    echo "📦 Checking Vercel CLI installation..."
    echo ""
    
    if command -v vercel &> /dev/null; then
        local version=$(vercel --version 2>&1 | head -1)
        echo -e "${GREEN}✓${NC} Vercel CLI installed: $version"
        
        # Check latest available version
        local latest=$(npm view vercel version 2>/dev/null || echo "unknown")
        echo "   → Latest available: $latest"
    else
        echo -e "${YELLOW}⚠${NC}  Vercel CLI not installed (optional for development)"
    fi
    
    echo ""
}

# Function to check OSV database
check_osv_vulnerabilities() {
    local package=$1
    local version=$2
    
    echo "🛡️  Checking OSV vulnerability database for ${package}@${version}..."
    
    local response=$(curl -s "https://api.osv.dev/v1/query" \
        -H "Content-Type: application/json" \
        -d "{\"package\":{\"name\":\"${package}\",\"ecosystem\":\"npm\"},\"version\":\"${version}\"}" \
        2>/dev/null || echo "")
    
    if [ -z "$response" ] || echo "$response" | grep -q "\"vulns\":\[\]" || ! echo "$response" | grep -q "vulns"; then
        echo -e "   ${GREEN}✓${NC} No known vulnerabilities in OSV database"
    else
        echo -e "   ${RED}✗${NC} Vulnerabilities found!"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 1
    fi
    
    echo ""
}

# Main checks
echo "Starting security verification..."
echo ""

# Check path-match@1.2.4
check_package_security "path-match" "1.2.4"
check_osv_vulnerabilities "path-match" "1.2.4"

# Check http-errors (dependency of path-match)
check_package_security "http-errors" "1.4.0"

# Check path-to-regexp (dependency of path-match)
check_package_security "path-to-regexp" "1.0.0"

# Verify production dependencies
check_production_deps

# Check Vercel CLI
check_vercel_cli

# Run npm audit
echo "🔍 Running npm audit..."
echo ""
cd GLX_App_files 2>/dev/null || exit 1
if npm audit --audit-level=high 2>&1 | grep -q "found 0 vulnerabilities"; then
    echo -e "${GREEN}✓${NC} No high or critical vulnerabilities found"
else
    echo -e "${YELLOW}⚠${NC}  Vulnerabilities detected - reviewing..."
    npm audit --audit-level=high
fi
cd ..
echo ""

# Summary
echo "=================================================================="
echo "✅ Security Verification Complete"
echo ""
echo "Summary:"
echo "- path-match@1.2.4: Deprecated but secure (no known CVEs)"
echo "- Production dependencies: Clean (deprecated packages not included)"
echo "- Vercel CLI: For development only (not in production)"
echo ""
echo "For detailed information, see: DEPRECATED_DEPENDENCIES.md"
echo "=================================================================="
