# CMPLX Systems Monitor

**Enterprise Network Management & Monitoring Platform**

CMPLX is a specialized enterprise application for real-time monitoring and management of complex systems networks including Supply Chain, Air Traffic Control (ATC), and Logistics operations.

---

## 🎯 Overview

CMPLX provides comprehensive visualization and management tools for:

- **Supply Chain Networks** - End-to-end visibility from suppliers to retail
- **Air Traffic Control Systems** - Real-time airspace coordination and management
- **Logistics Operations** - Multi-modal transportation monitoring and optimization

---

## ✨ Key Features

### Real-Time Monitoring
- **Live Network Topology** - Visual representation of system nodes and connections
- **Performance Metrics** - Uptime, throughput, latency, and capacity tracking
- **Alert Management** - Critical, warning, and info alerts with smart filtering
- **Status Dashboard** - At-a-glance health indicators for all nodes

### Advanced Visualization
- **COFM Graph** - Complexly Organized Flexibly Manageable unified project view
  - WBS (Work Breakdown Structure)
  - PERT (Program Evaluation Review Technique)
  - Gantt Chart timelines
  - Resource allocation scatterplot
- **Multi-dimensional Analysis** - Timeline, resources, and hierarchy visualization
- **Critical Path Analysis** - Identify bottlenecks and optimize workflows

### Enterprise Management
- **Node-Level Details** - Deep dive into individual system components
- **Maintenance Scheduling** - Proactive system upkeep coordination
- **Activity Logging** - Complete audit trail of system actions
- **AI-Powered Recommendations** - Intelligent optimization suggestions

---

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server (runs on port 3001)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment to Vercel

#### Option 1: Vercel Dashboard
1. Go to https://vercel.com/new
2. Import `Systems-Network-Monitor` repository
3. Configure:
   - **Project Name**: `cmplx-systems-monitor`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
4. Deploy

#### Option 2: Vercel CLI
```bash
cd CMPLX_App
vercel --prod
```

---

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Radix UI components
- **Build Tool**: Vite 6
- **Routing**: React Router v7
- **Analytics**: Vercel Analytics

### Project Structure
```
CMPLX_App/
├── src/
│   ├── pages/          # Application pages
│   │   └── SystemsMonitorPage.tsx
│   ├── components/     # Reusable UI components
│   ├── lib/            # Utilities and helpers
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # Application entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies and scripts
```

---

## 🎨 Features in Detail

### System Types

#### Supply Chain Network
Monitor and optimize:
- Raw material suppliers
- Manufacturing plants
- Distribution centers
- Warehouse hubs
- Retail endpoints

**Metrics Tracked:**
- Inventory levels
- Throughput (units/hr)
- System uptime
- Latency (ms)

#### Air Traffic Control
Coordinate and manage:
- Tower control stations
- TRACON facilities
- Air route traffic control centers (ARTCC)

**Metrics Tracked:**
- Active flights
- Aircraft capacity
- Radio frequencies
- System uptime

### COFM Visualization

The Complexly Organized Flexibly Manageable (COFM) graph provides a unified view combining:

1. **Work Breakdown Structure (WBS)** - Hierarchical task organization (Z-axis/size)
2. **PERT Analysis** - Critical path identification with dependencies
3. **Gantt Timeline** - Time-based project scheduling (X-axis)
4. **Resource Scatterplot** - Resource allocation visualization (Y-axis)

**Key Elements:**
- 🟢 **Green nodes** - Start tasks
- 🔵 **Blue nodes** - Standard tasks
- 🟣 **Purple nodes** - End tasks
- 🔴 **Red nodes** - Critical bottlenecks
- 🔵 **Light blue nodes** - Tasks with schedule flexibility (slack)

---

## 🎯 Use Cases

### Enterprise Operations
- Monitor distributed supply chain networks in real-time
- Identify performance bottlenecks before they impact operations
- Coordinate maintenance across multiple facilities
- Generate executive reports on system health

### Project Management
- Visualize complex projects with COFM multi-dimensional view
- Track critical path and identify schedule risks
- Optimize resource allocation across project phases
- Manage dependencies and coordinate teams

### Incident Response
- Real-time alerts for critical system issues
- Quick access to node diagnostics and troubleshooting
- Coordination tools for distributed teams
- Activity logging for post-incident analysis

---

## 🔒 Security & Compliance

CMPLX is designed for enterprise use with security best practices:

- **HTTPS Only** - Strict Transport Security enabled
- **XSS Protection** - Content Security Policy headers
- **Secure Headers** - X-Frame-Options, X-Content-Type-Options
- **No Backend Dependencies** - Static frontend deployment (no attack surface)

---

## 📊 Performance

Optimized for enterprise scale:

- **Build Size**: ~500KB (gzipped)
- **Initial Load**: <2 seconds on 3G
- **Interactive**: <100ms response time
- **Scalability**: Supports 1000+ nodes in topology view

---

## 🛠️ Development

### Environment Variables

```bash
NODE_ENV=production        # Production mode
VITE_APP_MODE=cmplx       # Application mode identifier
```

### Build Commands

```bash
npm run dev        # Development server with hot reload
npm run build      # Production build
npm run preview    # Preview production build locally
npm test          # Run tests (when available)
```

---

## 📄 License

Dual-licensed under:
- **PolyForm Shield License 1.0.0** - Noncompete license
- **PolyForm Noncommercial License 1.0.0** - Noncommercial use

See LICENSE files in root directory for full text.

---

## 🤝 Support

For enterprise support, customization, or licensing inquiries, contact the development team.

---

## 🔗 Related Projects

- **GLX (Global Liquid Exchange)** - Civic networking platform and monetary infrastructure
- **CROWDS Token** - Adaptive stablecoin framework (design phase)

---

*CMPLX: Enterprise-grade systems monitoring for mission-critical infrastructure* 🚀
