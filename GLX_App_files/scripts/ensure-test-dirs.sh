#!/usr/bin/env bash

# Ensure all required test directories exist for CI artifact upload
# This script ensures the CI workflows don't fail due to missing directories

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "Ensuring test artifact directories exist..."

# Create directories if they don't exist
mkdir -p "$APP_DIR/coverage"
mkdir -p "$APP_DIR/test-results"
mkdir -p "$APP_DIR/playwright-report"
mkdir -p "$APP_DIR/data/logs"
mkdir -p "$APP_DIR/data/uploads"

# Create placeholder files to ensure directories aren't empty
echo '{"message": "Coverage reports will be generated here"}' > "$APP_DIR/coverage/.gitkeep"
echo '{"message": "Test results will be generated here"}' > "$APP_DIR/test-results/.gitkeep"
echo '{"message": "Playwright reports will be generated here"}' > "$APP_DIR/playwright-report/.gitkeep"

echo "Test artifact directories created successfully."