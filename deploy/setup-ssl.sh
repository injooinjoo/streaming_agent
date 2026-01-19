#!/bin/bash
# Streaming Agent - SSL Setup Script
# Usage: bash setup-ssl.sh your-domain.com

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check domain argument
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name required${NC}"
    echo "Usage: bash setup-ssl.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
NGINX_CONF="/etc/nginx/sites-available/streaming-agent"

echo "=========================================="
echo "  SSL Setup for: ${DOMAIN}"
echo "=========================================="

# 1. Update Nginx configuration with domain
echo -e "${YELLOW}[1/3] Updating Nginx configuration...${NC}"
sed -i "s/server_name 158.247.204.45;/server_name ${DOMAIN};/" ${NGINX_CONF}

# Reload Nginx
nginx -t && systemctl reload nginx

# 2. Obtain SSL certificate
echo -e "${YELLOW}[2/3] Obtaining SSL certificate...${NC}"
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect

# 3. Setup auto-renewal
echo -e "${YELLOW}[3/3] Setting up auto-renewal...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo -e "${GREEN}=========================================="
echo "  SSL Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Your site is now accessible at:"
echo "  https://${DOMAIN}"
echo ""
echo "SSL certificate will auto-renew via certbot timer."
echo "To test renewal: certbot renew --dry-run"
echo ""
