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
echo ""
echo "ℹ️  Note: You may see a deprecation warning for 'path-match@1.2.4'."
echo "   This is a subdependency of Vercel CLI and has been analyzed for security."
echo "   See DEPRECATED_DEPENDENCIES.md for full details."
echo "   Status: ✅ SECURE - No known vulnerabilities"
echo ""
pnpm add -g vercel 2>&1 | grep -v "deprecated subdependencies" || pnpm add -g vercel

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
if command -v vercel &> /dev/null; then
  echo "  Vercel CLI: $(vercel --version)"
else
  echo "  Vercel CLI: Installation may have failed"
fi
echo ""
echo "You can now use 'vercel' commands in the terminal."
echo "Run 'vercel --prod' to deploy to production."
