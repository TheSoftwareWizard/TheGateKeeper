# Discord Bot: First Message Role

This project implements a Discord bot written in Node.js. It grants a role to a member when they send their first message in any channel on the server.

## Requirements

- Node.js 18.17 or higher
- A bot registered in the [Discord Developer Portal](https://discord.com/developers/applications)
- Bot permissions: `Manage Roles`, `Read Messages`, `Send Messages`
- Intents enabled in the portal: `Server Members Intent`, `Message Content Intent`

## Setup

1. Clone this repository and enter the project folder.

       git clone <url>
       cd acceptbotdiscordcbot

2. Install dependencies:

       npm install

3. Create a role in your server that you want to assign to first-time senders.
4. Copy the **role ID** (enable developer mode in Discord and right-click the role).
5. Create a `.env` file in the project root with the following values:

       DISCORD_TOKEN=your_bot_token
       TARGET_ROLE_ID=123456789012345678
       # STATE_FILE is optional; defaults to <project_dir>/data/state.json
       # STATE_FILE=/absolute/path/to/state.json

6. Run the bot:

       npm start

## How It Works

- The bot listens for each new message.
- If the author is not a bot and it is their first message in the guild, the user ID is stored in `data/state.json` (configurable path).
- The bot assigns the configured role to the member.
- The processed user list is persisted so that the bot remembers who already received the role even after restarts.

> Note: The bot will not respond to private messages (DMs) and only acts in guilds where the role has been configured.

## Deployment to Oracle Cloud Free Tier (24/7)

This bot can be deployed to Oracle Cloud Free Tier to run continuously. The free tier includes:
- **Always Free Compute**: 2 AMD-based VMs or 4 Arm-based Ampere A1 VMs
- **10 TB of outbound data transfer per month** (more than enough for a Discord bot)
- **24/7 uptime** (as long as your instance is running)

> 📖 **For a detailed step-by-step guide**, see [ORACLE_CLOUD_SETUP.md](ORACLE_CLOUD_SETUP.md)

### Quick Deployment Steps:

### Prerequisites

1. **Oracle Cloud Account**: Sign up for [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. **Create an Ubuntu Instance**:
   - Go to Compute → Instances
   - Create a new instance with Ubuntu 22.04 or later
   - Use the default shape (Ampere A1 or VM.Standard.E2.1.Micro)
   - Configure security rules to allow SSH (port 22)
   - **Important**: No additional firewall rules needed for Discord bots (they use outbound connections only)

### Deployment Steps

1. **Connect to your Oracle Cloud instance**:
   ```bash
   ssh ubuntu@<your-instance-ip>
   ```

2. **Install Git** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install -y git
   ```

3. **Clone the repository**:
   ```bash
   cd ~
   git clone <your-repo-url> acceptbotdiscordcbot
   cd acceptbotdiscordcbot
   ```

4. **Create the `.env` file**:
   ```bash
   # Option 1: Copy from example and edit
   cp .env.example .env
   nano .env
   
   # Option 2: Create manually
   nano .env
   ```
   Add your configuration:
   ```
   DISCORD_TOKEN=your_bot_token_here
   TARGET_ROLE_ID=123456789012345678
   ```
   
   **Security Note**: The `.env` file will be automatically secured with `chmod 600` during deployment.

5. **Make the deployment script executable and run it**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

The script will:
- Install Node.js 18.x if needed
- Install npm dependencies
- Create the `data/` directory for state persistence
- Configure and install the systemd service
- Secure the `.env` file with proper permissions
- Start the bot automatically
- Enable the service to start on boot

**Note**: The script automatically detects your project directory and user, so it works regardless of where you clone the repository or which user you're logged in as.

### Managing the Service

Once deployed, you can manage the bot using systemd:

```bash
# Check status
sudo systemctl status acceptbot

# View live logs
sudo journalctl -u acceptbot -f

# Stop the bot
sudo systemctl stop acceptbot

# Start the bot
sudo systemctl start acceptbot

# Restart the bot
sudo systemctl restart acceptbot

# Disable auto-start on boot
sudo systemctl disable acceptbot
```

### Updating the Bot

To update the bot after making changes, you can use the included update script:

```bash
cd ~/acceptbotdiscordcbot
chmod +x update.sh
./update.sh
```

Or manually:
```bash
cd ~/acceptbotdiscordcbot
git pull
npm install
sudo systemctl restart acceptbot
```

### Utility Scripts

The project includes several utility scripts to help manage the bot:

- **`health-check.sh`**: Verifies that the service is running correctly and checks for errors
- **`backup.sh`**: Creates a timestamped backup of the state file and configuration
- **`update.sh`**: Automatically pulls updates, installs dependencies, and restarts the service

To use these scripts:
```bash
chmod +x health-check.sh backup.sh update.sh
./health-check.sh  # Check bot health
./backup.sh        # Create backup before updates
./update.sh        # Update the bot
```

### Troubleshooting

- **Service won't start**: Check logs with `sudo journalctl -u acceptbot -n 50`
- **Permission errors**: Ensure the `.env` file has correct permissions: `chmod 600 .env`
- **Node.js version issues**: The script will install Node.js 18.x automatically
- **Bot not responding**: 
  - Verify bot token is correct in `.env`
  - Check that bot has required permissions in Discord server
  - Ensure intents are enabled in Discord Developer Portal
  - Check logs: `sudo journalctl -u acceptbot -f`
- **Role not found errors**: 
  - Verify `TARGET_ROLE_ID` matches the role ID in your Discord server
  - Ensure the bot's role is positioned above the target role in Discord's role hierarchy
  - Check that the bot has "Manage Roles" permission
- **Oracle Cloud specific**:
  - If instance stops unexpectedly, check Oracle Cloud console for resource limits
  - Free tier instances may have CPU throttling; this shouldn't affect a Discord bot
  - Ensure you're using Ubuntu 22.04 or later for best compatibility

## Development

- State is stored as JSON in `STATE_FILE`. Defaults to `data/state.json` in the project directory.
- Extend `bot.js` to add commands or listen to additional Discord events.

## License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for details.

