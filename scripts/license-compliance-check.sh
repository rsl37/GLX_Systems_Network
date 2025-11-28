#!/bin/bash

# GLX Civic Networking App - License Compliance Check Script
# This script performs comprehensive license compliance checking for the entire project

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/license-compliance-reports"
TIMESTAMP=$(date -u '+%Y%m%d_%H%M%S')

# License compatibility matrix for PolyForm Shield License 1.0.0
COMPATIBLE_LICENSES=(
    "MIT"
    "BSD-2-Clause"
    "BSD-3-Clause"
    "ISC"
    "Apache-2.0"
    "Unlicense"
    "WTFPL"
    "CC0-1.0"
    "0BSD"
)

INCOMPATIBLE_LICENSES=(
    "GPL-2.0"
    "GPL-3.0"
    "AGPL-1.0"
    "AGPL-3.0"
    "LGPL-2.0"
    "LGPL-2.1"
    "LGPL-3.0"
    "EPL-1.0"
    "EPL-2.0"
    "CDDL-1.0"
    "CDDL-1.1"
    "EUPL-1.1"
    "EUPL-1.2"
    "OSL-3.0"
    "RPSL-1.0"
    "RSCPL"
)

# Note: MPL-1.1 and MPL-2.0 moved to REVIEW_REQUIRED as they are weak copyleft licenses
# that only require modifications to MPL-licensed files to be shared, making them
# compatible for use as dependencies in proprietary projects (e.g., @vercel/analytics)
REVIEW_REQUIRED_LICENSES=(
    "Apache-1.1"
    "BSD-4-Clause"
    "CC-BY-4.0"
    "CC-BY-SA-4.0"
    "LPPL-1.3c"
    "MPL-1.1"
    "MPL-2.0"
    "MS-PL"
    "MS-RL"
    "OFL-1.1"
    "Zlib"
)

# Create report directory
mkdir -p "$REPORT_DIR"

# Main report file
MAIN_REPORT="$REPORT_DIR/license-compliance-report-$TIMESTAMP.txt"

# Initialize report
cat > "$MAIN_REPORT" << EOF
GLX Civic Networking App - License Compliance Report
=====================================================

Report Generated: $(date -u)
Project Root: $PROJECT_ROOT
Main License: PolyForm Shield License 1.0.0

EOF

log_info "Starting comprehensive license compliance check..."

# Function to check if license is compatible
check_license_compatibility() {
    local license="$1"
    local package="$2"
    
    # Normalize license string
    license=$(echo "$license" | tr '[:lower:]' '[:upper:]' | sed 's/[[:space:]]//g')
    
    # Check against compatible licenses
    for compat in "${COMPATIBLE_LICENSES[@]}"; do
        if [[ "$license" == *"$(echo "$compat" | tr '[:lower:]' '[:upper:]')"* ]]; then
            echo "COMPATIBLE"
            return 0
        fi
    done
    
    # Check against incompatible licenses
    for incompat in "${INCOMPATIBLE_LICENSES[@]}"; do
        if [[ "$license" == *"$(echo "$incompat" | tr '[:lower:]' '[:upper:]')"* ]]; then
            echo "INCOMPATIBLE"
            return 1
        fi
    done
    
    # Check against review required licenses
    for review in "${REVIEW_REQUIRED_LICENSES[@]}"; do
        if [[ "$license" == *"$(echo "$review" | tr '[:lower:]' '[:upper:]')"* ]]; then
            echo "REVIEW_REQUIRED"
            return 0
        fi
    done
    
    echo "UNKNOWN"
    return 0
}

