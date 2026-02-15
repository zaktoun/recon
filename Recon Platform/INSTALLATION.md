# Recon Platform - Advanced Reconnaissance Tool for Ubuntu

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Architecture](#architecture)
4. [Installation Guide](#installation-guide)
5. [Configuration](#configuration)
6. [Usage Guide](#usage-guide)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)
10. [Advanced Features](#advanced-features)

---

## 🎯 Overview

**Recon Platform** adalah web-based reconnaissance tool yang powerful untuk Ubuntu yang menyediakan kemampuan scanning komprehensif dengan antarmuka modern dan real-time updates.

### Fitur Utama:

- ✅ **Subdomain Enumeration** - Temukan subdomain dengan DNS enumeration
- ✅ **Port Scanning** - Scan port terbuka dengan nmap atau fallback methods
- ✅ **Service Detection** - Deteksi service dan banner grabbing
- ✅ **Vulnerability Assessment** - Identifikasi security issues
- ✅ **Real-time Updates** - WebSocket untuk progress tracking
- ✅ **Modern Dashboard** - UI yang responsif dan user-friendly
- ✅ **Database Storage** - Simpan history dan hasil scan
- ✅ **Export Reports** - Generate reports dalam berbagai format

---

## 💻 System Requirements

### Minimum Requirements:

- **OS**: Ubuntu 20.04 LTS atau lebih baru
- **CPU**: 2 cores atau lebih
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 10GB free space
- **Node.js**: v18+ (Bun v1.3+ recommended)
- **Network**: Internet connection untuk updates dan dependencies

### Software Dependencies:

#### Required Tools:

```bash
# Core tools (harus terinstall)
curl -y
dig
netcat (nc)
bash
timeout
```

#### Optional Tools (recommended untuk hasil yang lebih baik):

```bash
# Port scanner - recommended
sudo apt install nmap -y

# Advanced subdomain enumeration (optional)
# Subfinder
wget https://github.com/projectdiscovery/subfinder/releases/latest/download/subfinder_linux_amd64.zip
unzip subfinder_linux_amd64.zip
sudo mv subfinder /usr/local/bin/

# Amass (optional)
sudo apt install amass -y
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Next.js 16 Frontend                    │
│  - Dashboard Overview                               │
│  - Target Input Form                                │
│  - Real-time Results Display                        │
│  - History & Reports                                │
└─────────────────────────────────────────────────────┘
                    ↓ API Routes
┌─────────────────────────────────────────────────────┐
│         Backend API Layer (Next.js)                 │
│  - REST API endpoints                               │
│  - Database operations                              │
│  - WebSocket client                                 │
└─────────────────────────────────────────────────────┘
                    ↓ WebSocket
┌─────────────────────────────────────────────────────┐
│    Recon Service (Port 3003) - Mini Service         │
│  - Execute recon tools                              │
│  - Progress updates via WebSocket                   │
│  - Security validation                              │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│         Prisma + SQLite Database                    │
│  - Targets                                          │
│  - Scan results                                     │
│  - History                                          │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Installation Guide

### Step 1: Update System

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git unzip build-essential
```

### Step 2: Install Node.js / Bun

#### Option A: Using Bun (Recommended)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Reload shell
source ~/.bashrc

# Verify installation
bun --version
```

#### Option B: Using Node.js

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Install Reconnaissance Tools

```bash
# Install nmap (recommended)
sudo apt install nmap -y

# Install netcat
sudo apt install netcat -y

# Install DNS tools
sudo apt install dnsutils -y

# Install curl (harus sudah terinstall)
curl --version
```

### Step 4: Setup Project

```bash
# Clone atau copy project directory
cd /path/to/recon-platform

# Install dependencies (untuk Next.js main project)
bun install

# Setup database
bun run db:push
```

### Step 5: Setup Recon WebSocket Service

```bash
# Navigate to recon service
cd mini-services/recon-service

# Install service dependencies
bun install

# Configure database path if needed
export DATABASE_URL="file:../../db/custom.db"
```

### Step 6: Configure Environment Variables

```bash
# Create .env file in project root
cat > .env << EOF
DATABASE_URL="file:./db/custom.db"
NODE_ENV="production"
EOF
```

### Step 7: Start Services

#### Method A: Development Mode (Manual)

```bash
# Terminal 1 - Start Next.js main app
cd /path/to/recon-platform
bun run dev

# Terminal 2 - Start WebSocket recon service
cd /path/to/recon-platform/mini-services/recon-service
bun run dev
```

#### Method B: Production Mode with Systemd (Recommended)

```bash
# Create systemd service for Next.js
sudo tee /etc/systemd/system/recon-platform.service > /dev/null << EOF
[Unit]
Description=Recon Platform - Next.js Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/path/to/recon-platform
ExecStart=/home/$USER/.bun/bin/bun run dev
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for Recon WebSocket Service
sudo tee /etc/systemd/system/recon-service.service > /dev/null << EOF
[Unit]
Description=Recon WebSocket Service
After=network.target recon-platform.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/path/to/recon-platform/mini-services/recon-service
ExecStart=/home/$USER/.bun/bin/bun run dev
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="DATABASE_URL=file:../../db/custom.db"

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable recon-platform recon-service

# Start services
sudo systemctl start recon-platform recon-service

# Check status
sudo systemctl status recon-platform
sudo systemctl status recon-service
```

### Step 8: Access Application

```bash
# Open browser and navigate to:
# http://localhost:3000 (default)
```

---

## ⚙️ Configuration

### Database Configuration

Database configuration ada di `.env` file:

```env
# SQLite database path
DATABASE_URL="file:./db/custom.db"
```

Untuk production, consider PostgreSQL atau MySQL:

```env
# PostgreSQL example
DATABASE_URL="postgresql://user:password@localhost:5432/recondb"

# MySQL example
DATABASE_URL="mysql://user:password@localhost:3306/recondb"
```

Update `prisma/schema.prisma` sesuai:

```prisma
datasource db {
  provider = "postgresql"  // atau "mysql"
  url      = env("DATABASE_URL")
}
```

### WebSocket Service Configuration

Edit `mini-services/recon-service/index.ts`:

```typescript
const PORT = 3003  // Change port if needed

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',  // Restrict to your domain in production
    methods: ['GET', 'POST']
  }
})
```

### Security Configuration

#### Rate Limiting (Recommended):

Tambahkan rate limiting di Next.js middleware:

```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Add rate limiting logic here
  // Or use a library like next-rate-limit
  return NextResponse.next()
}
```

#### CORS Configuration:

Untuk production, restrict CORS:

```typescript
// mini-services/recon-service/index.ts
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['https://yourdomain.com'],  // Your actual domain
    methods: ['GET', 'POST'],
    credentials: true
  }
})
```

---

## 📖 Usage Guide

### Adding a Target

1. Buka aplikasi di browser
2. Navigate ke **"Targets"** tab
3. Masukkan target:
   - **Domain**: `example.com`
   - **IP**: `192.168.1.1`
   - **URL**: `https://example.com`
