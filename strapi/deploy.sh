#!/bin/bash

# Sabbe Satta VPS Deployment Script
# Run this on your VPS (Hostinger/Namecheap)

set -e

echo "=== Sabbe Satta Deployment ==="

# 1. Update system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker

# 3. Install Docker Compose
echo "Installing Docker Compose..."
sudo apt install docker-compose -y

# 4. Create project directory
echo "Creating project directory..."
sudo mkdir -p /opt/sabbe-satta
sudo chown $USER:$USER /opt/sabbe-satta

# 5. Copy project files
echo "Copy your project files to /opt/sabbe-satta/"
echo "Or use: scp -r ./* user@your-vps:/opt/sabbe-satta/"

# 6. Create .env file
echo "Creating .env file..."
cat > /opt/sabbe-satta/.env << 'EOF'
# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=strapiDB
DATABASE_PORT=5432
DATABASE_NAME=sabbe_satta
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=CHANGE_ME_TO_SECURE_PASSWORD

# Secrets (generate unique values)
APP_KEYS=$(openssl rand -hex 16),$(openssl rand -hex 16)
API_TOKEN_SALT=$(openssl rand -hex 16)
ADMIN_JWT_SECRET=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 16)
TRANSFER_TOKEN_SALT=$(openssl rand -hex 16)
ENCRYPTION_KEY=$(openssl rand -hex 16)

# Server
HOST=0.0.0.0
PORT=1337
NODE_ENV=production
EOF

echo "Please edit /opt/sabbe-satta/.env with your actual values!"

# 7. Build and start
echo "Building and starting services..."
cd /opt/sabbe-satta
docker compose -f docker-compose.prod.yml up -d --build

# 8. Initial SSL certificate
echo "Getting SSL certificate..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email admin@sabbesatta.com \
  -d cms.sabbesatta.com \
  --agree-tos \
  --no-eff-email

# 9. Restart nginx with SSL
echo "Restarting nginx..."
docker compose -f docker-compose.prod.yml restart nginx

echo ""
echo "=== Deployment Complete ==="
echo "Strapi admin: https://cms.sabbesatta.com/admin"
echo ""
echo "Next steps:"
echo "1. Create admin account at https://cms.sabbesatta.com/admin"
echo "2. Configure content types"
echo "3. Set up Stripe webhooks to https://cms.sabbesatta.com/api/stripe-webhook"
