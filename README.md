# Discord Bot: Introduction Role

This Discord bot assigns a role to members when they send their first message in the introduction channel and sends a welcome message.

## Requirements

- Node.js 18.17 or higher
- A bot registered in the [Discord Developer Portal](https://discord.com/developers/applications)
- Bot permissions: `Manage Roles`, `Read Messages`, `Send Messages`
- Intents enabled in the portal: `Server Members Intent`, `Message Content Intent`

## Setup

1. Clone this repository and enter the project folder.

       git clone <url>
       cd TheGateKeeper

2. Install dependencies:

       npm install

3. Create the required channels and role in your Discord server:
   - Introduction channel (e.g., introductions)
   - Welcome channel (e.g., welcome)
   - Role to assign (e.g., ShareIT)

4. Enable Developer Mode in Discord and copy the IDs:
   - Right-click the introduction channel and select "Copy ID"
   - Right-click the welcome channel and select "Copy ID"
   - Right-click the role and select "Copy ID"

5. Create a `.env` file in the project root:

       DISCORD_TOKEN=your_bot_token
       TARGET_ROLE_ID=123456789012345678
       INTRO_CHANNEL_ID=123456789012345678
       WELCOME_CHANNEL_ID=123456789012345678

6. Run the bot:

       npm start

## How It Works

- The bot listens for messages in the introduction channel only.
- When a user sends their first message in the introduction channel:
  - The bot assigns the configured role to them
  - A welcome message is sent to the welcome channel
  - The user is marked as processed and persisted in `data/state.json`
- Users who have already been processed will not trigger the bot again.

## Deployment to Oracle Cloud Free Tier

This bot can be deployed to Oracle Cloud Free Tier to run continuously.

> For a detailed guide, see [ORACLE_CLOUD_SETUP.md](ORACLE_CLOUD_SETUP.md)

### Prerequisites

1. Oracle Cloud Account: [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Ubuntu Instance (22.04 or later)
3. SSH access configured

### Deployment Steps

1. Connect to your instance:

       ssh ubuntu@<your-instance-ip>

2. Install Git:

       sudo apt update
       sudo apt install -y git

3. Clone the repository:

       cd ~
       git clone <your-repo-url> TheGateKeeper
       cd TheGateKeeper

4. Create the `.env` file:

       cp .env.example .env
       nano .env

   Add your configuration:

       DISCORD_TOKEN=your_bot_token_here
       TARGET_ROLE_ID=123456789012345678
       INTRO_CHANNEL_ID=123456789012345678
       WELCOME_CHANNEL_ID=123456789012345678

5. Run the deployment script:

       chmod +x deploy.sh
       ./deploy.sh

The script will install Node.js, dependencies, configure the systemd service, and start the bot.

### Managing the Service

Once deployed, manage the bot using systemd:

    sudo systemctl status acceptbot
    sudo journalctl -u acceptbot -f
    sudo systemctl stop acceptbot
    sudo systemctl start acceptbot
    sudo systemctl restart acceptbot

### Updating the Bot

Use the included update script:

    cd ~/TheGateKeeper
    chmod +x update.sh
    ./update.sh

Or manually:

    cd ~/TheGateKeeper
    git pull
    npm install
    sudo systemctl restart acceptbot

### Utility Scripts

- `health-check.sh`: Verifies service status
- `backup.sh`: Creates backups of state and config
- `update.sh`: Updates and restarts the bot

Usage:

    chmod +x health-check.sh backup.sh update.sh
    ./health-check.sh
    ./backup.sh
    ./update.sh

### Troubleshooting

- **Service won't start**: Check logs with `sudo journalctl -u acceptbot -n 50`
- **Permission errors**: Ensure `.env` has correct permissions: `chmod 600 .env`
- **Bot not responding**: 
  - Verify credentials in `.env`
  - Check bot permissions in Discord server
  - Ensure intents are enabled in Discord Developer Portal
  - Verify channel IDs are correct
- **Role not found**: 
  - Verify role ID matches Discord server
  - Ensure bot role is above target role in hierarchy
  - Check bot has "Manage Roles" permission

## Development

State is stored in `data/state.json`. Extend `bot.js` to add commands or additional event handlers.

## License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for details.