4. Pilih target type
5. Click **"Add Target"**

### Starting a Scan

1. From targets list, click **"Scan"** button
2. Pilih scan type:
   - **Subdomain**: Enumerate subdomains
   - **Port**: Scan for open ports
   - **Service**: Detect services and banners
   - **Full Scan**: Comprehensive scan (all above)
3. Monitor progress di **"Active Scans"** tab

### Viewing Results

1. Navigate ke **"Active Scans"** tab
2. View real-time progress
3. Results akan muncul saat scan selesai
4. Click **"Export Report"** untuk download

### API Usage

#### Get All Targets:

```bash
curl http://localhost:3000/api/recon/targets
```

#### Add New Target:

```bash
curl -X POST http://localhost:3000/api/recon/targets \
  -H "Content-Type: application/json" \
  -d '{
    "target": "example.com",
    "targetType": "domain",
    "description": "Test target"
  }'
```

#### Start Scan:

```bash
curl -X POST http://localhost:3000/api/recon/scan \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "target-id-here",
    "taskType": "subdomain"
  }'
```

---

## 🔒 Security Best Practices

### 1. Input Validation

Semua input divalidasi untuk mencegah:
- XSS (Cross-Site Scripting)
- SQL Injection
- Command Injection
- Path Traversal

### 2. Rate Limiting

