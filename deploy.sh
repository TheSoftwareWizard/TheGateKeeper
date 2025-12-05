#!/bin/bash
# Deployment script for Oracle Cloud Free Tier
# This script sets up the Discord bot to run as a systemd service

set -e

echo "🚀 Starting deployment for Discord Bot on Oracle Cloud..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root for systemd operations
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Note: Some operations require sudo. You may be prompted for your password.${NC}"
fi

# Get the current directory
PROJECT_DIR=$(pwd)
SERVICE_USER=${SUDO_USER:-$USER}
SERVICE_FILE="acceptbot.service"
SYSTEMD_PATH="/etc/systemd/system"

echo -e "${GREEN}✓ Project directory: $PROJECT_DIR${NC}"
echo -e "${GREEN}✓ Service user: $SERVICE_USER${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed.${NC}"
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

# Check Node.js version (should be >= 18.17)
NODE_MAJOR=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
NODE_MINOR=$(node --version | cut -d'v' -f2 | cut -d'.' -f2)
if [ "$NODE_MAJOR" -lt 18 ] || ([ "$NODE_MAJOR" -eq 18 ] && [ "$NODE_MINOR" -lt 17 ]); then
    echo -e "${RED}✗ Node.js version must be >= 18.17. Current: $NODE_VERSION${NC}"
    exit 1
fi

# Detect Node.js path dynamically
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}✗ Could not find Node.js executable path${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js path: $NODE_PATH${NC}"

# Install dependencies
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm install

# Create data directory for state persistence
echo -e "${YELLOW}Creating data directory...${NC}"
mkdir -p "$PROJECT_DIR/data"
chmod 755 "$PROJECT_DIR/data"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Please create a .env file with the following variables:"
    echo "  DISCORD_TOKEN=your_bot_token"
    echo "  TARGET_ROLE_ID=your_role_id"
    echo ""
    if [ -f ".env.example" ]; then
        echo "You can copy .env.example:"
        echo "  cp .env.example .env"
        echo "  nano .env  # Edit with your values"
    fi
    exit 1
fi

# Set proper permissions for .env file
chmod 600 .env
echo -e "${GREEN}✓ .env file found and secured${NC}"

# Update service file with actual paths and Node.js path
echo -e "${YELLOW}Configuring systemd service...${NC}"
sed "s|/home/ubuntu/acceptbotdiscordcbot|$PROJECT_DIR|g" "$SERVICE_FILE" | \
sed "s|User=ubuntu|User=$SERVICE_USER|g" | \
sed "s|/usr/bin/node|$NODE_PATH|g" > /tmp/acceptbot.service

# Copy service file to systemd
echo -e "${YELLOW}Installing systemd service...${NC}"
sudo cp /tmp/acceptbot.service "$SYSTEMD_PATH/acceptbot.service"
sudo chmod 644 "$SYSTEMD_PATH/acceptbot.service"

# Reload systemd
echo -e "${YELLOW}Reloading systemd daemon...${NC}"
sudo systemctl daemon-reload

# Enable service to start on boot
echo -e "${YELLOW}Enabling service to start on boot...${NC}"
sudo systemctl enable acceptbot.service

# Start the service
echo -e "${YELLOW}Starting service...${NC}"
sudo systemctl start acceptbot.service

# Wait a moment and check status
sleep 2
if sudo systemctl is-active --quiet acceptbot.service; then
    echo -e "${GREEN}✓ Service is running!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  Check status:  sudo systemctl status acceptbot"
    echo "  View logs:     sudo journalctl -u acceptbot -f"
    echo "  Stop service:  sudo systemctl stop acceptbot"
    echo "  Restart:       sudo systemctl restart acceptbot"
else
    echo -e "${RED}✗ Service failed to start. Check logs with: sudo journalctl -u acceptbot${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"


