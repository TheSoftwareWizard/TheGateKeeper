#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE_NAME="acceptbot"

echo "Checking health of $SERVICE_NAME service..."

if systemctl is-active --quiet "$SERVICE_NAME.service"; then
    echo -e "${GREEN}Service is running${NC}"
else
    echo -e "${RED}Service is not running${NC}"
    exit 1
fi

if systemctl is-enabled --quiet "$SERVICE_NAME.service"; then
    echo -e "${GREEN}Service is enabled (will start on boot)${NC}"
else
    echo -e "${YELLOW}Service is not enabled (will not start on boot)${NC}"
fi

echo ""
echo "Checking recent logs for errors..."
ERROR_COUNT=$(sudo journalctl -u "$SERVICE_NAME.service" -n 50 --no-pager | grep -i "error\|failed\|exception" | wc -l)

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}No recent errors found in logs${NC}"
else
    echo -e "${YELLOW}Found $ERROR_COUNT potential errors in recent logs${NC}"
    echo "Recent errors:"
    sudo journalctl -u "$SERVICE_NAME.service" -n 50 --no-pager | grep -i "error\|failed\|exception" | tail -5
fi

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
STATE_FILE="${1:-$PROJECT_DIR/data/state.json}"
if [ -f "$STATE_FILE" ]; then
    if [ -r "$STATE_FILE" ]; then
        if command -v stat >/dev/null 2>&1; then
            STATE_SIZE=$(stat -f%z "$STATE_FILE" 2>/dev/null || stat -c%s "$STATE_FILE" 2>/dev/null || echo "unknown")
        else
            STATE_SIZE=$(wc -c < "$STATE_FILE" 2>/dev/null || echo "unknown")
        fi
        echo -e "${GREEN}State file exists and is readable (${STATE_SIZE} bytes)${NC}"
    else
        echo -e "${RED}State file exists but is not readable${NC}"
    fi
else
    echo -e "${YELLOW}State file does not exist yet (this is normal if no users have been processed)${NC}"
fi

if [ -f ".env" ]; then
    echo -e "${GREEN}.env file exists${NC}"
else
    echo -e "${RED}.env file not found${NC}"
    exit 1
fi

echo ""
echo "Service status summary:"
sudo systemctl status "$SERVICE_NAME.service" --no-pager -n 10 || true

echo ""
echo -e "${GREEN}Health check complete${NC}"


