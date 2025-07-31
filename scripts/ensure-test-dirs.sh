#!/usr/bin/env bash

# Ensure all required test directories exist for CI artifact upload
# This script ensures the CI workflows don't fail due to missing directories
# Can be run from either root directory or GALAX_App_files directory

set -e

echo "Ensuring test artifact directories exist..."

# Detect if we're in root directory or GALAX_App_files directory
if [ -f "GALAX_App_files/package.json" ]; then
    # We're in the root directory
    APP_DIR="./GALAX_App_files"
    echo "📁 Detected root directory, using GALAX_App_files path..."
elif [ -f "package.json" ] && [ -f ".env.example" ]; then
    # We're already in GALAX_App_files directory
    APP_DIR="."
    echo "📁 Running from GALAX_App_files directory..."
else
    echo "❌ Error: Could not find GALAX_App_files directory or required files"
    echo "   Please run this script from either:"
    echo "   - Root directory: ./scripts/ensure-test-dirs.sh"
    echo "   - GALAX_App_files directory: ./scripts/ensure-test-dirs.sh"
    exit 1
fi

# Create directories if they don't exist
mkdir -p "$APP_DIR/coverage"
mkdir -p "$APP_DIR/test-results"
mkdir -p "$APP_DIR/playwright-report"

# Create placeholder files to ensure directories aren't empty
echo '{"message": "Coverage reports will be generated here"}' > "$APP_DIR/coverage/.gitkeep"
echo '{"message": "Test results will be generated here"}' > "$APP_DIR/test-results/.gitkeep"
echo '{"message": "Playwright reports will be generated here"}' > "$APP_DIR/playwright-report/.gitkeep"

echo "✅ Test artifact directories created successfully."