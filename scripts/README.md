<<<<<<< HEAD
---
title: "GLX Civic Networking App - Root Scripts"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "overview"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

<<<<<<< HEAD
# GLX Civic Networking App - Root Scripts
=======
=======
>>>>>>> origin/copilot/fix-190
# GALAX Civic Networking App - Root Scripts
>>>>>>> origin/all-merged

This directory contains utility scripts that can be run from the repository root directory.

## Available Scripts

### Environment Setup Scripts

#### `setup-env.sh`
**Purpose**: Creates `.env` files from templates and sets up required directories.

**Usage**:
```bash
# From root directory
./scripts/setup-env.sh
# OR
npm run setup:env:root

# From GLX_App_files directory  
../scripts/setup-env.sh
# OR (original command)
npm run setup:env
```

**What it does**:
- Creates `.env` files from `.env.example` templates with development defaults
- Sets up all required application directories (data, uploads, logs, quarantine, etc.)
- Sets proper permissions for security-sensitive directories
- Provides interactive prompts for overwriting existing files
- Shows clear guidance for essential service configuration (Pusher, SMTP, Twilio)

#### `ensure-test-dirs.sh`
**Purpose**: Creates test artifact directories for CI/CD workflows.

**Usage**:
```bash
# From root directory
./scripts/ensure-test-dirs.sh

# From GLX_App_files directory
../scripts/ensure-test-dirs.sh
```

**What it does**:
- Creates `coverage`, `test-results`, and `playwright-report` directories
- Adds `.gitkeep` files to track empty directories in version control
- Prevents CI workflow failures due to missing directories

### Other Utility Scripts

#### `check-conflicts.sh`
**Purpose**: Checks for merge conflicts and other Git issues.

**Usage**:
```bash
./scripts/check-conflicts.sh
```

## Script Design Philosophy

All scripts in this directory are designed to:

1. **Work from multiple locations**: Can be run from either the repository root or the `GLX_App_files` directory
2. **Auto-detect context**: Automatically detect the correct working directory
3. **Fail gracefully**: Provide clear error messages if run from wrong location
4. **Be non-destructive**: Ask for confirmation before overwriting existing files
5. **Provide helpful output**: Show clear status messages and next steps

## Integration with Package.json

The root `package.json` includes convenience commands:

- `npm run setup:env:root` - Runs setup from root directory
- `npm run setup:env` - Original command (runs from GLX_App_files)

<<<<<<< HEAD
This provides flexibility for different development workflows and CI/CD environments.
=======
This provides flexibility for different development workflows and CI/CD environments.
>>>>>>> origin/copilot/fix-190