Implement rate limiting untuk mencegah abuse:
- Max 10 requests per minute per IP
- Max 3 active scans per user
- Max 100 targets per account

### 3. Target Restrictions

Private IP addresses diblokir secara default:
- 10.0.0.0/8
- 172.16.0.0/12
- 192.168.0.0/16
- 127.0.0.0/8

### 4. Authentication (Optional)

Untuk production, implement authentication:

```typescript
// Middleware example
export async function middleware(request: NextRequest) {
  const token = request.headers.get('authorization')

  if (!token || token !== process.env.API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}
```

### 5. Logging & Monitoring

Enable comprehensive logging:

```typescript
// src/lib/logger.ts
export function logSecurityEvent(event: string, details: any) {
  console.error(`[SECURITY] ${event}`, details)
  // Send to monitoring service
}
```

### 6. Regular Updates

```bash
# Update dependencies regularly
bun update

# Check for security vulnerabilities
bun audit

# Update system packages
sudo apt update && sudo apt upgrade -y
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Problem:** `Error: Database connection failed`

**Solution:**
```bash
# Check database file exists
ls -la db/custom.db

# Check permissions
chmod 644 db/custom.db

# Regenerate database
bun run db:push
```

#### 2. Port Already in Use

**Problem:** `Error: Port 3000/3003 already in use`

**Solution:**
```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :3003

# Kill process
sudo kill -9 <PID>

# Or change port in configuration
```

#### 3. Nmap Not Found

**Problem:** `nmap: command not found`

**Solution:**
```bash
# Install nmap
sudo apt install nmap -y

# Verify installation
which nmap
nmap --version
```

#### 4. WebSocket Connection Failed

**Problem:** WebSocket connection not established

**Solution:**
```bash
# Check recon service is running
sudo systemctl status recon-service

# Check logs
sudo journalctl -u recon-service -f

# Restart service
sudo systemctl restart recon-service
```

#### 5. Permission Denied

**Problem:** `Error: EACCES: permission denied`

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER /path/to/recon-platform
chmod -R 755 /path/to/recon-platform
```

### Debug Mode

Enable verbose logging:

```bash
# Set NODE_ENV=development
export NODE_ENV=development

# Check logs
tail -f dev.log
tail -f /var/log/syslog
```

---

## 🛠️ Maintenance

### Database Backup

```bash
# Backup SQLite database
cp db/custom.db db/custom.db.backup.$(date +%Y%m%d)

# Backup to external location
aws s3 cp db/custom.db s3://backups/recon/custom.db.$(date +%Y%m%d)
```

### Database Cleanup

```bash
# Delete old scans (older than 30 days)
# Create script: scripts/cleanup.js

# Or manually using SQLite
sqlite3 db/custom.db << EOF
DELETE FROM ReconTask WHERE completedAt < datetime('now', '-30 days');
VACUUM;
EOF
```

### Log Rotation

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/recon-platform > /dev/null << EOF
/path/to/recon-platform/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

### Health Checks

