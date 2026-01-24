---
title: "GLX MCP Configuration Setup Guide"
description: ""
lastUpdated: "2025-12-09"
nextReview: "2026-01-09"
contentType: "guide"
maintainer: "rsl37"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GLX MCP Configuration Setup Guide

This repository includes Model Context Protocol (MCP) configurations for both **GitHub Copilot** and **Claude Code**, specifically designed for the GLX Civic Networking App.

> **Note**: This guide covers GitHub Copilot MCP setup. For Claude Code setup and guidance on when to use each tool, see [AI_TOOLS_GUIDE.md](AI_TOOLS_GUIDE.md).

## 🎯 Overview

The MCP configurations transform both AI assistants into civic networking development assistants that understand your Web3-enabled platform's architecture:
- **GitHub Copilot**: Real-time inline code completion and quick edits
- **Claude Code**: Complex reasoning, multi-file operations, and architecture decisions

## 📁 Files Added

### Core Configuration
- `mcp-config.json` - Main MCP configuration for GitHub Copilot
- `.github/workflows/copilot-setup.yml` - Automated setup workflow

### Custom MCP Servers
- `mcp-servers/realtime-server.js` - Real-time SSE communication
- `mcp-servers/civic-server.js` - Civic data and government services integration
- `mcp-servers/auth-server.js` - JWT authentication and authorization
- `mcp-servers/social-good-server.js` - Social good and community services
- `mcp-servers/package.json` - Dependencies for custom servers

## 🚀 Quick Setup

### 1. Configure GitHub Copilot

1. Navigate to **Settings → Copilot → Coding agent**
2. Add the MCP configuration from `mcp-config.json`
3. Click **Save**

### 2. Set Up Environment Secrets

Go to **Settings → Environments** and create an environment named `copilot` with these secrets:

#### Core Services
```
COPILOT_MCP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
COPILOT_MCP_GITHUB_TOKEN=ghp_your_github_personal_access_token
COPILOT_MCP_JWT_SECRET=your_jwt_secret_key
COPILOT_MCP_DATABASE_URL=postgresql://user:pass@host:port/db
```

#### Web3 Integration
```
COPILOT_MCP_ETH_PRIVATE_KEY=your_ethereum_private_key
```

#### External APIs
```
COPILOT_MCP_CIVIC_API_KEY=your_civic_data_api_key
COPILOT_MCP_OPEN_DATA_KEY=your_open_data_api_key
COPILOT_MCP_EMAIL_KEY=your_email_service_api_key
COPILOT_MCP_SMS_KEY=your_sms_service_api_key
COPILOT_MCP_VOLUNTEER_KEY=your_volunteer_api_key
COPILOT_MCP_CHARITY_KEY=your_charity_api_key
COPILOT_MCP_ANALYTICS_KEY=your_analytics_api_key
```

### 3. Run Setup Workflow

Execute the Copilot setup workflow:

1. Go to **Actions** tab
2. Select **Copilot MCP Setup** workflow
3. Click **Run workflow**
4. Choose setup type (recommended: "full")

## 🛠️ Available MCP Tools

### 🌐 Google Maps Integration
- `search_nearby` - Find nearby places and services
- `get_place_details` - Get detailed place information
- `maps_geocode` - Convert addresses to coordinates
- `maps_directions` - Get directions between locations

### 🔗 GitHub Integration
- `create_or_update_file` - Manage repository files
- `create_issue` - Create GitHub issues
- `create_pull_request` - Create pull requests
- `list_issues` - List repository issues

### 💰 Web3 & Blockchain
- `get_balance` - Check wallet balances
- `get_token_balance` - Check token balances
- `validate_address` - Validate blockchain addresses
- `get_network_info` - Get blockchain network information

### 💬 Real-time WebSocket
- `send_realtime_message` - Send real-time messages
- `join_chat_room` - Join chat rooms
- `broadcast_notification` - Send civic notifications
- `get_active_users` - Get active users list

### 🏛️ Civic Data Integration
- `get_civic_data` - Get civic and government data
- `search_local_services` - Find local government services
- `report_civic_issue` - Report community issues
- `get_government_contacts` - Get official contacts

### 🔐 JWT Authentication
- `verify_jwt_token` - Verify JWT tokens
- `generate_access_token` - Generate access tokens
- `validate_user_permissions` - Check user permissions
- `get_user_profile` - Get user profile data

### 🤝 Social Good APIs
- `search_volunteer_opportunities` - Find volunteer opportunities
- `find_food_banks` - Locate food assistance
- `get_disaster_relief_info` - Get disaster relief information
- `search_community_resources` - Find community resources

### 📊 Analytics & Database
- `track_user_event` - Track user interactions
- `read_query` - Execute database queries
- `get_usage_analytics` - Get app usage analytics

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

1. Install MCP server dependencies:
```bash
npm install -g @cablate/mcp-google-map
npm install -g @strangelove-ventures/web3-mcp
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-postgres
```

2. Set up custom servers:
```bash
cd mcp-servers
npm install
chmod +x *.js
```

3. Test server functionality:
```bash
npm run start:realtime     # Test realtime SSE server
npm run start:civic        # Test civic server
npm run start:auth         # Test auth server
npm run start:social       # Test social good server
```

## 🎯 Key Features Enabled

### **🗺️ Location-Based Services**
- Google Maps integration for civic service mapping
- Proximity-based community matching
- Location-aware notifications

### **🌐 Web3 & Blockchain**
- Multi-chain wallet integration
- Decentralized governance features
- Token-based community incentives

### **💬 Real-time Communication**
- WebSocket-powered community chat
- Live civic alerts and emergencies
- Real-time collaboration tools

### **🔐 Secure Authentication**
- JWT-based user sessions
- Permission-based access control
- OAuth integration support

### **🏛️ Civic Integration**
- Government API access
- Community issue reporting
- Local service discovery

### **🤝 Social Good Focus**
- Volunteer opportunity matching
- Nonprofit organization integration
- Community resource mapping
- Disaster relief coordination

## 🔍 Testing the Setup

After setup, test GitHub Copilot integration by asking questions like:

- "Help me implement a new civic issue reporting feature"
- "How can I add real-time notifications for community events?"
- "Show me how to integrate Web3 voting in the governance system"
- "Help me find volunteer opportunities near a specific location"

## 📚 Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [GitHub Copilot MCP Integration Guide](https://docs.github.com/copilot)
- [GLX Project Documentation](./README.md)

## 🆘 Troubleshooting

### Common Issues

1. **MCP servers not starting**
   - Check Node.js version (requires >=18.0.0)
   - Verify all dependencies are installed
   - Check environment variables are set

2. **Authentication errors**
   - Verify JWT_SECRET is set consistently
   - Check token expiration settings
   - Validate API keys are correct

3. **External API failures**
   - Confirm API keys are valid and active
   - Check rate limits and quotas
   - Verify network connectivity

### Getting Help

- Check the GitHub Actions logs for setup errors
- Review MCP server logs for runtime issues
- Open an issue for additional support

---

*This MCP configuration enhances GitHub Copilot's understanding of civic networking applications and provides powerful tools for building community-focused features.*
