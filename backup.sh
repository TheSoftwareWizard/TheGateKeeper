#!/bin/bash
# Backup script for Discord bot state and configuration
# Creates a timestamped backup of the state file and .env file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="acceptbot_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "💾 Creating backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_PATH"

# Backup state file if it exists
if [ -f "data/state.json" ]; then
    cp "data/state.json" "$BACKUP_PATH/state.json"
    echo -e "${GREEN}✓ Backed up state.json${NC}"
else
    echo -e "${YELLOW}⚠ state.json not found (this is normal if no users have been processed)${NC}"
fi

# Backup .env file if it exists (sensitive, but useful for recovery)
if [ -f ".env" ]; then
    cp ".env" "$BACKUP_PATH/.env.backup"
    chmod 600 "$BACKUP_PATH/.env.backup"
    echo -e "${GREEN}✓ Backed up .env${NC}"
    echo -e "${YELLOW}⚠ Note: .env backup contains sensitive information. Keep it secure.${NC}"
else
    echo -e "${YELLOW}⚠ .env not found (skipping)${NC}"
fi

# Create a manifest file with backup information
cat > "$BACKUP_PATH/manifest.txt" << EOF
Backup created: $(date)
Project: acceptbotdiscordcbot
Backup directory: $BACKUP_PATH

Files included:
EOF

ls -lh "$BACKUP_PATH" 2>/dev/null | tail -n +2 >> "$BACKUP_PATH/manifest.txt" || echo "No files" >> "$BACKUP_PATH/manifest.txt"

echo -e "${GREEN}✅ Backup complete!${NC}"
echo "Backup location: $BACKUP_PATH"

# Optional: Compress backup
if [ -t 0 ]; then  # Check if running interactively
    read -p "Do you want to compress the backup? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
        rm -rf "$BACKUP_PATH"
        echo -e "${GREEN}✓ Backup compressed to ${BACKUP_PATH}.tar.gz${NC}"
    fi
fi

