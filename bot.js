import { config as loadEnv } from "dotenv";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import fs from "node:fs/promises";
import path from "node:path";

loadEnv();

console.log("BOOTING BOT");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Token exists?", !!process.env.DISCORD_TOKEN);

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const ROLE_ID_RAW = process.env.TARGET_ROLE_ID?.trim();
const INTRO_CHANNEL_ID = process.env.INTRO_CHANNEL_ID?.trim();
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID?.trim();
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID?.trim();
const GUIDE_CHANNEL_ID = process.env.GUIDE_CHANNEL_ID?.trim();
const WHATSAPP_CHANNEL_ID = process.env.WHATSAPP_CHANNEL_ID?.trim();

const WELCOME_SEPARATOR = "\u2550".repeat(40);
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

if (!INTRO_CHANNEL_ID) {
  throw new Error(
    "INTRO_CHANNEL_ID environment variable is required.\n" +
      "Please create a .env file with INTRO_CHANNEL_ID=your_channel_id",
  );
}

if (!WELCOME_CHANNEL_ID) {
  throw new Error(
    "WELCOME_CHANNEL_ID environment variable is required.\n" +
      "Please create a .env file with WELCOME_CHANNEL_ID=your_channel_id",
  );
}

if (!/^\d+$/.test(ROLE_ID_RAW)) {
  throw new Error(
    `TARGET_ROLE_ID must be a numeric Discord snowflake.\n` +
      `Received: "${ROLE_ID_RAW}"\n` +
      `Please check your .env file and ensure TARGET_ROLE_ID contains only digits.`,
  );
}

if (!/^\d+$/.test(INTRO_CHANNEL_ID)) {
  throw new Error(
    `INTRO_CHANNEL_ID must be a numeric Discord snowflake.\n` +
      `Received: "${INTRO_CHANNEL_ID}"\n` +
      `Please check your .env file and ensure INTRO_CHANNEL_ID contains only digits.`,
  );
}

if (!/^\d+$/.test(WELCOME_CHANNEL_ID)) {
  throw new Error(
    `WELCOME_CHANNEL_ID must be a numeric Discord snowflake.\n` +
      `Received: "${WELCOME_CHANNEL_ID}"\n` +
      `Please check your .env file and ensure WELCOME_CHANNEL_ID contains only digits.`,
  );
}

const optionalChannelIds = [
  ["RULES_CHANNEL_ID", RULES_CHANNEL_ID],
  ["GUIDE_CHANNEL_ID", GUIDE_CHANNEL_ID],
  ["WHATSAPP_CHANNEL_ID", WHATSAPP_CHANNEL_ID],
];
for (const [name, value] of optionalChannelIds) {
  if (value && !/^\d+$/.test(value)) {
    throw new Error(
      `${name} must be a numeric Discord snowflake if set. Received: "${value}"`,
    );
  }
}

const TARGET_ROLE_ID = ROLE_ID_RAW;

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

// Requiere en el Developer Portal: Bot → Privileged Gateway Intents → "Server Members Intent" ON
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});
client.on("error", (err) => {
  console.error("Discord client error:", err.message, err.code || "");
});
client.on("warn", (msg) => {
  console.warn("Discord client warn:", msg);
});
client.once(Events.ClientReady, (c) => {
  console.info(`Using state file at ${STATE_FILE}`);
  console.info(`Watching for messages in channel ID: ${INTRO_CHANNEL_ID}`);
  console.info(`Will send welcome messages to channel ID: ${WELCOME_CHANNEL_ID}`);
  console.info(`Will assign role ID: ${TARGET_ROLE_ID}`);
});

function buildWelcomeMessage(userId) {
  const rules = RULES_CHANNEL_ID ? `<#${RULES_CHANNEL_ID}>` : "reglas";
  const intro = `<#${INTRO_CHANNEL_ID}>`;
  const guide = GUIDE_CHANNEL_ID ? `<#${GUIDE_CHANNEL_ID}>` : "guia-de-la-comunidad";
  const whatsapp = WHATSAPP_CHANNEL_ID ? `<#${WHATSAPP_CHANNEL_ID}>` : "whatsapp-comunidad";

  return (
    `¡Bienvenido <@${userId}> a ShareIT!\n\n` +
    `Antes de empezar, recuerda leer las ${rules}\n` +
    `No olvides presentarte en ${intro}\n` +
    `Si quieres saber cómo funciona la comunidad en Discord/WhatsApp, revisa ${guide}\n` +
    `Y para sumarte a los grupos en WhatsApp, encontrarás un enlace de invitación en ${whatsapp}\n` +
    `## Debes presentarte para poder acceder a todos los canales de la comunidad\n` +
    WELCOME_SEPARATOR
  );
}

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    if (member.user.bot) return;
    const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (welcomeChannel && welcomeChannel.isTextBased()) {
      await welcomeChannel.send(buildWelcomeMessage(member.user.id));
    }
  } catch (error) {
    console.error(`Failed to send welcome message: ${error.message}`);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    if (String(message.channel.id) !== String(INTRO_CHANNEL_ID)) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    if (isUserProcessed(guildId, userId)) {
      console.info(`User ${message.author.tag} already has role, skipping`);
      return;
    }

    const role = message.guild.roles.cache.get(TARGET_ROLE_ID);
    if (!role) {
      console.error(
        `Configured role ID ${TARGET_ROLE_ID} not found in guild ${message.guild.name}`,
      );
      return;
    }

    const member =
      message.member ??
      (await message.guild.members.fetch(userId).catch(() => null));

    if (!member) {
      console.warn(
        `Could not resolve guild member for ${message.author.tag} in ${message.guild.name}`,
      );
      return;
    }

    try {
      console.info(`Assigning role ${role.name} to ${member.user.tag}`);
      await member.roles.add(role, "First message in introduction channel");
    } catch (error) {
      if (error.code === 50013) {
        console.error(
          `Missing permissions to add role ${role.name} to ${message.author.tag}`,
        );
      } else {
        console.error(
          `Failed to add role ${role.name} to ${message.author.tag}: ${error.message}`,
        );
      }
      return;
    }

    markUserProcessed(guildId, userId);
    scheduleStatePersist();
  } catch (error) {
    console.error(`Error handling message event: ${error.message}`);
  }
});

async function main() {
  await ensureStatePath(STATE_FILE);
  await loadState(STATE_FILE);

  const shutdown = async (signal) => {
    console.info(`Received ${signal}, shutting down gracefully`);
    
    if (persistTimeout) {
      clearTimeout(persistTimeout);
      persistTimeout = null;
    }
    await saveState(STATE_FILE);
    
    client.destroy();
    
    console.info("Bot shutdown complete");
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
    console.log("Attempting Discord login...");
    const loginPromise = client.login(TOKEN);
    const timeoutMs = 20000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Login timeout after ${timeoutMs / 1000}s - check token and Discord Developer Portal intents`)), timeoutMs);
    });
    await Promise.race([loginPromise, timeoutPromise]);
  } catch (error) {
    console.error("Login failed:", error.message);
    if (error.code) console.error("Error code:", error.code);
    process.exitCode = 1;
  }
}

main();
