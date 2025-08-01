#!/bin/bash

# GALAX Security Audit Script
# Automated security vulnerability scanning and reporting

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$SCRIPT_DIR/reports"
LOG_FILE="$REPORTS_DIR/security-audit-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Header
log "${BLUE}🔒 GALAX Security Audit Report${NC}"
log "${BLUE}Started: $(date)${NC}"
log "${BLUE}Project: $PROJECT_ROOT${NC}"
log ""

# 1. Dependency Vulnerability Scan
log "${YELLOW}📦 Scanning dependencies for vulnerabilities...${NC}"
cd "$PROJECT_ROOT/GALAX_App_files"

if command -v npm &> /dev/null; then
    npm audit --audit-level moderate | tee -a "$LOG_FILE"
    if [ $? -eq 0 ]; then
        log "${GREEN}✅ No critical dependency vulnerabilities found${NC}"
    else
        log "${RED}❌ Dependency vulnerabilities detected - review npm audit output${NC}"
    fi
else
    log "${RED}❌ npm not found - skipping dependency scan${NC}"
fi

log ""

# 2. WebSocket Security Analysis
log "${YELLOW}🔌 Analyzing WebSocket security implementation...${NC}"

# Check for WSS usage
if grep -r "wss://" "$PROJECT_ROOT" > /dev/null; then
    log "${GREEN}✅ WSS (Secure WebSocket) implementation found${NC}"
else
    log "${RED}❌ WARNING: No WSS implementation detected - using insecure WebSocket${NC}"
fi

# Check for CORS configuration
if grep -r "cors" "$PROJECT_ROOT/GALAX_App_files/server" > /dev/null; then
    log "${GREEN}✅ CORS configuration found${NC}"
else
    log "${YELLOW}⚠️  No CORS configuration detected${NC}"
fi

# Check for rate limiting
if grep -r "rate.limit\|express-rate-limit" "$PROJECT_ROOT/GALAX_App_files" > /dev/null; then
    log "${GREEN}✅ Rate limiting implementation found${NC}"
else
    log "${YELLOW}⚠️  Limited rate limiting implementation detected${NC}"
fi

log ""

# 3. Authentication Security Check
log "${YELLOW}🔐 Checking authentication security...${NC}"

# Check for JWT usage
if grep -r "jsonwebtoken\|jwt" "$PROJECT_ROOT/GALAX_App_files/server" > /dev/null; then
    log "${GREEN}✅ JWT authentication implementation found${NC}"
else
    log "${RED}❌ No JWT authentication detected${NC}"
fi

# Check for password hashing
if grep -r "bcrypt\|argon2\|scrypt" "$PROJECT_ROOT/GALAX_App_files/server" > /dev/null; then
    log "${GREEN}✅ Password hashing implementation found${NC}"
else
    log "${RED}❌ No secure password hashing detected${NC}"
fi

# Check for session security
if grep -r "secure.*cookie\|httpOnly" "$PROJECT_ROOT/GALAX_App_files/server" > /dev/null; then
    log "${GREEN}✅ Secure cookie configuration found${NC}"
else
    log "${YELLOW}⚠️  Limited secure cookie configuration${NC}"
fi

log ""

# 4. Input Validation Analysis
log "${YELLOW}🛡️  Analyzing input validation...${NC}"

# Check for express-validator usage
if grep -r "express-validator" "$PROJECT_ROOT/GALAX_App_files" > /dev/null; then
    log "${GREEN}✅ Input validation library found${NC}"
else
    log "${YELLOW}⚠️  Limited input validation detected${NC}"
fi

# Check for SQL injection protection
if grep -r "prepared.*statement\|parameterized\|kysely" "$PROJECT_ROOT/GALAX_App_files/server" > /dev/null; then
    log "${GREEN}✅ SQL injection protection found (parameterized queries)${NC}"
else
    log "${RED}❌ Potential SQL injection vulnerability - no parameterized queries detected${NC}"
fi

log ""

# 5. Post-Quantum Cryptography Check
log "${YELLOW}🔮 Checking post-quantum cryptography implementation...${NC}"

if grep -r "@noble/post-quantum\|crystals-kyber\|dilithium" "$PROJECT_ROOT/GALAX_App_files" > /dev/null; then
    log "${GREEN}✅ Post-quantum cryptography libraries found${NC}"
else
    log "${YELLOW}⚠️  No post-quantum cryptography implementation detected${NC}"
fi

log ""

# 6. Secrets and Environment Security
log "${YELLOW}🔑 Checking secrets and environment security...${NC}"

# Check for .env files in repository
if find "$PROJECT_ROOT" -name ".env" -not -path "*/node_modules/*" | grep -v ".example" > /dev/null; then
    log "${RED}❌ WARNING: .env files found in repository - potential secret exposure${NC}"
    find "$PROJECT_ROOT" -name ".env" -not -path "*/node_modules/*" | grep -v ".example" | tee -a "$LOG_FILE"
