# 🎯 Recon Platform

**Advanced Web-Based Reconnaissance Tool for Ubuntu**

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16">
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Prisma-6-orange" alt="Prisma 6">
  <img src="https://img.shields.io/badge/Socket.IO-4-green" alt="Socket.IO 4">
  <img src="https://img.shields.io/badge/Ubuntu-20.04%2B-orange" alt="Ubuntu 20.04+">
</p>

---

## ✨ Features

- 🌐 **Subdomain Enumeration** - Comprehensive DNS-based subdomain discovery
- 🔌 **Port Scanning** - Open port detection with nmap integration
- 🔍 **Service Detection** - Service fingerprinting and banner grabbing
- 🚨 **Vulnerability Assessment** - Security issue identification
- ⚡ **Real-time Updates** - Live progress tracking via WebSocket
- 📊 **Modern Dashboard** - Responsive and intuitive UI
- 💾 **Database Storage** - Persistent scan history and results
- 📄 **Export Reports** - Generate detailed reports
- 🔒 **Security First** - Input validation and secure by design

---

## 🏗️ Architecture

```
Frontend (Next.js 16) → API Routes → WebSocket Service (Port 3003) → Recon Tools
                                    ↓
                            Prisma + SQLite Database
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ubuntu 20.04+
# Node.js 18+ or Bun 1.3+
# nmap (recommended)
# curl, dig, netcat
```

### Installation

```bash
# 1. Install system dependencies
sudo apt update
sudo apt install -y nmap curl dnsutils netcat

# 2. Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# 3. Install project dependencies
bun install

# 4. Setup database
bun run db:push

# 5. Install recon service dependencies
cd mini-services/recon-service
bun install

# 6. Configure environment
cd ../..
cat > .env << EOF
DATABASE_URL="file:./db/custom.db"
NODE_ENV="development"
EOF
```

### Running the Application

```bash
# Terminal 1 - Start Next.js
bun run dev

# Terminal 2 - Start Recon WebSocket Service
cd mini-services/recon-service
bun run dev
```

Open browser at `http://localhost:3000`

---

## 📖 Usage

### Add Target

1. Navigate to **"Targets"** tab
2. Enter domain, IP, or URL
3. Select target type
4. Click **"Add Target"**

### Start Scan

1. Click **"Scan"** button on a target
2. Choose scan type:
   - **Subdomain** - Enumerate subdomains
   - **Port** - Scan open ports
   - **Service** - Detect services
   - **Full Scan** - All of the above
3. Monitor progress in **"Active Scans"** tab

### API Examples

```bash
# Get all targets
curl http://localhost:3000/api/recon/targets

# Add new target
curl -X POST http://localhost:3000/api/recon/targets \
  -H "Content-Type: application/json" \
  -d '{"target":"example.com","targetType":"domain"}'

# Start scan
curl -X POST http://localhost:3000/api/recon/scan \
  -H "Content-Type: application/json" \
  -d '{"targetId":"<id>","taskType":"subdomain"}'
```

---

## 📁 Project Structure

```
recon-platform/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── recon/          # API endpoints
│   │   └── page.tsx            # Main dashboard
│   ├── components/
│   │   └── ui/                 # Shadcn/UI components
│   └── lib/
│       ├── db.ts               # Prisma client
│       └── recon.ts            # Recon logic
├── mini-services/
│   └── recon-service/
│       ├── index.ts            # WebSocket server
│       └── package.json
├── prisma/
│   └── schema.prisma           # Database schema
└── db/
    └── custom.db               # SQLite database
```

---

## 🛠️ Configuration

### Environment Variables

```env
# Database
DATABASE_URL="file:./db/custom.db"

# Environment
NODE_ENV="production"

# Optional: API keys for external services
# SHODAN_API_KEY="your-shodan-key"
# VIRUSTOTAL_API_KEY="your-vt-key"
```

### Service Configuration

Edit `mini-services/recon-service/index.ts`:

```typescript
const PORT = 3003  // WebSocket service port
```

---

## 🔒 Security

- ✅ Input validation for all endpoints
- ✅ XSS and injection prevention
- ✅ Private IP blocking (10.x, 172.16-31.x, 192.168.x)
- ✅ Command execution with timeout
- ✅ CORS configuration
- ⚠️ **Important**: Add authentication for production use

---

## 🧪 Troubleshooting

### Port already in use

```bash
# Find and kill process
sudo lsof -i :3000
sudo lsof -i :3003
sudo kill -9 <PID>
```

### Database connection error

```bash
# Reset database
rm db/custom.db
bun run db:push
```

### Nmap not found

```bash
sudo apt install nmap -y
```

---

## 📚 Documentation

For comprehensive installation and usage guide, see:
📖 **[INSTALLATION.md](./INSTALLATION.md)**

---

## 🧰 Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Database**: Prisma ORM with SQLite
- **Real-time**: Socket.IO
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query
- **Runtime**: Bun

---

## 🔧 Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint

# Database operations
bun run db:push    # Push schema changes
bun run db:studio  # Open Prisma Studio
```

---

## 📄 License

This project is for educational and professional use. Always ensure you have permission to scan targets.

---

## ⚠️ Disclaimer

**USE RESPONSIBLY**

- Only scan systems you own or have explicit permission to test
- Comply with all applicable laws and regulations
- Report vulnerabilities responsibly
- Authors are not responsible for misuse

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📞 Support

- 📖 [Documentation](./INSTALLATION.md)
- 🐛 [GitHub Issues](./issues)
- 💬 [Discussions](./discussions)

---

**Made with ❤️ for the security community**
