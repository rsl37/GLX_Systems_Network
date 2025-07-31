#!/bin/bash

# GALAX Civic Networking App - Environment Setup Script
# This script creates .env files from .env.example templates with development defaults
# Can be run from either root directory or GALAX_App_files directory

set -e

echo "🚀 Setting up GALAX Civic Networking App environment..."

# Detect if we're in root directory or GALAX_App_files directory
if [ -f "GALAX_App_files/package.json" ] && [ -f "GALAX_App_files/.env.example" ]; then
    # We're in the root directory, cd to GALAX_App_files
    echo "📁 Detected root directory, changing to GALAX_App_files..."
    cd GALAX_App_files
elif [ -f "package.json" ] && [ -f ".env.example" ]; then
    # We're already in GALAX_App_files directory
    echo "📁 Running from GALAX_App_files directory..."
else
    echo "❌ Error: Could not find GALAX_App_files directory or required files"
    echo "   Please run this script from either:"
    echo "   - Root directory: ./scripts/setup-env.sh"
    echo "   - GALAX_App_files directory: ./scripts/setup-env.sh"
    exit 1
fi

# Function to create .env file from template
create_env_file() {
    local example_file="$1"
    local env_file="$2"
    local description="$3"
    
    if [ -f "$env_file" ]; then
        echo "⚠️  $description already exists at $env_file"
        read -p "   Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "   Skipping $description"
            return
        fi
    fi
    
    echo "📝 Creating $description..."
    
    if [ "$env_file" = ".env" ]; then
        # Main backend .env with development values
        cat > "$env_file" << 'EOF'
# GALAX Civic Networking App - Development Environment Variables
# This file was created automatically for local development

# =============================================================================
# CORE APPLICATION SETTINGS
# =============================================================================

NODE_ENV=development
PORT=3001
DATA_DIRECTORY=./data

# =============================================================================
# AUTHENTICATION & SECURITY
# =============================================================================

# Development secrets - replace with secure values for production
JWT_SECRET=dev-jwt-secret-12345678901234567890123456789012
JWT_REFRESH_SECRET=dev-refresh-secret-12345678901234567890123456789012
ENCRYPTION_MASTER_KEY=dev-encryption-master-key-1234567890123456789012345678901234567890123456789012345678901234

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# Leave empty to use SQLite for development
DATABASE_URL=

# =============================================================================
# CORS & CLIENT CONFIGURATION
# =============================================================================

CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
TRUSTED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000
ALLOW_NO_ORIGIN_IN_PRODUCTION=false

# =============================================================================
# REAL-TIME COMMUNICATION (PUSHER) - ESSENTIAL
# =============================================================================

# Pusher configuration for real-time messaging and notifications
# ⚠️ ESSENTIAL: These must be configured with real Pusher account values
# Replace WebSocket functionality with Pusher for Vercel compatibility
# Get these values from: https://pusher.com
PUSHER_APP_ID=REQUIRED-get-from-pusher-dashboard
PUSHER_KEY=REQUIRED-get-from-pusher-dashboard
PUSHER_SECRET=REQUIRED-get-from-pusher-dashboard
PUSHER_CLUSTER=us2

# =============================================================================
# WEBSOCKET CONFIGURATION
# =============================================================================

SOCKET_PATH=/socket.io

# =============================================================================
# EMAIL CONFIGURATION (SMTP) - ESSENTIAL
# =============================================================================

# SMTP settings for email verification and notifications
# ⚠️ ESSENTIAL: Required for password reset and email verification features
# Configure with your email service provider
SMTP_HOST=REQUIRED-configure-your-smtp-host
SMTP_PORT=587
SMTP_USER=REQUIRED-your-email-username
SMTP_PASS=REQUIRED-your-email-password-or-app-password
SMTP_FROM=noreply@localhost

# =============================================================================
# SMS/PHONE VERIFICATION (TWILIO) - ESSENTIAL
# =============================================================================

# Twilio configuration for phone number verification
# ⚠️ ESSENTIAL: Required for 2FA and phone verification features
# Get these values from: https://twilio.com
TWILIO_SID=REQUIRED-get-from-twilio-dashboard
TWILIO_AUTH_TOKEN=REQUIRED-get-from-twilio-dashboard
TWILIO_PHONE_NUMBER=+1234567890

# =============================================================================
# DEVELOPMENT & DEBUGGING
# =============================================================================

DEBUG=galax:*
DEVELOPMENT_MODE=true

# =============================================================================
# PRODUCTION & DEPLOYMENT URLs
# =============================================================================

PRODUCTION_FRONTEND_URL=http://localhost:5173
STAGING_FRONTEND_URL=http://localhost:5173
EOF
    elif [ "$env_file" = "client/.env" ]; then
        # Client .env with development values
        cat > "$env_file" << 'EOF'
# GALAX Civic Networking App - Client Development Environment Variables
# This file was created automatically for local development

# Pusher configuration for real-time communication
# ⚠️ ESSENTIAL: These must be configured with real Pusher account values
# Get these values from your Pusher dashboard at https://pusher.com
REACT_APP_PUSHER_KEY=REQUIRED-get-from-pusher-dashboard
REACT_APP_PUSHER_CLUSTER=us2

# API endpoint configuration
# Points to local development server
REACT_APP_API_URL=http://localhost:3001/api
EOF
    fi
    
    echo "✅ Created $description at $env_file"
}

