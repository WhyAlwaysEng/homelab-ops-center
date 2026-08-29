# 🏠 Homelab & Network Ops Center

> Self-hosted dashboard for homelab monitoring and management.  
> Runs on **Windows 11 (WSL2)** for development and **Orange Pi (ARM64)** for production.

![License](https://img.shields.io/badge/license-MIT-blue)
![Docker](https://img.shields.io/badge/Docker-24.0-blue)
![Python](https://img.shields.io/badge/Python-3.11-3776AB)
![Next.js](https://img.shields.io/badge/Next.js-14-000000)

---

## ✨ Features

- 📊 **Real-time System Metrics** — CPU, RAM, Disk, Temperature with animated gauges
- 🐳 **Docker Management** — Start, Stop, Restart containers from the dashboard
- 🌐 **Network Monitoring** — ICMP ping with uptime tracking and alerts
- ☁️ **Cloudflare DDNS** — Auto-sync dynamic IP with Cloudflare DNS
- 🔔 **Alert Notifications** — Discord webhooks, Telegram bot, Firebase push
- 🔐 **Firebase Authentication** — Secure Google sign-in
- 📱 **Responsive Design** — Works on mobile, tablet, and desktop
- 🌈 **Modern UI** — Glassmorphism with rainbow gradients and glow effects

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                         │
│  ┌──────────────┐      ┌──────────────────────────┐    │
│  │   Frontend    │      │        Backend            │    │
│  │  Next.js 14   │─────▶│       FastAPI             │    │
│  │  Port 3000    │ HTTP │       Port 8000           │    │
│  └──────────────┘      │                          │    │
│                        │  ┌────────────────────┐  │    │
│                        │  │  Background Workers │  │    │
│                        │  │  - Ping Poller      │  │    │
│                        │  │  - DDNS Checker     │  │    │
│                        │  └────────────────────┘  │    │
│                        │                          │    │
│                        │  ┌───────┐ ┌──────────┐ │    │
│                        │  │SQLite │ │  Docker   │ │    │
│                        │  │  WAL  │ │  Socket   │ │    │
│                        │  └───────┘ └──────────┘ │    │
│                        └──────────────────────────┘    │
│                                  │                      │
└──────────────────────────────────┼──────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              Cloudflare      Discord        Telegram
               DDNS API       Webhook         Bot API
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker** ≥ 24.0
- **Docker Compose** ≥ 2.20
- **Git**

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/homelab-ops-center.git
cd homelab-ops-center
```

### 2. Configure environment

```bash
# Copy the example env file
cp .env.example .env

# Edit with your values
nano .env
```

### 3. Start the services

```bash
# Development mode (with hot reload)
docker compose up

# Production mode
docker compose -f docker-compose.yml up -d
```

### 4. Access the dashboard

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔧 Development Setup

### Windows 11 (WSL2)

```bash
# Enable WSL2
wsl --install

# Install Docker Desktop with WSL2 backend
# Clone and run
git clone https://github.com/yourusername/homelab-ops-center.git
cd homelab-ops-center
docker compose up
```

### Frontend Development (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Backend Development (without Docker)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 🍊 Orange Pi Deployment

### 1. Install Docker on Orange Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

### 2. Copy project to Orange Pi

```bash
# From your development machine
scp -r ./homelab-ops-center pi@192.168.1.50:~/

# Or use git
ssh pi@192.168.1.50
git clone https://github.com/yourusername/homelab-ops-center.git
```

### 3. Configure for Orange Pi

```bash
cd ~/homelab-ops-center

# Edit environment variables
nano .env

# Set APP_ENV=production
# Configure Firebase, Cloudflare, Discord/Telegram
```

### 4. Deploy

```bash
# Build and start
docker compose up -d --build

# Check status
docker compose ps
docker compose logs -f

# View resource usage
docker stats
```

### 5. Auto-start on boot

```bash
# Enable Docker service
sudo systemctl enable docker

# Docker Compose will auto-restart containers
# (restart: unless-stopped in docker-compose.yml)
```

---

## 📁 Project Structure

```
homelab-ops-center/
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── docker-compose.yml              # Production Docker Compose
├── docker-compose.override.yml     # Development overrides (auto-loaded)
├── README.md                       # This file
│
├── backend/                        # Python FastAPI backend
│   ├── Dockerfile                  # Multi-stage Python build
│   ├── requirements.txt            # Python dependencies
│   └── app/
│       ├── main.py                 # FastAPI application
│       ├── config.py               # Pydantic Settings
│       ├── database.py             # SQLite with WAL mode
│       ├── services/               # Business logic
│       │   ├── alert_service.py    # Discord + Telegram
│       │   ├── docker_service.py   # Container management
│       │   ├── firebase_service.py # Firebase Realtime DB
│       │   ├── ping_service.py     # ICMP monitoring
│       │   └── ddns_service.py     # Cloudflare DDNS
│       └── routers/                # API endpoints
│           ├── system.py           # Metrics + Docker API
│           ├── network.py          # Node CRUD + logs
│           └── ddns.py             # DDNS management
│
└── frontend/                       # Next.js 14 frontend
    ├── Dockerfile                  # Multi-stage Node build
    ├── package.json                # Frontend dependencies
    ├── next.config.js              # Next.js configuration
    ├── tailwind.config.js          # Tailwind CSS config
    └── src/
        ├── lib/
        │   ├── types.ts            # TypeScript interfaces
        │   ├── api.ts              # API client
        │   └── firebase.ts         # Firebase SDK
        ├── contexts/
        │   └── AuthContext.tsx      # Firebase Auth
        └── app/
            ├── globals.css         # Glassmorphism styles
            ├── layout.tsx          # Root layout
            └── page.tsx            # Dashboard UI
```

---

## 🔐 Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ENV` | Environment mode | `production` or `development` |
| `DB_PATH` | SQLite database path | `/app/data/homelab.db` |

### Firebase (Optional but Recommended)

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to service account JSON |
| `FIREBASE_DATABASE_URL` | Realtime Database URL |

### Cloudflare DDNS (Optional)

| Variable | Description |
|----------|-------------|
| `CF_API_TOKEN` | Cloudflare API token |
| `CF_ZONE_ID` | DNS zone ID |
| `CF_RECORD_ID` | DNS record ID |
| `CF_RECORD_NAME` | Subdomain (e.g., `homelab.example.com`) |

### Notifications (Optional)

| Variable | Description |
|----------|-------------|
| `DISCORD_WEBHOOK_URL` | Discord webhook URL |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat ID |

See `.env.example` for all available configuration options.

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend

# Common issues:
# - Docker socket not mounted
# - SQLite database permission denied
# - Missing environment variables
```

### Frontend shows "Failed to fetch"

```bash
# Backend not running
docker compose ps

# Check backend health
curl http://localhost:8000/health

# Restart backend
docker compose restart backend
```

### Docker socket permission denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended for production)
sudo docker compose up
```

### Orange Pi running out of memory

```bash
# Check memory usage
docker stats

# Reduce memory limits in docker-compose.yml
# backend: 256M → 192M
# frontend: 128M → 96M

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📝 API Documentation

Once the backend is running, visit:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python web framework
- [Next.js](https://nextjs.org/) — React framework for production
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Docker](https://www.docker.com/) — Container platform
- [Firebase](https://firebase.google.com/) — Authentication and real-time database

---

**Made with ❤️ for the homelab community**