else
    log "${GREEN}✅ No .env files found in repository${NC}"
fi

# Check for hardcoded secrets
if grep -r -i "password\s*=\s*['\"][^'\"]*['\"]" "$PROJECT_ROOT/GALAX_App_files" --exclude-dir=node_modules > /dev/null; then
    log "${RED}❌ WARNING: Potential hardcoded passwords detected${NC}"
else
    log "${GREEN}✅ No obvious hardcoded passwords found${NC}"
fi

log ""

# 7. File Permission Check
log "${YELLOW}📁 Checking file permissions...${NC}"

# Check for overly permissive files
if find "$PROJECT_ROOT" -type f -perm /o+w -not -path "*/node_modules/*" -not -path "*/.git/*" | head -5; then
    log "${YELLOW}⚠️  World-writable files detected - review permissions${NC}"
else
    log "${GREEN}✅ No world-writable files found${NC}"
fi

log ""

# 8. Security Headers Check
log "${YELLOW}🛡️  Checking security headers implementation...${NC}"

# Check for Helmet.js usage
if grep -r "helmet" "$PROJECT_ROOT/GALAX_App_files/server" > /dev/null; then
    log "${GREEN}✅ Security headers middleware (Helmet) found${NC}"
else
    log "${RED}❌ No security headers middleware detected${NC}"
fi

log ""

# 9. HTTPS/TLS Configuration
log "${YELLOW}🔒 Checking HTTPS/TLS configuration...${NC}"

# Check for TLS/SSL configuration
if grep -r "https\|ssl\|tls" "$PROJECT_ROOT/GALAX_App_files/server" > /dev/null; then
    log "${GREEN}✅ HTTPS/TLS configuration found${NC}"
else
    log "${YELLOW}⚠️  Limited HTTPS/TLS configuration detected${NC}"
fi

log ""

# 10. AI/MCP Security Analysis
log "${YELLOW}🤖 Analyzing AI/MCP security implementation...${NC}"

# Check for AI input validation
if grep -r "prompt.*inject\|ai.*validation\|mcp.*auth" "$PROJECT_ROOT" > /dev/null; then
    log "${GREEN}✅ AI security controls detected${NC}"
else
    log "${YELLOW}⚠️  Limited AI security controls detected${NC}"
fi

# Check for MCP configuration security
if [ -f "$PROJECT_ROOT/mcp-config.json" ]; then
    log "${GREEN}✅ MCP configuration file found${NC}"
    if grep -q "auth\|security" "$PROJECT_ROOT/mcp-config.json"; then
        log "${GREEN}✅ MCP security configuration detected${NC}"
    else
        log "${YELLOW}⚠️  Limited MCP security configuration${NC}"
    fi
else
    log "${YELLOW}⚠️  No MCP configuration file found${NC}"
fi

log ""

# 11. Web3 Security Check
log "${YELLOW}🌐 Checking Web3 security implementation...${NC}"

# Check for Web3 libraries and security measures
if grep -r "web3\|ethereum\|blockchain" "$PROJECT_ROOT/GALAX_App_files" > /dev/null; then
    log "${GREEN}✅ Web3 implementation detected${NC}"
    
    # Check for multi-sig implementation
    if grep -r "multisig\|multi.sig" "$PROJECT_ROOT/GALAX_App_files" > /dev/null; then
        log "${GREEN}✅ Multi-signature wallet implementation found${NC}"
    else
        log "${YELLOW}⚠️  No multi-signature wallet implementation detected${NC}"
    fi
else
    log "${YELLOW}⚠️  Limited Web3 implementation detected${NC}"
fi

log ""

# Summary and Recommendations
log "${BLUE}📋 Security Audit Summary${NC}"
log "${BLUE}Completed: $(date)${NC}"
log "${BLUE}Report saved to: $LOG_FILE${NC}"
log ""

log "${YELLOW}🔧 Priority Recommendations:${NC}"
log "1. Implement WSS (Secure WebSocket) for all real-time communications"
log "2. Add comprehensive input validation for all user inputs"
log "3. Implement AI/MCP security controls and monitoring"
log "4. Add Web3 multi-signature wallet security"
log "5. Configure comprehensive security headers"
log "6. Implement real-time security monitoring"
log ""

log "${GREEN}✅ Security audit completed successfully${NC}"

# Set exit code based on critical issues found (using plain text marker "[CRITICAL]")
if grep -q "[CRITICAL]" "$LOG_FILE"; then
    log "${RED}Critical security issues detected - immediate action required${NC}"
    exit 1
else
    log "${GREEN}🎉 No critical security issues detected${NC}"
    exit 0
fi