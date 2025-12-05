// Discord bot that assigns a role when a member sends their first message.
// See README.md for setup and usage instructions.

import { config as loadEnv } from "dotenv";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import fs from "node:fs/promises";
import path from "node:path";

loadEnv();

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const ROLE_ID_RAW = process.env.TARGET_ROLE_ID?.trim();
// Use process.cwd() for production flexibility, fallback to absolute path for development
const DEFAULT_STATE_PATH = process.env.STATE_FILE
  ? path.resolve(process.env.STATE_FILE)
  : path.resolve(process.cwd(), "data", "state.json");
const STATE_FILE = path.resolve(DEFAULT_STATE_PATH);
const STATE_WRITE_DELAY_MS = 1500;

if (!TOKEN) {
  throw new Error(
    "DISCORD_TOKEN environment variable is required.\n" +
      "Please create a .env file with DISCORD_TOKEN=your_bot_token",
  );
}

if (!ROLE_ID_RAW) {
  throw new Error(
    "TARGET_ROLE_ID environment variable is required.\n" +
      "Please create a .env file with TARGET_ROLE_ID=your_role_id",
  );
}

if (!/^\d+$/.test(ROLE_ID_RAW)) {
  throw new Error(
    `TARGET_ROLE_ID must be a numeric Discord snowflake.\n` +
      `Received: "${ROLE_ID_RAW}"\n` +
      `Please check your .env file and ensure TARGET_ROLE_ID contains only digits.`,
  );
}

const TARGET_ROLE_ID = ROLE_ID_RAW;

/**
 * processedUsersByGuild stores guild IDs mapped to the set of user IDs
 * that already received the role.
 * @type {Map<string, Set<string>>}
 */
const processedUsersByGuild = new Map();

let persistTimeout = null;

async function ensureStatePath(statePath) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
}

async function loadState(statePath) {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) {
      throw new Error("State file must contain an object");
    }

    for (const [guildId, users] of Object.entries(data)) {
      if (Array.isArray(users)) {
        processedUsersByGuild.set(guildId, new Set(users.map(String)));
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    console.warn(
      `Could not load state file ${statePath} (${error.message}). Starting fresh.`,
    );
  }
}

async function saveState(statePath) {
  const serializable = {};
  for (const [guildId, users] of processedUsersByGuild.entries()) {
    serializable[guildId] = Array.from(users).sort();
  }

  try {
    await fs.writeFile(statePath, JSON.stringify(serializable, null, 2), "utf8");
  } catch (error) {
    console.error(`Failed to persist state to ${statePath} (${error.message})`);
  }
}

function markUserProcessed(guildId, userId) {
  let userSet = processedUsersByGuild.get(guildId);
  if (!userSet) {
    userSet = new Set();
    processedUsersByGuild.set(guildId, userSet);
  }
  userSet.add(userId);
}

function isUserProcessed(guildId, userId) {
  const userSet = processedUsersByGuild.get(guildId);
  return userSet ? userSet.has(userId) : false;
}

function scheduleStatePersist() {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }

  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    saveState(STATE_FILE).catch((error) => {
      console.error(
        `Unexpected error while saving state to ${STATE_FILE} (${error.message})`,
      );
    });
  }, STATE_WRITE_DELAY_MS);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => {
  console.info(`Logged in as ${c.user.tag} (ID: ${c.user.id})`);
  console.info(`Using state file at ${STATE_FILE}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) {
      return;
    }

    const guildId = message.guild.id;
    const userId = message.author.id;

    if (isUserProcessed(guildId, userId)) {
      return;
    }

    const role = message.guild.roles.cache.get(TARGET_ROLE_ID);
    if (!role) {
      console.error(
        `Configured role ID ${TARGET_ROLE_ID} not found in guild ${message.guild.name}. ` +
          "Ensure the bot is running in the correct server and the role exists.",
      );
      return;
    }

    const member =
      message.member ??
      (await message.guild.members.fetch(userId).catch(() => null));

    if (!member) {
      console.warn(
        `Could not resolve guild member for ${message.author.tag} in ${message.guild.name}.`,
      );
      return;
    }

    try {
      const displayName = member.displayName ?? member.user.username;
      await member.roles.add(role, "First message detected in guild");
      console.info(
        `Assigned role ${role.name} to ${displayName} (${message.author.tag})`,
      );
    } catch (error) {
      if (error.code === 50013) {
        console.error(
          `Missing permissions to add role ${role.name} to ${message.author.tag}`,
        );
      } else {
        console.error(
          `Failed to add role ${role.name} to ${message.author.tag} (${error.message})`,
        );
      }
      return;
    }

    markUserProcessed(guildId, userId);
    scheduleStatePersist();
  } catch (error) {
    console.error(`Error while handling message event (${error.message})`);
  }
});

async function main() {
  await ensureStatePath(STATE_FILE);
  await loadState(STATE_FILE);

  // Handle graceful shutdown
  const shutdown = async (signal) => {
    console.info(`Received ${signal}, shutting down gracefully...`);
    
    // Save state before exiting
    if (persistTimeout) {
      clearTimeout(persistTimeout);
      persistTimeout = null;
    }
    await saveState(STATE_FILE);
    
    // Destroy Discord client
    client.destroy();
    
    console.info("Bot shutdown complete.");
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((err) => {
      console.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    });
  });
  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((err) => {
      console.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    });
  });

  try {
    await client.login(TOKEN);
  } catch (error) {
    console.error(`Failed to login with provided token (${error.message})`);
    process.exitCode = 1;
  }
}

main();


