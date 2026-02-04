# Oracle Cloud Free Tier Deployment Guide

This guide provides step-by-step instructions for deploying the Discord bot on Oracle Cloud Free Tier.

## Prerequisites

- Valid email address
- Credit card (for verification, no charges for free tier resources)
- Discord bot token from Discord Developer Portal

## Step 1: Create Oracle Cloud Account

1. Visit [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Click "Start for Free"
3. Complete the registration form:
   - Name, email, country
   - Phone number for verification
   - Credit card information (verification only)
4. Verify email and phone
5. Wait for account processing (may take a few minutes)

## Step 2: Create Compute Instance

1. Access Oracle Cloud Console
   - Log in at [cloud.oracle.com](https://cloud.oracle.com)
   - Select your region (recommended: closest to you)

2. Create New Instance
   - Go to "Compute" → "Instances"
   - Click "Create Instance"

3. Configure Instance
   
   a. Name and Shape:
   - Name: discord-bot (or your preference)
   - Image: Select "Canonical Ubuntu" version 22.04 or higher
   - Shape: 
     - For ARM (recommended): Select "Ampere" and choose VM.Standard.A1.Flex
     - For AMD: Select VM.Standard.E2.1.Micro (Always Free)
   
   b. Network Configuration:
   - VCN: If none exists, click "Create new VCN"
   - Subnet: Select public subnet
   - Public IP: Select "Assign a public IPv4 address" (IMPORTANT)

   c. SSH Keys:
   - Option 1: Generate new key
     - Click "Generate SSH Key Pair"
     - Download private and public keys
     - IMPORTANT: Save private key securely
   - Option 2: Use existing public key
     - Paste your SSH public key

   d. Boot Volume Configuration:
   - Default values (47 GB is sufficient)

4. Create Instance
   - Review configuration
   - Click "Create"
   - Wait 1-2 minutes while instance is created

## Step 3: Get Public IP and Connect

1. Get Public IP
   - Once instance is "Running"
   - Copy the "Public IP address" from instance details

2. Connect via SSH
   
   If using Oracle-generated key:

       chmod 400 /path/to/private-key.key
       ssh -i /path/to/private-key.key ubuntu@YOUR_PUBLIC_IP
   
   If using your own key:

       ssh ubuntu@YOUR_PUBLIC_IP

3. Verify Connection
   - You should see Ubuntu prompt
   - Update system:

         sudo apt update && sudo apt upgrade -y

## Step 4: Configure Security Lists (Firewall)

Discord bots make outbound connections to Discord, so no inbound ports need to be opened. SSH port 22 should be open by default.

### Verify SSH is Allowed

1. In Oracle Cloud console, go to your instance
2. Click on the associated VCN (Virtual Cloud Network)
3. Go to "Security Lists"
4. Select default Security List
5. Verify "Ingress" rule exists for:
   - Port: 22
   - Protocol: TCP
   - Source: 0.0.0.0/0
   - Description: SSH access

## Step 5: Deploy the Bot

1. Install Git (if not installed):

       sudo apt update
       sudo apt install -y git

2. Clone the repository:

       cd ~
       git clone <your-repo-url> TheGateKeeper
       cd TheGateKeeper

3. Create .env file:

       cp .env.example .env
       nano .env

   Add your configuration:

       DISCORD_TOKEN=your_bot_token_here
       TARGET_ROLE_ID=123456789012345678
       INTRO_CHANNEL_ID=123456789012345678
       WELCOME_CHANNEL_ID=123456789012345678

   Save and exit (Ctrl+X, Y, Enter)

4. Run deployment script:

       chmod +x deploy.sh
       ./deploy.sh

   The script will:
   - Install Node.js 18.x if needed
   - Install npm dependencies
   - Create data directory
   - Configure systemd service
   - Secure .env file
   - Start bot automatically
   - Enable auto-start on boot

## Step 6: Manage the Service

Check status:

    sudo systemctl status acceptbot

View live logs:

    sudo journalctl -u acceptbot -f

Stop/Start/Restart:

    sudo systemctl stop acceptbot
    sudo systemctl start acceptbot
    sudo systemctl restart acceptbot

## Step 7: Update the Bot

Use the update script:

    cd ~/TheGateKeeper
    chmod +x update.sh
    ./update.sh

Or manually:

    cd ~/TheGateKeeper
    git pull
    npm install
    sudo systemctl restart acceptbot

## Troubleshooting

### SSH Connection Issues

If you cannot connect via SSH:

1. Verify Security List has SSH rule (port 22)
2. Check Ubuntu firewall:

       sudo ufw status

   If active and SSH not allowed:

       sudo ufw allow 22/tcp
       sudo ufw reload

3. Verify correct private key and IP address

### Bot Not Starting

1. Check logs:

       sudo journalctl -u acceptbot -n 50

2. Verify .env file exists and has correct permissions:

       ls -la .env
       chmod 600 .env

3. Verify all environment variables are set:

       cat .env

4. Check Node.js version:

       node --version

   Should be >= 18.17

### Role Assignment Not Working

1. Verify bot has "Manage Roles" permission in Discord
2. Verify bot role is above target role in Discord role hierarchy
3. Verify role ID is correct in .env:

       grep TARGET_ROLE_ID .env

4. Verify channel IDs are correct:

       grep CHANNEL_ID .env

5. Check bot logs for errors:

       sudo journalctl -u acceptbot -f

### Instance Stopped Unexpectedly

1. Check Oracle Cloud console for resource limits
2. Free tier instances may have CPU throttling (should not affect Discord bot)
3. Verify always-free shape was selected

## Oracle Cloud Free Tier Limits

Always Free Resources:
- 2 AMD-based VMs or 4 Arm-based Ampere A1 VMs
- 10 TB outbound data transfer per month
- 200 GB block storage
- 10 GB object storage

These limits are more than sufficient for running a Discord bot 24/7.

## Useful Commands

Health check:

    chmod +x health-check.sh
    ./health-check.sh

Create backup:

    chmod +x backup.sh
    ./backup.sh

View service logs:

    sudo journalctl -u acceptbot -f

Check disk usage:

    df -h

Check memory usage:

    free -h

Monitor system resources:

    htop

## Security Best Practices

1. Keep .env file permissions at 600:

       chmod 600 .env

2. Regularly update system packages:

       sudo apt update && sudo apt upgrade -y

3. Never commit .env file to version control

4. Use strong passwords for Oracle Cloud account

5. Regularly backup state file:

       ./backup.sh

## Next Steps

Once deployed:
1. Test bot by having a user send a message in the introduction channel
2. Verify role is assigned
3. Verify welcome message is sent
4. Monitor logs for any issues
5. Set up regular backups

The bot is now running 24/7 on Oracle Cloud Free Tier.
