# Quick Start - Push to GitHub

Follow these steps to push this code to GitHub and deploy on EC2.

## 1. Initialize Git Repository (Local)

```bash
cd "/Users/mac/Desktop/db-cron job for secure"

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: MySQL backup automation system"
```

## 2. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `mysql-backup-automation`)
3. **Do NOT** initialize with README (we already have one)
4. Copy the repository URL

## 3. Push to GitHub

```bash
# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/your-username/mysql-backup-automation.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 4. Deploy on EC2

SSH into your EC2 instance:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

Then follow the deployment guide:

```bash
# Clone the repository
git clone https://github.com/your-username/mysql-backup-automation.git

# Navigate to directory
cd mysql-backup-automation

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
# Update with your MySQL credentials

# Test configuration
npm run test

# Run manual backup to verify
npm run backup

# Start with PM2
pm2 start ecosystem.config.js

# Configure auto-start on reboot
pm2 startup
pm2 save
```

## 5. Verify Everything Works

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs mysql-backup-cron

# Check backups
ls -lh /home/ubuntu/mysql-backups/
```

## Done! 🎉

Your automated backup system is now running on EC2.

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
