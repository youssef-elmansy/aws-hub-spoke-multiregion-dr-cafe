# ☁️ AWS Hub & Spoke Multi-Region DR Architecture — Cafe App

## 🗺️ Architecture Diagram
<img width="1600" height="1200" alt="d04c0369-c3ab-49e0-88ba-f7a5bd2098b1" src="https://github.com/user-attachments/assets/72c97e1e-80f6-47bf-a36d-676176c9ec3e" />

---

## 📌 Overview
A production-grade, highly available AWS architecture built using a **Hub & Spoke** network topology with **Active-Active Multi-Region** configuration and full **Disaster Recovery (DR)** capabilities. The project hosts a **Cafe Website** that dynamically serves food & menu images stored in **Amazon S3**, and performs all read/write database operations through **Amazon RDS**.

> 🎓 GBB Cloud Internship Graduation Project — built entirely via AWS Console

---

## 🏗️ Architecture Highlights

| Feature | Details |
|--------|---------|
| 🌐 **Topology** | Hub & Spoke VPC via Transit Gateway |
| 🔁 **Availability** | Multi-AZ (AZ-1a & AZ-1b) per Region |
| 🌍 **Regions** | Primary + Secondary (Active-Active) |
| 🛡️ **DR Strategy** | RDS Cross-Region Replication + S3 MRAP Two-Way |
| 📦 **App** | Node.js Cafe Website (S3 Images + RDS Read/Write) |
| 🔥 **Security** | Centralized Network Firewall + WAF |
| 🖥️ **Deployment** | Built entirely via AWS Console |

---

## 🍵 About The Application
The application is a **Cafe Website** built with **Node.js** that:
- ☕ Displays the cafe's menu and food items with images
- 🖼️ Fetches all menu/food **images dynamically from Amazon S3**
- 📝 Performs all **Read & Write operations via Amazon RDS** (orders, menu data, user data)
- 🌍 Accessible globally through CDN with low latency
- ⚡ Auto Scales based on traffic demand via EC2 Auto Scaling Groups

---

## 🌐 Global Layer

### CDN (CloudFront)
- Caches and delivers static content globally with low latency
- Connected to Route 53 for global traffic routing

### Route 53
- Configured with **Active-Active routing policy** across Primary and Secondary regions
- Automatically routes users to the nearest healthy region
- Provides seamless failover between regions

### WAF (Web Application Firewall)
- Deployed in **both Primary and Secondary regions**
- Protects against common web exploits (SQL Injection, XSS, DDoS)
- All inbound traffic is inspected by WAF before reaching the application

---

## 🏠 HUB VPC — Centralized Network Hub (Primary & Secondary)

### Centralized Network Firewall
- Acts as the **single inspection point** for ALL traffic flowing between the internet and the Spoke VPCs
- Every packet must pass through the Network Firewall before being routed anywhere
- Provides stateful deep packet inspection
- Deployed in each region inside the HUB VPC

### Internet Gateway (IGW)
- Entry point for all inbound internet traffic into the HUB VPC

### Bastion Host / Jump Server
- Secure SSH access to private EC2 instances
- Only accessible via whitelisted IPs
- Acts as the single entry point for admin/DevOps operations

### Application Load Balancer (ALB)
- Distributes incoming HTTP/HTTPS traffic across both **AZ-1a and AZ-1b**
- Health checks ensure traffic only goes to healthy EC2 instances
- Deployed across ALB-Subnet-1 and ALB-Subnet-2

### NAT Gateway
- Allows private EC2 instances (in Spoke VPC) to access the internet for updates/patches
- Without exposing them to inbound internet traffic

### Transit Gateway (TGW)
- The **backbone of the Hub & Spoke architecture**
- Connects HUB VPC ↔ Spoke VPC within each region
- All inter-VPC traffic is routed through the TGW
- Enables centralized network control and inspection

---

## 🔄 SPOKE VPC — Application & Data Layer (Primary & Secondary)

### Network Layer
- **ENI (Elastic Network Interfaces)** — in TGW Subnets for traffic routing
- **NLB (Network Load Balancer)** — handles internal TCP traffic routing within the Spoke VPC

### Application Layer
- **EC2 Instances** running the Node.js Cafe Application
- **Auto Scaling Group** — automatically scales EC2 instances up/down based on CPU/traffic
- **Security Groups** — applied per instance as the last line of defense (least privilege rules)
- Deployed across **App-Subnet-1 (AZ-1a)** and **App-Subnet-2 (AZ-1b)**

