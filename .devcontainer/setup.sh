#!/bin/bash
set -e

echo "🚀 Setting up GLX Civic Networking App development environment..."

# Install pnpm globally using npm
echo "📦 Installing pnpm..."
npm install -g pnpm

# Configure pnpm global bin directory
echo "⚙️  Configuring pnpm..."
mkdir -p /usr/local/share/pnpm
pnpm config set global-bin-dir /usr/local/share/pnpm

# Install Vercel CLI globally using pnpm
echo "📦 Installing Vercel CLI..."
pnpm add -g vercel

# Install project dependencies
echo "📦 Installing project dependencies..."
pnpm install

# Verify installations
echo ""
echo "✅ Environment setup complete!"
echo ""
echo "Installed versions:"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "  pnpm: $(pnpm --version)"
echo "  Vercel CLI: $(vercel --version)"
echo ""
echo "You can now use 'vercel' commands in the terminal."
echo "Run 'vercel --prod' to deploy to production."