# Function to scan NPM dependencies
scan_npm_dependencies() {
    local dir="$1"
    local name="$2"
    
    log_info "Scanning NPM dependencies in $dir ($name)"
    
    if [[ ! -f "$dir/package.json" ]]; then
        log_warning "No package.json found in $dir"
        return 0
    fi
    
    cd "$dir"
    
    echo "" >> "$MAIN_REPORT"
    echo "=== $name Dependencies ===" >> "$MAIN_REPORT"
    echo "Directory: $dir" >> "$MAIN_REPORT"
    echo "" >> "$MAIN_REPORT"
    
    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        log_warning "No node_modules found in $dir, installing dependencies..."
        npm install --prefer-offline --no-audit --no-fund || {
            log_error "Failed to install dependencies in $dir"
            echo "❌ Failed to install dependencies" >> "$MAIN_REPORT"
            cd "$PROJECT_ROOT"
            return 1
        }
    fi
    
    # Generate license report
    local temp_report="$REPORT_DIR/temp-${name,,}-licenses.json"
    
    if command -v license-checker >/dev/null 2>&1; then
        license-checker --production --json --out "$temp_report" || {
            log_error "license-checker failed for $name"
            echo "❌ License scanning failed" >> "$MAIN_REPORT"
            cd "$PROJECT_ROOT"
            return 1
        }
        
        # Process the license report
        if [[ -f "$temp_report" ]]; then
            local violations=0
            local warnings=0
            local total=0
            
            while IFS= read -r line; do
                if [[ "$line" == *'"'*'": {' ]]; then
                    # Extract package name
                    local pkg=$(echo "$line" | sed 's/.*"\([^"]*\)": {.*/\1/')
                    
                    # Read the next few lines to get license info
                    local license_info=""
                    local counter=0
                    while IFS= read -r next_line && [[ $counter -lt 10 ]]; do
                        if [[ "$next_line" == *'"licenses":'* ]]; then
                            license_info=$(echo "$next_line" | sed 's/.*"licenses": *"\([^"]*\)".*/\1/')
                            break
                        elif [[ "$next_line" == *'"licenseText":'* ]]; then
                            # Try to infer license from license text (fallback)
                            if [[ "$next_line" == *"MIT"* ]]; then
                                license_info="MIT"
                            elif [[ "$next_line" == *"Apache"* ]]; then
                                license_info="Apache-2.0"
                            elif [[ "$next_line" == *"BSD"* ]]; then
                                license_info="BSD"
                            fi
                            break
                        fi
                        ((counter++))
                    done < <(tail -n +$(($(grep -n "$line" "$temp_report" | cut -d: -f1) + 1)) "$temp_report")
                    
                    # Special handling for main application packages
                    if [[ "$pkg" == "glx-civic-platform@"* || "$pkg" == "glx-civic-networking-app@"* || "$pkg" == "glx-mcp-servers@"* ]]; then
                        echo "✅ $pkg: PolyForm-Shield-1.0.0 (Main Application)" >> "$MAIN_REPORT"
                        ((total++))
                    elif [[ -n "$license_info" && "$license_info" != "null" ]]; then
                        local compatibility=$(check_license_compatibility "$license_info" "$pkg")
                        ((total++))
                        
                        case "$compatibility" in
                            "COMPATIBLE")
                                echo "✅ $pkg: $license_info (Compatible)" >> "$MAIN_REPORT"
                                ;;
                            "INCOMPATIBLE")
                                echo "❌ $pkg: $license_info (INCOMPATIBLE)" >> "$MAIN_REPORT"
                                ((violations++))
                                ;;
                            "REVIEW_REQUIRED")
                                echo "⚠️  $pkg: $license_info (Review Required)" >> "$MAIN_REPORT"
                                ((warnings++))
                                ;;
                            "UNKNOWN")
                                echo "❓ $pkg: $license_info (Unknown - Review Required)" >> "$MAIN_REPORT"
                                ((warnings++))
                                ;;
                        esac
                    else
                        echo "❓ $pkg: Unknown license (Review Required)" >> "$MAIN_REPORT"
                        ((warnings++))
                        ((total++))
                    fi
                fi
            done < "$temp_report"
            
            echo "" >> "$MAIN_REPORT"
            echo "Summary for $name:" >> "$MAIN_REPORT"
            echo "  Total packages: $total" >> "$MAIN_REPORT"
            echo "  Violations: $violations" >> "$MAIN_REPORT"
            echo "  Warnings: $warnings" >> "$MAIN_REPORT"
            echo "  Compatible: $((total - violations - warnings))" >> "$MAIN_REPORT"
            
            if [[ $violations -gt 0 ]]; then
                log_error "$name has $violations license violations"
                cd "$PROJECT_ROOT"
                return 1
            elif [[ $warnings -gt 0 ]]; then
                log_warning "$name has $warnings packages requiring license review"
            else
                log_success "$name license compliance check passed"
            fi
        else
            log_error "Failed to generate license report for $name"
            cd "$PROJECT_ROOT"
            return 1
        fi
    else
        log_error "license-checker not found. Please install: npm install -g license-checker"
        cd "$PROJECT_ROOT"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    return 0
}