### Database Layer
- **RDS Primary** (AZ-1a) — handles all Write operations from the Cafe App
- **RDS Standby** (AZ-1b) — Multi-AZ standby for automatic failover within the region
- **RDS Read Replica** (Secondary Region) — handles Read operations in the DR region

---

## 🗄️ Storage — Amazon S3

### S3 Buckets
- One S3 Bucket per region (Primary & Secondary)
- Stores all **Cafe menu images, food photos, and static assets**
- The Node.js app fetches images directly from S3 on every request

### S3 MRAP (Multi-Region Access Point) — Two-Way Replication
- **MRAP** provides a single global endpoint to access S3 data from both regions
- Configured with **Two-Way (Bidirectional) Replication**:
  - Primary → Secondary ✅
  - Secondary → Primary ✅
- Ensures data consistency across both regions at all times
- Improves latency by routing S3 requests to the nearest bucket

---

## 🔁 Disaster Recovery Strategy

| Component | DR Mechanism |
|-----------|-------------|
| **RDS** | Cross-Region Replication (Primary → Secondary Read Replica) |
| **S3** | Two-Way Replication via MRAP |
| **Compute** | AMI Backups via AWS Backup |
| **DNS** | Route 53 Active-Active automatic failover |
| **App** | Auto Scaling Groups in both regions always running |

### RDS Cross-Region Replication
- RDS Primary (Primary Region) continuously replicates data to **RDS Read Replica (Secondary Region)**
- In a disaster scenario, the Read Replica can be **promoted to Primary** within minutes
- RDS Multi-AZ Standby ensures no data loss within each region

---

## 🛡️ Security Architecture

### Defense in Depth (Layered Security)
```
Internet → WAF → IGW → Network Firewall → ALB → NLB → Security Groups → EC2
```
Every layer adds an additional security control:

| Layer | Control |
|-------|---------|
| **WAF** | Blocks malicious HTTP/HTTPS requests |
| **Network Firewall** | Stateful deep packet inspection (all traffic) |
| **Security Groups** | Instance-level firewall (least privilege) |
| **Secrets Manager** | Securely stores RDS credentials, API keys |
| **Private Subnets** | EC2 & RDS never exposed directly to internet |
| **Bastion Host** | Only controlled SSH access to private instances |

---

## 📊 Monitoring & Observability

### CloudWatch
Monitors the following resources across both regions:
- 📈 **EC2** — CPU Utilization, Network In/Out, Status Checks
- 🗄️ **RDS** — DB Connections, Read/Write IOPS, CPU, Free Storage
- 🪣 **S3** — Number of Requests, Bucket Size, Errors
- ⚡ Custom Alarms for threshold breaches with SNS notifications

### CloudTrail
- Enabled across **all regions**
- Records every API call made in the AWS account
- Logs stored in S3 for audit and compliance
- Tracks: who did what, when, and from where

---

## 💾 AWS Backup

Centralized backup policy covering:

| Resource | Backup Type |
|----------|------------|
| **EC2 Instances** | AMI Snapshots |
| **RDS** | Automated DB Snapshots (Cross-Region) |
| **S3** | Object-level backup |
| **EBS Volumes** | Snapshot backups |

- Backup plans with retention policies configured
- Cross-region backup copies for DR readiness
- Point-in-time recovery enabled for RDS

---

## 📁 Repository Structure
```
aws-hub-spoke-multiregion-dr-cafe/
├── 📁 app/                    → Node.js Cafe Application
│   ├── server.js
│   ├── package.json
│   ├── routes/
│   └── public/
├── 📁 screenshots/            → AWS Console Screenshots
│   ├── 01-vpc/
│   ├── 02-networking/
│   ├── 03-security/
│   ├── 04-compute/
│   ├── 05-load-balancing/
│   ├── 06-storage/
│   ├── 07-dns-cdn/
│   └── 08-monitoring/
├── 📁 architecture/           → Architecture Diagram
└── 📄 README.md
```

---

## 👤 Authors

**Youssef Elmansy**  
**Mohamed Hany**  
**Mohamed Maher**  
**Mai Ahmed**  
**Nada**  
**Nouran Farag**  

---


