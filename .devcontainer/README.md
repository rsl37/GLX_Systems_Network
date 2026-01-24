# Development Container Configuration

This directory contains the configuration for GitHub Codespaces and VS Code Dev Containers.

## What's Included

- **Node.js 20**: JavaScript runtime environment
- **pnpm**: Fast, disk space efficient package manager
- **Vercel CLI**: Command-line interface for Vercel deployment
- **GitHub CLI**: Command-line interface for GitHub
- **VS Code Extensions**: ESLint, Prettier, GitHub Copilot
- **AI Coding Assistants**: GitHub Copilot (inline), Claude Code (complex tasks)

## Automatic Setup

When you open this repository in GitHub Codespaces or a VS Code Dev Container, the environment will automatically:

1. Install Node.js 20
2. Install and configure pnpm with global bin directory
3. Install Vercel CLI globally
4. Install project dependencies
5. Configure VS Code with recommended extensions and settings

## Manual Setup

If you need to manually run the setup script:

```bash
bash .devcontainer/setup.sh
```

## Environment Variables

The following environment variables are automatically configured:

- `PNPM_HOME`: `/usr/local/share/pnpm`
- `PATH`: Includes pnpm's global bin directory

## Vercel Deployment

After the environment is set up, you can deploy to Vercel using:

```bash
vercel --prod
```

Or for preview deployments:

```bash
vercel
```

## Ports

The following ports are automatically forwarded:

- **3000**: Main application
- **3001**: API server

## Troubleshooting

If you encounter issues with Vercel CLI:

1. Verify pnpm is installed: `pnpm --version`
2. Verify Vercel CLI is installed: `vercel --version`
3. Check PATH includes pnpm bin: `echo $PATH | grep pnpm`
4. Re-run setup if needed: `bash .devcontainer/setup.sh`