# Function to check external project licenses
check_external_licenses() {
    log_info "Checking external project licenses..."
    
    echo "" >> "$MAIN_REPORT"
    echo "=== External Projects License Check ===" >> "$MAIN_REPORT"
    echo "" >> "$MAIN_REPORT"
    
    # Check Resgrid project
    if [[ -d "$PROJECT_ROOT/external/resgrid" ]]; then
        echo "Resgrid Project:" >> "$MAIN_REPORT"
        
        if [[ -f "$PROJECT_ROOT/external/resgrid/LICENSE" ]]; then
            local resgrid_license=$(head -n 5 "$PROJECT_ROOT/external/resgrid/LICENSE" | grep -o "Apache License" || echo "Unknown")
            echo "  License: $resgrid_license" >> "$MAIN_REPORT"
            
            if [[ "$resgrid_license" == "Apache License" ]]; then
                echo "  Status: ✅ Compatible (Apache-2.0)" >> "$MAIN_REPORT"
                log_success "Resgrid project license is compatible"
            else
                echo "  Status: ❓ Unknown license - manual review required" >> "$MAIN_REPORT"
                log_warning "Resgrid project license requires manual review"
            fi
        else
            echo "  Status: ❌ No LICENSE file found" >> "$MAIN_REPORT"
            log_error "Resgrid project missing LICENSE file"
        fi
        
        # Check for package.json files in Resgrid
        local resgrid_packages=($(find "$PROJECT_ROOT/external/resgrid" -name "package.json" -type f))
        if [[ ${#resgrid_packages[@]} -gt 0 ]]; then
            echo "  NPM packages found: ${#resgrid_packages[@]}" >> "$MAIN_REPORT"
            echo "  Packages: ${resgrid_packages[*]}" >> "$MAIN_REPORT"
        fi
    else
        echo "No external/resgrid directory found" >> "$MAIN_REPORT"
    fi
}

# Function to validate THIRD_PARTY_LICENSES.md
validate_license_documentation() {
    log_info "Validating license documentation..."
    
    echo "" >> "$MAIN_REPORT"
    echo "=== License Documentation Validation ===" >> "$MAIN_REPORT"
    echo "" >> "$MAIN_REPORT"
    
    if [[ -f "$PROJECT_ROOT/THIRD_PARTY_LICENSES.md" ]]; then
        echo "✅ THIRD_PARTY_LICENSES.md exists" >> "$MAIN_REPORT"
        
        # Check last modification time
        local last_modified
        if [[ "$(uname)" == "Darwin" ]]; then
            last_modified=$(stat -f %m "$PROJECT_ROOT/THIRD_PARTY_LICENSES.md")
        else
            last_modified=$(stat -c %Y "$PROJECT_ROOT/THIRD_PARTY_LICENSES.md")
        fi
        local days_old=$(( ($(date +%s) - last_modified) / 86400 ))
        
        echo "Last updated: $days_old days ago" >> "$MAIN_REPORT"
        
        if [[ $days_old -gt 90 ]]; then
            echo "⚠️  Documentation is over 90 days old - consider updating" >> "$MAIN_REPORT"
            log_warning "THIRD_PARTY_LICENSES.md is over 90 days old"
        else
            echo "✅ Documentation is up to date" >> "$MAIN_REPORT"
        fi
        
        # Check for major dependencies documentation
        if [[ -f "$PROJECT_ROOT/GLX_App_files/package.json" ]]; then
            local major_deps=("react" "express" "tailwindcss" "socket.io" "leaflet" "vite" "typescript")
            echo "" >> "$MAIN_REPORT"
            echo "Major dependency documentation check:" >> "$MAIN_REPORT"
            
            for dep in "${major_deps[@]}"; do
                if grep -q "$dep" "$PROJECT_ROOT/THIRD_PARTY_LICENSES.md"; then
                    echo "  ✅ $dep is documented" >> "$MAIN_REPORT"
                else
                    echo "  ⚠️  $dep may not be documented" >> "$MAIN_REPORT"
                    log_warning "$dep may not be documented in THIRD_PARTY_LICENSES.md"
                fi
            done
        fi
    else
        echo "❌ THIRD_PARTY_LICENSES.md not found" >> "$MAIN_REPORT"
        log_error "THIRD_PARTY_LICENSES.md not found"
        return 1
    fi
}

# Function to check API licenses
check_api_licenses() {
    log_info "Checking external API usage and licenses..."
    
    echo "" >> "$MAIN_REPORT"
    echo "=== External API License Check ===" >> "$MAIN_REPORT"
    echo "" >> "$MAIN_REPORT"
    
    local api_found=false
    
    # Check for Google Maps API
    if grep -r "googlemaps\|maps\.googleapis\.com" "$PROJECT_ROOT/GLX_App_files/" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" >/dev/null 2>&1; then
        echo "📍 Google Maps API detected" >> "$MAIN_REPORT"
        echo "   License: Google Maps Platform Terms of Service" >> "$MAIN_REPORT"
        echo "   Status: ✅ Commercial use allowed with API key" >> "$MAIN_REPORT"
        echo "   Documentation: https://cloud.google.com/maps-platform/terms" >> "$MAIN_REPORT"
        api_found=true
    fi
    
    # Check for Pusher API
    if grep -r "pusher" "$PROJECT_ROOT/GLX_App_files/" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" >/dev/null 2>&1; then
        echo "📡 Pusher API detected" >> "$MAIN_REPORT"
        echo "   License: Pusher Terms of Service" >> "$MAIN_REPORT"
        echo "   Status: ✅ Commercial use allowed with subscription" >> "$MAIN_REPORT"
        echo "   Documentation: https://pusher.com/legal/terms" >> "$MAIN_REPORT"
        api_found=true
    fi
    
    # Check for Vercel services
    if grep -r "vercel\|@vercel" "$PROJECT_ROOT/GLX_App_files/" --include="*.json" >/dev/null 2>&1; then
        echo "☁️ Vercel services detected" >> "$MAIN_REPORT"
        echo "   License: Vercel Terms of Service" >> "$MAIN_REPORT"
        echo "   Status: ✅ Commercial use allowed with subscription" >> "$MAIN_REPORT"
        echo "   Documentation: https://vercel.com/legal/terms" >> "$MAIN_REPORT"
        api_found=true
    fi
    
    if [[ "$api_found" == false ]]; then
        echo "No external APIs detected in source code" >> "$MAIN_REPORT"
    fi
}

# Function to generate compliance summary
generate_compliance_summary() {
    log_info "Generating compliance summary..."
    
    echo "" >> "$MAIN_REPORT"
    echo "=== COMPLIANCE SUMMARY ===" >> "$MAIN_REPORT"
    echo "" >> "$MAIN_REPORT"
    echo "Report completed: $(date -u)" >> "$MAIN_REPORT"
    echo "Project: GLX Civic Networking App" >> "$MAIN_REPORT"
    echo "Main License: PolyForm Shield License 1.0.0" >> "$MAIN_REPORT"
    echo "" >> "$MAIN_REPORT"
    
    # Count violations and warnings (actual entries, not summary lines)
    local violations=$(grep "❌.*INCOMPATIBLE\|❌.*No LICENSE file found\|❌.*License scanning failed" "$MAIN_REPORT" 2>/dev/null | wc -l | tr -d ' \n\r')
    local warnings=$(grep "⚠️.*Review Required\|❓.*Unknown\|⚠️.*over 90 days old\|⚠️.*may not be documented" "$MAIN_REPORT" 2>/dev/null | wc -l | tr -d ' \n\r')
    local successes=$(grep "✅.*Compatible\|✅.*exists\|✅.*Commercial use allowed\|✅.*is documented\|✅.*is up to date" "$MAIN_REPORT" 2>/dev/null | wc -l | tr -d ' \n\r')
    
    # Default to 0 if empty
    violations=${violations:-0}
    warnings=${warnings:-0}
    successes=${successes:-0}
    
    echo "Results:" >> "$MAIN_REPORT"
    echo "  ✅ Successful checks: $successes" >> "$MAIN_REPORT"
    echo "  ⚠️  Warnings (review required): $warnings" >> "$MAIN_REPORT"
    echo "  ❌ Violations (action required): $violations" >> "$MAIN_REPORT"
    echo "" >> "$MAIN_REPORT"
    
    if [[ $violations -gt 0 ]]; then
        echo "🚨 COMPLIANCE STATUS: FAILED" >> "$MAIN_REPORT"
        echo "Action required: Resolve license violations before proceeding" >> "$MAIN_REPORT"
        log_error "License compliance check FAILED with $violations violations"
        return 1
    elif [[ $warnings -gt 0 ]]; then
        echo "⚠️  COMPLIANCE STATUS: REVIEW REQUIRED" >> "$MAIN_REPORT"
        echo "Action recommended: Review flagged licenses for compatibility" >> "$MAIN_REPORT"
        log_warning "License compliance check requires review of $warnings items"
        return 0
    else
        echo "✅ COMPLIANCE STATUS: PASSED" >> "$MAIN_REPORT"
        echo "All license checks passed successfully" >> "$MAIN_REPORT"
        log_success "License compliance check PASSED"
        return 0
    fi
}

# Main execution
main() {
    local exit_code=0
    
    # Check prerequisites
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Install license-checker if not available
    if ! command -v license-checker >/dev/null 2>&1; then
        log_info "Installing license-checker..."
        npm install -g license-checker@25.0.1 || {
            log_error "Failed to install license-checker"
            exit 1
        }
    fi
    
    # Run compliance checks
    scan_npm_dependencies "$PROJECT_ROOT/GLX_App_files" "GLX Main Application" || exit_code=1
    
    if [[ -f "$PROJECT_ROOT/mcp-servers/package.json" ]]; then
        scan_npm_dependencies "$PROJECT_ROOT/mcp-servers" "MCP Servers" || exit_code=1
    fi
    
    check_external_licenses || exit_code=1
    validate_license_documentation || exit_code=1
    check_api_licenses
    
    generate_compliance_summary || exit_code=1
    
    # Display report location
    log_info "Full compliance report saved to: $MAIN_REPORT"
    
    # Copy to latest report for easy access
    cp "$MAIN_REPORT" "$REPORT_DIR/latest-license-compliance-report.txt"
    
    exit $exit_code
}

# Run main function
main "$@"