#!/bin/bash
# Streaming Agent - Server Setup Script
# Run on Vultr server: bash setup-server.sh

set -e

echo "=========================================="
echo "  Streaming Agent - Server Setup"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR="/root/streaming_agent"
NGINX_CONF="/etc/nginx/sites-available/streaming-agent"

# 1. Update system
echo -e "${YELLOW}[1/6] Updating system...${NC}"
apt update && apt upgrade -y

# 2. Install Nginx
echo -e "${YELLOW}[2/6] Installing Nginx...${NC}"
apt install -y nginx

# 3. Install Certbot (for SSL)
echo -e "${YELLOW}[3/6] Installing Certbot...${NC}"
apt install -y certbot python3-certbot-nginx

# 4. Copy Nginx configuration
echo -e "${YELLOW}[4/6] Configuring Nginx...${NC}"
cp ${PROJECT_DIR}/deploy/nginx.conf ${NGINX_CONF}
ln -sf ${NGINX_CONF} /etc/nginx/sites-enabled/streaming-agent
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# 5. Start/Restart Nginx
echo -e "${YELLOW}[5/6] Starting Nginx...${NC}"
systemctl enable nginx
systemctl restart nginx

# 6. Configure firewall
echo -e "${YELLOW}[6/6] Configuring firewall...${NC}"
ufw allow 'Nginx Full'
ufw allow 22/tcp
ufw --force enable

echo ""
echo -e "${GREEN}=========================================="
echo "  Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Server accessible at:"
echo "  http://158.247.204.45"
echo ""
echo "Next steps:"
echo "  1. Point your domain to 158.247.204.45"
echo "  2. Run: bash setup-ssl.sh your-domain.com"
echo ""
