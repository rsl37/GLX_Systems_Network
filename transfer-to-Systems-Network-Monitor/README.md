# Systems Network Monitor (CMPLX)

**Enterprise Network Management & Monitoring Platform**

CMPLX (Complexity Made Legible and Actionable) is an enterprise application for real-time monitoring and management of complex systems networks including Supply Chain, Operations Management, Project Management, Air Traffic Control (ATC), Administration, and Logistics operations.

---

## Repository Structure

```
Systems-Network-Monitor/
├── frontend/               # CMPLX React frontend (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── pages/          # Application pages (SystemsMonitorPage, etc.)
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── vite.config.ts
├── backend/                # Systems Monitoring Platform (Node.js + Express)
│   ├── src/
│   │   ├── app.ts          # Main application entry
│   │   ├── services/       # Monitoring services
│   │   ├── blockchain/     # Blockchain integration
│   │   ├── crypto/         # Post-quantum cryptography
│   │   ├── middleware/      # Auth, rate limiting, validation
│   │   └── database/       # DB connection, Redis
│   ├── database/           # SQL schema
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── docs/                   # Strategy and deployment documentation
│   ├── FORK_STRATEGY.md    # CMPLX fork strategy from GLX
│   ├── DEPLOY.md           # Quick deployment guide
│   └── DEPLOYMENT_GUIDE.md # Detailed deployment instructions
├── .github/workflows/      # CI/CD pipelines
├── vercel.json             # Vercel deployment config
└── README.md               # This file
```

---

## Key Features

### Real-Time Monitoring
- Live network topology visualization
- Performance metrics (uptime, throughput, latency, capacity)
- Alert management with smart filtering
- Status dashboard with at-a-glance health indicators

### Advanced Visualization (COFM Graph)
- **WBS** - Work Breakdown Structure
- **PERT** - Program Evaluation Review Technique
- **Gantt** - Timeline scheduling
- **Resource Allocation** - Scatterplot visualization

### Enterprise Security
- Post-quantum cryptography (ML-KEM, ML-DSA, SLH-DSA)
- JWT authentication with MFA
- Blockchain audit trails
- Role-based access control (RBAC)

### Target Applications
- **Supply Chain Networks** - End-to-end visibility from suppliers to retail
- **Air Traffic Control** - Real-time airspace coordination
- **Logistics Operations** - Multi-modal transportation monitoring
- **Operations Management** - Process optimization and resource allocation
- **Project Management** - Multi-stakeholder coordination

---

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev        # Development server on port 3001
```

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev        # Development server on port 3000
```

### Docker (Backend)
```bash
cd backend
docker-compose up -d
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Radix UI, Vite 6 |
| Backend | Node.js, Express 4, Socket.IO, TypeScript |
| Database | PostgreSQL / SQLite, Redis |
| Security | Post-quantum crypto, JWT, bcrypt, helmet |
| Blockchain | Ethereum/Polygon integration |
| Deployment | Vercel (frontend), Docker (backend) |

---

## Origin

CMPLX is derived from the [GLX (Global Liquid Exchange)](https://github.com/rsl37/GLX_Systems_Network) civic networking platform. It applies GLX's proven distributed architecture to enterprise operations monitoring. See `docs/FORK_STRATEGY.md` for the full strategy.

---

## License

Dual-licensed under:
- **PolyForm Shield License 1.0.0**
- **PolyForm Noncommercial License 1.0.0**