```bash
# Create health check script
cat > healthcheck.sh << 'EOF'
#!/bin/bash
# Check if services are running
if systemctl is-active --quiet recon-platform; then
    echo "✓ Recon Platform: Running"
else
    echo "✗ Recon Platform: Not running"
    exit 1
fi

if systemctl is-active --quiet recon-service; then
    echo "✓ Recon Service: Running"
else
    echo "✗ Recon Service: Not running"
    exit 1
fi

# Check API
if curl -s http://localhost:3000/api/recon/targets > /dev/null; then
    echo "✓ API: Responsive"
else
    echo "✗ API: Not responsive"
    exit 1
fi

echo "All checks passed!"
EOF

chmod +x healthcheck.sh
```

---

## 🚀 Advanced Features

### Custom Scan Profiles

Create custom scan configurations:

```typescript
// src/lib/scan-profiles.ts
export const scanProfiles = {
  quick: {
    ports: 'top-10',
    timeout: 5000,
    techniques: ['dns', 'common-ports']
  },
  comprehensive: {
    ports: '1-65535',
    timeout: 30000,
    techniques: ['dns', 'subdomains', 'all-ports', 'services', 'vulns']
  },
  stealth: {
    ports: 'common',
    timeout: 10000,
    timing: 'T2', // Slower, less noisy
    decoys: true
  }
}
```

### Integration with External Tools

#### Shodan Integration:

```typescript
// src/lib/shodan.ts
export async function queryShodan(target: string) {
  const response = await fetch(`https://api.shodan.io/shodan/host/${target}?key=${SHODAN_API_KEY}`)
  return response.json()
}
```

#### VirusTotal Integration:

```typescript
// src/lib/virustotal.ts
export async function scanUrl(url: string) {
  const response = await fetch('https://www.virustotal.com/api/v3/urls', {
    method: 'POST',
    headers: { 'x-apikey': VT_API_KEY },
    body: new URLSearchParams({ url })
  })
  return response.json()
}
```

### Notification System

Email/Slack notifications:

```typescript
// src/lib/notifications.ts
export async function sendNotification(result: any) {
  // Send email
  await sendEmail({
    to: 'admin@example.com',
    subject: 'Scan completed',
    body: JSON.stringify(result)
  })

  // Send to Slack
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({ text: 'Scan completed!' })
  })
}
```

---

## 📞 Support & Resources

### Documentation:

- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Socket.IO: https://socket.io/docs
- Nmap: https://nmap.org/book/man.html

### Community:

- GitHub Issues
- Discord/Slack channel
- Stack Overflow tag: `recon-platform`

---

## 📄 License

This project is for educational and professional use. Always ensure you have permission to scan targets before conducting reconnaissance.

---

## ⚠️ Legal Disclaimer

**IMPORTANT:** This tool is designed for legitimate security testing and reconnaissance purposes only. Users must:

1. Obtain explicit permission before scanning any targets
2. Only scan systems they own or have authorization to test
3. Comply with all applicable laws and regulations
4. Use responsibly and ethically
5. Report any vulnerabilities found responsibly

The authors are not responsible for misuse of this tool.

---

## 🎓 Learning Resources

### Books:

- "Penetration Testing: A Hands-On Introduction to Hacking"
- "Web Application Hacker's Handbook"
- "Red Team Development and Operations"

### Courses:

- TryHackMe
- HackTheBox Academy
- SANS SEC560
- Offensive Security (OSCP)

### Practice Targets:

- Hack The Box
- TryHackMe
- VulnHub
- OWASP Juice Shop

---

## ✅ Installation Checklist

- [ ] System updated and upgraded
- [ ] Node.js/Bun installed
- [ ] Required tools (nmap, curl, nc, dig) installed
- [ ] Project dependencies installed
- [ ] Database initialized
- [ ] Environment variables configured
- [ ] Services configured (systemd or manual)
- [ ] Firewall rules configured
- [ ] Application accessible via browser
- [ ] Test scan completed successfully

---

**Congratulations!** 🎉 Your Recon Platform is now ready to use.

For any issues or questions, please refer to the troubleshooting section or open a GitHub issue.
