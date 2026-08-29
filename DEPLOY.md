# 🍊 คู่มือการย้ายโปรเจคไป Orange Pi

> ขั้นตอนละเอียดสำหรับย้าย Homelab & Network Ops Center  
> จาก Windows 11 ไปรันบน Orange Pi (ARM64 Linux)

---

## 📋 สารบัญ

1. [สิ่งที่ต้องเตรียม](#1--สิ่งที่ต้องเตรียม)
2. [ตั้งค่า Orange Pi](#2--ตั้งค่า-orange-pi)
3. [โอนย้ายไฟล์โปรเจค](#3--โอนย้ายไฟล์โปรเจค)
4. [ตั้งค่า Firebase](#4--ตั้งค่า-firebase)
5. [ตั้งค่า Cloudflare DDNS](#5--ตั้งค่า-cloudflare-ddns)
6. [ตั้งค่า Notifications](#6--ตั้งค่า-notifications)
7. [Build และ Deploy](#7--build-และ-deploy)
8. [ตรวจสอบการทำงาน](#8--ตรวจสอบการทำงาน)
9. [ตั้งค่า Auto-Start](#9--ตั้งค่า-auto-start)
10. [แก้ไขปัญหาที่พบบ่อย](#10--แก้ไขปัญหาที่พบบ่อย)
11. [คำแนะนำเพิ่มเติม](#11--คำแนะนำเพิ่มเติม)

---

## 1. 🎯 สิ่งที่ต้องเตรียม

### 1.1 Hardware

| อุปกรณ์ | ข้อกำหนด | หมายเหตุ |
|---------|----------|---------|
| Orange Pi | 4GB RAM ขึ้นไป | Orange Pi 5 แนะนำ |
| MicroSD Card | 32GB+ | Class 10 ขึ้นไป |
| Power Supply | 5V/3A USB-C | ใช้ adapter คุณภาพดี |
| Ethernet Cable | Cat5e ขึ้นไป | แนะนำใช้ LAN แทน WiFi |

### 1.2 Software ที่ต้องติดตั้งบน Windows

```
✅ Git           - https://git-scm.com
✅ PowerShell     - มีมาใน Windows 11
✅ WinSCP        - https://winscp.net (สำหรับโอนไฟล์)
✅ PuTTY         - https://putty.org (สำหรับ SSH)
✅ Docker Desktop - https://docker.com (สำหรับ dev)
```

### 1.3 บัญชีที่ต้องสมัคร

```
✅ Firebase       - https://console.firebase.google.com
✅ Cloudflare     - https://dash.cloudflare.com (ถ้าใช้ DDNS)
✅ Discord        - https://discord.com (ถ้าใช้ webhook)
✅ Telegram       - https://telegram.org (ถ้าใช้ bot)
```

---

## 2. 🖥️ ตั้งค่า Orange Pi

### 2.1 ติดตั้ง OS (Orange Pi OS หรือ Ubuntu)

```bash
# ดาวน์โหลด OS image จาก
# https://www.orangepi.org/orangepizone/

# ใช้ Raspberry Pi Imager หรือ Balena Etcher
# เขียนลง MicroSD Card

# เมื่อเปิด Orange Pi ครั้งแรก
# ตั้งค่า username/password
# ตั้งค่า IP address (Static IP แนะนำ)
```

### 2.2 ตั้งค่า Static IP (แนะนำ)

```bash
# SSH เข้า Orange Pi
ssh pi@<IP_ADDRESS>

# แก้ไขไฟล์ network config
sudo nano /etc/network/interfaces.d/eth0

# เพิ่ม:
auto eth0
iface eth0 inet static
    address 192.168.1.50
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4

# รีสตาร์ท network
sudo systemctl restart networking
```

### 2.3 อัพเดทระบบ

```bash
# อัพเดท package list
sudo apt update

# อัพเดท packages ทั้งหมด
sudo apt upgrade -y

# ติดตั้ง packages ที่จำเป็น
sudo apt install -y \
    curl \
    wget \
    git \
    htop \
    net-tools \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release
```

### 2.4 ติดตั้ง Docker

```bash
# ลบ Docker เก่า (ถ้ามี)
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# เพิ่ม Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# เพิ่ม Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# ติดตั้ง Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# ตรวจสอบ Docker version
docker --version
docker compose version
```

### 2.5 ตั้งค่า Docker ให้ใช้โดยไม่ต้อง sudo

```bash
# เพิ่ม user เข้า docker group
sudo usermod -aG docker $USER

# ใช้ newgrp เพื่อให้生效ทันที
newgrp docker

# ทดสอบ
docker run hello-world
```

### 2.6 ตั้งค่า Docker Daemon

```bash
# แก้ไข Docker daemon config
sudo nano /etc/docker/daemon.json
```

เพิ่มเนื้อหา:
```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    }
  },
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true
}
```

```bash
# รีสตาร์ท Docker
sudo systemctl restart docker

# ตรวจสอบสถานะ
sudo systemctl status docker
```

### 2.7 เพิ่ม Swap Space (ถ้า RAM น้อย)

```bash
# ตรวจสอบ RAM
free -h

# ถ้า RAM น้อยกว่า 2GB ควรเพิ่ม swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# ทำให้ถาวร
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# ตรวจสอบ
free -h
```

---

## 3. 📁 โอนย้ายไฟล์โปรเจค

### 3.1 วิธีที่ 1: ใช้ Git (แนะนำ)

```bash
# บน Windows - Push ขึ้น GitHub
cd E:\Engprogram\homelab
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/homelab-ops-center.git
git push -u origin main

# บน Orange Pi - Clone ลงมา
cd ~
git clone https://github.com/YOUR_USERNAME/homelab-ops-center.git
cd homelab-ops-center
```

### 3.2 วิธีที่ 2: ใช้ SCP (คัดลอกตรง)

```bash
# บน Windows PowerShell - คัดลอกไป Orange Pi
$ORANGE_PI_IP = "192.168.1.50"
$ORANGE_PI_USER = "pi"

# คัดลอกทั้งโปรเจค (ยกเว้น node_modules)
scp -r E:\Engprogram\homelab\backend ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/
scp -r E:\Engprogram\homelab\frontend ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/
scp E:\Engprogram\homelab\docker-compose.yml ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/homelab-ops-center/
scp E:\Engprogram\homelab\docker-compose.override.yml ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/homelab-ops-center/
scp E:\Engprogram\homelab\.env.example ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/homelab-ops-center/
scp E:\Engprogram\homelab\README.md ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/homelab-ops-center/
scp -r E:\Engprogram\homelab\nginx ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/homelab-ops-center/

# หรือใช้ rsync (เร็วกว่า)
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='__pycache__' \
    E:\Engprogram\homelab/ ${ORANGE_PI_USER}@${ORANGE_PI_IP}:~/homelab-ops-center/
```

### 3.3 วิธีที่ 3: ใช้ WinSCP (มี GUI)

```
1. เปิด WinSCP
2. สร้าง connection ใหม่
   - Host name: 192.168.1.50
   - User name: pi
   - Password: ****
3. ลากไฟล์จาก Windows ไป Orange Pi
4. วางไว้ที่ ~/homelab-ops-center/
```

### 3.4 ตรวจสอบไฟล์บน Orange Pi

```bash
# SSH เข้า Orange Pi
ssh pi@192.168.1.50

# ตรวจสอบโครงสร้างไฟล์
cd ~/homelab-ops-center
tree -L 2

# ควรเห็น:
# .
# ├── backend/
# │   ├── Dockerfile
# │   ├── requirements.txt
# │   └── app/
# ├── frontend/
# │   ├── Dockerfile
# │   ├── package.json
# │   └── src/
# ├── nginx/
# │   └── nginx.conf
# ├── docker-compose.yml
# ├── docker-compose.override.yml
# ├── .env.example
# └── README.md
```

---

## 4. 🔥 ตั้งค่า Firebase

### 4.1 สร้าง Firebase Project

```
1. เปิด https://console.firebase.google.com
2. คลิก "Create a project"
3. ตั้งชื่อ project: "homelab-ops-center"
4. ปิด Google Analytics (ไม่จำเป็น)
5. คลิก "Create project"
```

### 4.2 เปิด Realtime Database

```
1. ใน Firebase Console ไปที่ "Realtime Database"
2. คลิก "Create Database"
3. เลือก "Start in test mode"
4. เลือก region ที่ใกล้ที่สุด
5. คลิก "Enable"
```

### 4.3 เปิด Authentication

```
1. ไปที่ "Authentication"
2. คลิก "Get started"
3. ไปที่ "Sign-in method"
4. เปิด "Google"
5. ตั้ง email ผู้ดูแล
6. คลิก "Save"
```

### 4.4 สร้าง Service Account Key

```
1. ไปที่ Project Settings (gear icon)
2. ไปที่ "Service accounts"
3. คลิก "Generate new private key"
4. ยืนยัน
5. บันทึกไฟล์ JSON ไว้
```

### 4.5 คัดลอกไฟล์ Key ไป Orange Pi

```bash
# บน Windows
scp path\to\serviceAccountKey.json pi@192.168.1.50:~/homelab-ops-center/config/

# บน Orange Pi - สร้าง folder
mkdir -p ~/homelab-ops-center/config
```

### 4.6 ค่า Firebase ที่ต้องใช้

```
ใน Firebase Console → Project Settings → General → Your apps → Web app

NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=homelab-ops-center.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://homelab-ops-center-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=homelab-ops-center
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=homelab-ops-center.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

FIREBASE_PROJECT_ID=homelab-ops-center
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/config/serviceAccountKey.json
FIREBASE_DATABASE_URL=https://homelab-ops-center-default-rtdb.firebaseio.com
```

---

## 5. ☁️ ตั้งค่า Cloudflare DDNS

> ⚠️ ข้ามขั้นตอนนี้ได้ถ้าไม่ใช้ DDNS

### 5.1 สร้าง API Token

```
1. เปิด https://dash.cloudflare.com
2. ไปที่ My Profile → API Tokens
3. คลิก "Create Token"
4. เลือก "Edit zone DNS" template
5. จำกัดสิทธิ์เฉพาะ zone ที่ต้องการ
6. คลิก "Continue to summary"
7. คลิก "Create Token"
8. คัดลอก token ไว้
```

### 5.2 ค้นหา Zone ID และ Record ID

```
1. ไปที่หน้า DNS ของ domain
2. Zone ID อยู่ที่ด้านขวาของหน้า
3. Record ID อยู่ในรายละเอียดของ DNS record
```

### 5.3 ค่าที่ต้องใช้

```
CF_API_TOKEN=your-api-token
CF_ZONE_ID=your-zone-id
CF_RECORD_ID=your-record-id
CF_RECORD_NAME=homelab.yourdomain.com
```

---

## 6. 🔔 ตั้งค่า Notifications

### 6.1 Discord Webhook

```
1. เปิด Discord
2. ไปที่ Server Settings → Integrations → Webhooks
3. คลิก "New Webhook"
4. ตั้งชื่อ: "Homelab Alerts"
5. เลือก channel ที่ต้องการ
6. คลิก "Copy Webhook URL"
```

ค่าที่ต้องใช้:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 6.2 Telegram Bot

```
1. เปิด Telegram
2. ค้นหา @BotFather
3. พิมพ์ /newbot
4. ตั้งชื่อ bot: "Homelab Alerts Bot"
5. ตั้ง username: "homelab_alerts_bot"
6. คัดลอก Bot Token

7. ค้นหา @userinfobot
8. พิมพ์ /start
9. คัดลอก Chat ID
```

ค่าที่ต้องใช้:
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

---

## 7. 🚀 Build และ Deploy

### 7.1 ตั้งค่า Environment Variables

```bash
# SSH เข้า Orange Pi
ssh pi@192.168.1.50

# ไปที่โปรเจค
cd ~/homelab-ops-center

# คัดลอก .env.example
cp .env.example .env

# แก้ไข .env
nano .env
```

ตั้งค่าในไฟล์ `.env`:
```bash
# App Environment
APP_ENV=production
DEBUG=false

# Firebase (ใส่ค่าจากขั้นตอนที่ 4)
FIREBASE_PROJECT_ID=homelab-ops-center
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/config/serviceAccountKey.json
FIREBASE_DATABASE_URL=https://homelab-ops-center-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=homelab-ops-center.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://homelab-ops-center-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=homelab-ops-center
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=homelab-ops-center.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Cloudflare DDNS (ใส่ค่าจากขั้นตอนที่ 5)
CF_API_TOKEN=your-api-token
CF_ZONE_ID=your-zone-id
CF_RECORD_ID=your-record-id
CF_RECORD_NAME=homelab.yourdomain.com

# Notifications (ใส่ค่าจากขั้นตอนที่ 6)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# Worker intervals
PING_INTERVAL=30
DDNS_CHECK_INTERVAL=300
LOG_RETENTION_DAYS=3
```

### 7.2 สร้าง Config Directory

```bash
# สร้าง folder สำหรับ Firebase key
mkdir -p config

# ตรวจสอบว่าไฟล์อยู่ถูกที่
ls -la config/
# ควรเห็น serviceAccountKey.json
```

### 7.3 Build Docker Images

```bash
# Build ทั้ง backend และ frontend
docker compose build

# ถ้าต้องการ build สำหรับ ARM64 เท่านั้น
docker compose build --platform linux/arm64

# ขั้นตอนนี้อาจใช้เวลา 10-20 นาที ขึ้นอยู่กับความเร็วอินเทอร์เน็ต
```

### 7.4 เริ่มต้นบริการ

```bash
# เริ่มต้นทั้งหมด
docker compose up -d

# ตรวจสอบสถานะ
docker compose ps

# ควรเห็น:
# NAME                STATUS              PORTS
# homelab-backend     Up (healthy)        8000/tcp
# homelab-frontend    Up                  3000/tcp
# homelab-nginx       Up                  0.0.0.0:80->80/tcp
```

### 7.5 ตรวจสอบ Log

```bash
# ดู log ทั้งหมด
docker compose logs -f

# ดู log เฉพาะ backend
docker compose logs -f backend

# ดู log เฉพาะ frontend
docker compose logs -f frontend

# ดู log ล่าสุด 100 บรรทัด
docker compose logs --tail=100
```

---

## 8. ✅ ตรวจสอบการทำงาน

### 8.1 ตรวจสอบ Services

```bash
# ตรวจสอบ Docker containers
docker compose ps

# ตรวจสอบ resource usage
docker stats

# ตรวจสอบ health
docker inspect --format='{{.State.Health.Status}}' homelab-backend
```

### 8.2 ตรวจสอบ API

```bash
# Health check
curl http://localhost:8000/health

# System metrics
curl http://localhost:8000/api/system/metrics

# Docker containers
curl http://localhost:8000/api/docker/containers

# Network nodes
curl http://localhost:8000/api/network/nodes
```

### 8.3 ตรวจสอบ Web Dashboard

```
เปิดเบราว์เซอร์ไปที่:
- http://192.168.1.50 (ผ่าน nginx)
- http://192.168.1.50:3000 (ตรงไป frontend)

ควรเห็น:
✅ Login screen ปรากฏ
✅ "Enter Demo Mode" ปุ่มทำงาน
✅ Dashboard แสดงข้อมูล mock
```

### 8.4 ทดสอบ Firebase Real-time

```
1. เปิด Dashboard 2 เครื่องพร้อมกัน
2. เพิ่ม network node บนเครื่องหนึ่ง
3. ตรวจสอบว่าอีกเครื่องเห็นข้อมูลใหม่ทันที
```

### 8.5 ทดสอบ Notifications

```bash
# ทดสอบ Discord webhook
curl -X POST https://discord.com/api/webhooks/YOUR_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"content": "Test alert from Homelab Ops Center!"}'
```

---

## 9. ⚙️ ตั้งค่า Auto-Start

### 9.1 Docker Auto-Start

```bash
# เปิด Docker service ให้เริ่มตอน boot
sudo systemctl enable docker

# ตรวจสอบ
sudo systemctl is-enabled docker
```

### 9.2 Docker Compose Auto-Start

สร้าง systemd service:

```bash
sudo nano /etc/systemd/system/homelab.service
```

เพิ่มเนื้อหา:
```ini
[Unit]
Description=Homelab & Network Ops Center
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/pi/homelab-ops-center
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
# -enable service
sudo systemctl enable homelab.service

# ทดสอบ service
sudo systemctl start homelab.service

# ตรวจสอบสถานะ
sudo systemctl status homelab.service
```

### 9.3 ตรวจสอบ Auto-Start

```bash
# รีสตาร์ท Orange Pi
sudo reboot

# รอสักครู่ แล้ว SSH เข้ามาใหม่
ssh pi@192.168.1.50

# ตรวจสอบว่า services ทำงาน
docker compose ps

# ควรเห็น containers ทั้งหมดอยู่ในสถานะ "Up"
```

---

## 10. 🔧 แก้ไขปัญหาที่พบบ่อย

### ปัญหา: Docker permission denied

```bash
# สาเหตุ: user ไม่มีสิทธิ์เข้าถึง Docker socket
# วิธีแก้:
sudo usermod -aG docker $USER
newgrp docker

# หรือ logout แล้ว login ใหม่
```

### ปัญหา: Port 80 ถูกใช้งาน

```bash
# ตรวจสอบ port ที่ใช้งาน
sudo netstat -tulpn | grep :80

# เปลี่ยน port ใน docker-compose.yml
# จาก: "80:80"
# เป็น: "8080:80"
```

### ปัญหา: Memory ไม่พอ

```bash
# ตรวจสอบ memory usage
docker stats

# ลด memory limit ใน docker-compose.yml
# backend: 384M → 256M
# frontend: 128M → 96M

# เพิ่ม swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### ปัญหา: Build ช้ามาก

```bash
# ใช้ Docker BuildKit เร็วขึ้น
export DOCKER_BUILDKIT=1
docker compose build

# หรือ build ทีละ service
docker compose build backend
docker compose build frontend
```

### ปัญหา: Firebase ไม่ connect

```bash
# ตรวจสอบไฟล์ key
ls -la config/serviceAccountKey.json

# ตรวจสอบ permissions
chmod 600 config/serviceAccountKey.json

# ตรวจสอบ log
docker compose logs backend | grep firebase
```

### ปัญหา: Temperature ไม่แสดง

```bash
# ตรวจสอบ thermal zone
cat /sys/class/thermal/thermal_zone0/temp

# ถ้าไม่มี ตรวจสอบ path อื่น
ls /sys/class/thermal/
```

### ปัญหา: ICMP Ping ไม่ทำงาน

```bash
# ตรวจสอบ cap_add ใน docker-compose.yml
# ต้องมี: cap_add: NET_RAW

# ทดสอบ ping จาก container
docker compose exec backend python -c "from ping3 import ping; print(ping('8.8.8.8'))"
```

### ปัญหา: Database locked

```bash
# ตรวจสอบ WAL mode
docker compose exec backend python -c "
import sqlite3
conn = sqlite3.connect('/app/data/homelab.db')
print(conn.execute('PRAGMA journal_mode').fetchone())
"

# ถ้าไม่ใช่ WAL ให้ลบ database แล้วรันใหม่
docker compose down
rm -rf /var/lib/docker/volumes/homelab-ops-center_homelab_data/_data/*
docker compose up -d
```

---

## 11. 💡 คำแนะนำเพิ่มเติม

### 11.1 สำรองข้อมูล (Backup)

```bash
# สำรอง SQLite database
docker compose exec backend cp /app/data/homelab.db /app/data/homelab.db.backup

# คัดลอกออกมาเก็บไว้ข้างนอก
docker cp homelab-backend:/app/data/homelab.db ~/backup/homelab_$(date +%Y%m%d).db

# ตั้ง cron job สำรองอัตโนมัติทุกวัน
crontab -e
# เพิ่มบรรทัด:
0 2 * * * docker cp homelab-backend:/app/data/homelab.db ~/backup/homelab_$(date +\%Y\%m\%d).db
```

### 11.2 อัพเดทโปรเจค

```bash
# ดึงเวอร์ชันใหม่
cd ~/homelab-ops-center
git pull origin main

# Build ใหม่
docker compose build

# Restart services
docker compose up -d

# ตรวจสอบ log
docker compose logs -f
```

### 11.3 ตรวจสอบ Resource

```bash
# ดู resource usage แบบ real-time
docker stats

# ดู disk usage
docker system df

# ล้าง unused images
docker system prune -f
```

### 11.4 Logs Management

```bash
# ดู log ล่าสุด
docker compose logs --tail=100

# ล้าง log เก่า
docker system prune -f

# ตรวจสอบ disk usage
df -h
```

### 11.5 Security Hardening

```bash
# เปลี่ยน SSH port
sudo nano /etc/ssh/sshd_config
# เปลี่ยน Port 22 เป็น Port 2222

# ปิด password authentication
# PermitRootLogin no
# PasswordAuthentication no

# ใช้ key-based authentication
ssh-keygen -t ed25519
ssh-copy-id -p 2222 pi@192.168.1.50

# ตั้งค่า firewall
sudo apt install ufw
sudo ufw allow 2222/tcp    # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
```

---

## 📞 ติดต่อ

ถ้ามีปัญหาเพิ่มเติม:

1. ตรวจสอบ [README.md](README.md) สำหรับข้อมูลทั่วไป
2. ตรวจสอบ [Troubleshooting](#10--แก้ไขปัญหาที่พบบ่อย) ด้านบน
3. ตรวจสอบ Docker logs: `docker compose logs -f`
4. ตรวจสอบ API docs: `http://192.168.1.50:8000/docs`

---

## 🎯 สรุปคำสั่งที่ใช้บ่อย

```bash
# เข้าโปรเจค
cd ~/homelab-ops-center

# เริ่มต้น services
docker compose up -d

# หยุด services
docker compose down

# ดู log
docker compose logs -f

# ดูสถานะ
docker compose ps

# ดู resource
docker stats

# Restart service เดียว
docker compose restart backend

# Build ใหม่
docker compose build

# อัพเดท
git pull && docker compose build && docker compose up -d
```

---

**สร้างเมื่อ:** 30 สิงหาคม 2569  
**เวอร์ชัน:** 1.0.0  
**สำหรับ:** Orange Pi (ARM64 Linux)
