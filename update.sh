#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE_NAME="acceptbot"

echo "Updating Discord bot..."

if [ ! -d ".git" ]; then
    echo -e "${RED}Not a git repository. Cannot pull updates${NC}"
    exit 1
fi

if [ -f "backup.sh" ]; then
    echo -e "${YELLOW}Creating backup before update...${NC}"
    chmod +x backup.sh
    ./backup.sh
fi

echo -e "${YELLOW}Stopping service...${NC}"
sudo systemctl stop "$SERVICE_NAME.service" || true

echo -e "${YELLOW}Pulling latest changes from git...${NC}"
git pull

echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}Restarting service...${NC}"
sudo systemctl start "$SERVICE_NAME.service"

sleep 2
if sudo systemctl is-active --quiet "$SERVICE_NAME.service"; then
    echo -e "${GREEN}Service restarted successfully${NC}"
    echo ""
    echo "Service status:"
    sudo systemctl status "$SERVICE_NAME.service" --no-pager -n 5 || true
else
    echo -e "${RED}Service failed to start after update${NC}"
    echo "Check logs with: sudo journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi

echo -e "${GREEN}Update complete${NC}"