# Create main backend .env file
create_env_file ".env.example" ".env" "main backend environment file"

# Create client .env file
create_env_file "client/.env.example" "client/.env" "client environment file"

echo ""
echo "📁 Creating required directories..."

# Function to create directory if it doesn't exist
create_directory() {
    local dir_path="$1"
    local description="$2"
    
    if [ ! -d "$dir_path" ]; then
        mkdir -p "$dir_path"
        echo "✅ Created $description at $dir_path"
    else
        echo "ℹ️  $description already exists at $dir_path"
    fi
}

# Create all required directories for the application
create_directory "./data" "main data directory"
create_directory "./data/uploads" "file uploads directory"
create_directory "./data/logs" "application logs directory"
create_directory "./data/encrypted_documents" "encrypted documents directory"
create_directory "./quarantine" "antimalware quarantine directory"
create_directory "./virus_quarantine" "antivirus quarantine directory"
create_directory "/tmp/galax-sandbox-quarantine" "sandbox quarantine directory"
create_directory "/tmp/kyc-uploads" "temporary KYC uploads directory"
create_directory "./coverage" "test coverage reports directory"
create_directory "./test-results" "test results directory"
create_directory "./playwright-report" "playwright test reports directory"

# Create .gitkeep files for empty directories (except /tmp directories)
echo '# Directory for file uploads' > ./data/uploads/.gitkeep
echo '# Directory for application logs' > ./data/logs/.gitkeep
echo '# Directory for encrypted documents' > ./data/encrypted_documents/.gitkeep
echo '# Directory for quarantined files' > ./quarantine/.gitkeep
echo '# Directory for virus quarantine' > ./virus_quarantine/.gitkeep
echo '# Directory for test coverage reports' > ./coverage/.gitkeep
echo '# Directory for test results' > ./test-results/.gitkeep
echo '# Directory for playwright reports' > ./playwright-report/.gitkeep

# Set proper permissions for data directories
if [ -d "./data" ]; then
    chmod 755 ./data || echo "⚠️ Warning: Failed to set permissions for ./data"
else
    echo "⚠️ Warning: Directory ./data does not exist, skipping permission setting"
fi
if [ -d "./data/uploads" ]; then
    chmod 755 ./data/uploads || echo "⚠️ Warning: Failed to set permissions for ./data/uploads"
else
    echo "⚠️ Warning: Directory ./data/uploads does not exist, skipping permission setting"
fi
if [ -d "./data/logs" ]; then
    chmod 755 ./data/logs || echo "⚠️ Warning: Failed to set permissions for ./data/logs"
else
    echo "⚠️ Warning: Directory ./data/logs does not exist, skipping permission setting"
fi
if [ -d "./data/encrypted_documents" ]; then
    chmod 700 ./data/encrypted_documents || echo "⚠️ Warning: Failed to set permissions for ./data/encrypted_documents"
else
    echo "⚠️ Warning: Directory ./data/encrypted_documents does not exist, skipping permission setting"
fi
if [ -d "./quarantine" ]; then
    chmod 700 ./quarantine || echo "⚠️ Warning: Failed to set permissions for ./quarantine"
else
    echo "⚠️ Warning: Directory ./quarantine does not exist, skipping permission setting"
fi
if [ -d "./virus_quarantine" ]; then
    chmod 700 ./virus_quarantine || echo "⚠️ Warning: Failed to set permissions for ./virus_quarantine"
else
    echo "⚠️ Warning: Directory ./virus_quarantine does not exist, skipping permission setting"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review and customize the .env files if needed"
echo "   2. For production deployment, update with secure secrets"
echo "   3. Test the configuration: npm run test:env"
echo "   4. Start the development server: npm run start"
echo ""
echo "⚠️  Important:"
echo "   - The .env files contain development defaults"
echo "   - For production, generate secure secrets using: openssl rand -hex 32"
echo "   - Never commit .env files to version control"
echo ""
echo "🔧 ESSENTIAL SERVICES CONFIGURATION REQUIRED:"
echo "   These services must be configured with real credentials for the app to work:"
echo ""
echo "   📧 SMTP Email Service:"
echo "      - Update SMTP_* variables with your email provider credentials"
echo "      - Required for email verification and password reset"
echo "      - Supported providers: Gmail, Outlook, Yahoo, etc."
echo ""
echo "   📱 Twilio SMS Service:"
echo "      - Create account at https://twilio.com"
echo "      - Update TWILIO_* variables with your account credentials"
echo "      - Required for phone verification and 2FA"
echo ""
echo "   🔄 Pusher Real-time Service:"
echo "      - Create account at https://pusher.com"
echo "      - Update PUSHER_* variables with your app credentials"
echo "      - Required for real-time messaging and notifications"
echo ""
echo "🚨 WARNING: App will fail to start without proper configuration of these services!"
echo "   Run 'npm run test:env' to check configuration status."