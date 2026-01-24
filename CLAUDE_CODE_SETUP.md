# Claude Code MCP Setup Guide

This guide explains how to configure Claude Code with Model Context Protocol (MCP) servers for the GLX Systems Network project.

## 🎯 Overview

Claude Code uses MCP to access project-specific tools and services, enabling:
- Deep codebase understanding
- Multi-file refactoring capabilities
- Database and blockchain integration
- Real-time services and notifications
- Advanced security analysis

> **Note**: This guide covers Claude Code MCP setup. For GitHub Copilot setup and guidance on when to use each tool, see:
> - [MCP_SETUP_GUIDE.md](MCP_SETUP_GUIDE.md) - GitHub Copilot configuration
> - [AI_TOOLS_GUIDE.md](AI_TOOLS_GUIDE.md) - When to use each tool

---

## 📋 Prerequisites

- [Claude Desktop](https://claude.ai/download) installed
- Node.js 20.x or later
- Access to required API keys and secrets

---

## 🚀 Quick Setup

### 1. Install MCP Server Dependencies

```bash
cd mcp-servers
npm install
```

### 2. Configure Claude Desktop

The MCP configuration file is located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Copy the provided configuration:

```bash
# macOS/Linux
cp claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or manually copy the contents from claude_desktop_config.json
```

### 3. Set Environment Variables

Claude Code reads environment variables from your shell. Add these to your `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
# Core Services
export CLAUDE_MCP_JWT_SECRET="your_jwt_secret_key"
export CLAUDE_MCP_SESSION_SECRET="your_session_secret"
export CLAUDE_MCP_DATABASE_URL="postgresql://user:pass@host:port/db"

# Blockchain (Optional - for Web3 features)
export CLAUDE_MCP_ETH_PRIVATE_KEY="your_ethereum_private_key"
export CLAUDE_MCP_INFURA_PROJECT_ID="your_infura_project_id"

# External APIs (Optional)
export CLAUDE_MCP_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
export CLAUDE_MCP_GITHUB_TOKEN="ghp_your_github_token"
export CLAUDE_MCP_CIVIC_API_KEY="your_civic_data_api_key"
export CLAUDE_MCP_OPEN_DATA_KEY="your_open_data_api_key"

# Communication Services (Optional)
export CLAUDE_MCP_EMAIL_KEY="your_email_service_api_key"
export CLAUDE_MCP_SMS_KEY="your_sms_service_api_key"
export CLAUDE_MCP_PUSH_KEY="your_push_notification_key"

# Analytics & Monitoring (Optional)
export CLAUDE_MCP_VOLUNTEER_KEY="your_volunteer_api_key"
export CLAUDE_MCP_CHARITY_KEY="your_charity_api_key"
export CLAUDE_MCP_ANALYTICS_KEY="your_analytics_api_key"
export CLAUDE_MCP_REALTIME_SECRET="your_realtime_secret"
```

**Important**: Reload your shell after adding variables:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### 4. Restart Claude Desktop

After configuration, restart Claude Desktop to load the MCP servers.

---

## 🔧 MCP Servers Available

### Core Services

#### 1. **Civic Networking Server**
- **Purpose**: Civic data and government services integration
- **Capabilities**:
  - Access civic APIs
  - Retrieve government data
  - Community resource lookup
- **Required Env**: `CLAUDE_MCP_CIVIC_API_KEY`, `CLAUDE_MCP_OPEN_DATA_KEY`

#### 2. **Auth Service Server**
- **Purpose**: JWT authentication and authorization
- **Capabilities**:
  - Generate JWT tokens
  - Validate sessions
  - User permission checks
- **Required Env**: `CLAUDE_MCP_JWT_SECRET`, `CLAUDE_MCP_SESSION_SECRET`

#### 3. **Database Server**
- **Purpose**: PostgreSQL database operations
- **Capabilities**:
  - Execute queries
  - Schema migrations
  - Data validation
- **Required Env**: `CLAUDE_MCP_DATABASE_URL`

### Blockchain & Web3

#### 4. **Blockchain Server**
- **Purpose**: Ethereum blockchain integration
- **Capabilities**:
  - Smart contract interactions
  - Wallet operations
  - Transaction monitoring
- **Required Env**: `CLAUDE_MCP_ETH_PRIVATE_KEY`, `CLAUDE_MCP_INFURA_PROJECT_ID`

### Communication & Notifications

#### 5. **Realtime Server**
- **Purpose**: Real-time SSE communication
- **Capabilities**:
  - Server-sent events
  - Live updates
  - Notification streaming
- **Required Env**: `CLAUDE_MCP_REALTIME_SECRET`

#### 6. **Notifications Server**
- **Purpose**: Multi-channel notifications
- **Capabilities**:
  - Send emails
  - Send SMS messages
  - Push notifications
- **Required Env**: `CLAUDE_MCP_EMAIL_KEY`, `CLAUDE_MCP_SMS_KEY`, `CLAUDE_MCP_PUSH_KEY`

### Platform Services

#### 7. **Social Good Server**
- **Purpose**: Community and social services
- **Capabilities**:
  - Volunteer opportunities
  - Charity integrations
  - Community events
- **Required Env**: `CLAUDE_MCP_VOLUNTEER_KEY`, `CLAUDE_MCP_CHARITY_KEY`

#### 8. **Analytics Server**
- **Purpose**: Platform metrics and analytics
- **Capabilities**:
  - Track user activity
  - Generate reports
  - Performance metrics
- **Required Env**: `CLAUDE_MCP_ANALYTICS_KEY`

#### 9. **Maps Server**
- **Purpose**: Location services
- **Capabilities**:
  - Geocoding
  - Mapping
  - Location search
- **Required Env**: `CLAUDE_MCP_GOOGLE_MAPS_API_KEY`

#### 10. **GitHub Server**
- **Purpose**: Repository management
- **Capabilities**:
  - Code analysis
  - Issue tracking
  - PR management
- **Required Env**: `CLAUDE_MCP_GITHUB_TOKEN`

---

## 🧪 Testing Your Setup

### 1. Verify MCP Servers are Running

Open Claude Desktop and check for MCP server indicators in the interface.

### 2. Test Server Connections

Ask Claude Code:
```
Can you verify the MCP server connections and list which services are available?
```

### 3. Test a Specific Server

```bash
# In Claude Code CLI
claude "Test the database connection and show available tables"
```

---

## 📖 Usage Examples

### Example 1: Database Query
```bash
claude "Query the users table and show the last 10 registered users"
```

### Example 2: Multi-file Refactoring
```bash
claude "Refactor all authentication middleware to use async/await instead of callbacks"
```

### Example 3: Security Analysis
```bash
claude "Review the API endpoints for potential SQL injection vulnerabilities"
```

### Example 4: Architecture Planning
```bash
claude "Design a caching strategy for the notification system to handle 10,000 concurrent users"
```

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ **Never commit** environment variables to git
- ✅ Use separate keys for development and production
- ✅ Rotate keys regularly (every 90 days)
- ✅ Use least-privilege access for API keys

### MCP Server Security
- ✅ Servers run locally and don't expose ports
- ✅ Communication uses local IPC (inter-process communication)
- ✅ Secrets are passed via environment variables, not config files

### Key Storage
- ✅ Store sensitive keys in a password manager
- ✅ Use `.env` files for local development (add to `.gitignore`)
- ✅ Consider using a secrets manager (AWS Secrets Manager, 1Password, etc.)

---

## 🐛 Troubleshooting

### MCP Servers Not Loading

**Symptom**: Claude Code doesn't show MCP server capabilities

**Solutions**:
1. Check Claude Desktop logs:
   - **macOS**: `~/Library/Logs/Claude/`
   - **Windows**: `%APPDATA%\Claude\logs\`
   - **Linux**: `~/.config/Claude/logs/`

2. Verify Node.js is in PATH:
   ```bash
   which node
   node --version  # Should be 20.x or later
   ```

3. Check MCP server dependencies:
   ```bash
   cd mcp-servers
   npm install
   ```

4. Restart Claude Desktop

### Environment Variables Not Loading

**Symptom**: MCP servers fail with "missing API key" errors

**Solutions**:
1. Verify variables are exported:
   ```bash
   echo $CLAUDE_MCP_JWT_SECRET
   ```

2. Restart your terminal/shell after adding variables

3. Make sure variables are in the correct shell config file:
   - Bash: `~/.bashrc` or `~/.bash_profile`
   - Zsh: `~/.zshrc`
   - Fish: `~/.config/fish/config.fish`

### Server Connection Errors

**Symptom**: Individual MCP servers fail to connect

**Solutions**:
1. Check server logs in Claude Desktop
2. Verify the server file exists:
   ```bash
   ls -la mcp-servers/civic-server.js
   ```
3. Test server manually:
   ```bash
   node mcp-servers/civic-server.js
   ```

---

## 📚 Additional Resources

### GLX Project Documentation
- [AI_TOOLS_GUIDE.md](AI_TOOLS_GUIDE.md) - When to use Claude Code vs GitHub Copilot
- [MCP_SETUP_GUIDE.md](MCP_SETUP_GUIDE.md) - GitHub Copilot MCP setup
- [README.md](README.md) - Project overview

### External Documentation
- [Claude Code Documentation](https://github.com/anthropics/claude-code)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Claude API Documentation](https://docs.anthropic.com)

---

## 🔄 Differences from GitHub Copilot MCP

| Feature | GitHub Copilot MCP | Claude Code MCP |
|---------|-------------------|-----------------|
| **Config Location** | `.github/copilot-instructions.json` | `~/Library/Application Support/Claude/` |
| **Secrets Management** | GitHub Secrets (`COPILOT_MCP_*`) | Environment variables (`CLAUDE_MCP_*`) |
| **Use Case** | Inline completion, quick edits | Complex reasoning, multi-file ops |
| **Context Window** | ~8K tokens | ~200K tokens |
| **Server Execution** | GitHub-hosted | Local machine |

---

## ✅ Setup Checklist

- [ ] Node.js 20.x installed
- [ ] MCP server dependencies installed (`npm install` in `mcp-servers/`)
- [ ] `claude_desktop_config.json` copied to Claude config directory
- [ ] Environment variables added to shell config
- [ ] Shell reloaded (`source ~/.bashrc` or equivalent)
- [ ] Claude Desktop restarted
- [ ] MCP servers visible in Claude Desktop
- [ ] Test query successful

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs**: Claude Desktop logs contain detailed error messages
2. **Verify setup**: Run through the setup checklist above
3. **Test manually**: Try running MCP servers directly with Node.js
4. **Ask Claude**: Use Claude Code to debug its own setup!

```bash
claude "Help me debug why the MCP servers aren't loading"
```

---

*This configuration enables Claude Code to deeply understand and assist with the GLX Systems Network project. For optimal productivity, use Claude Code for complex tasks and GitHub Copilot for quick edits - see [AI_TOOLS_GUIDE.md](AI_TOOLS_GUIDE.md) for details.*
