const express = require("express");
const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

// --------------------
// KEEP ALIVE SERVER
// --------------------
const app = express();

app.get("/", (req, res) => {
  res.send("H Bot is alive 🚢");
});

app.listen(3000, () => {
  console.log("Keep-alive server running");
});

// --------------------
// BOT
// --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// --------------------
// DATA
// --------------------
let data = {};
const cooldowns = new Map();
const DATA_FILE = "./data.json";

function loadData() {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    data = {};
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

loadData();

// --------------------
// SLASH COMMAND REGISTER
// --------------------
const commands = [
  new SlashCommandBuilder()
    .setName("h")
    .setDescription("H bot system")
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Setup H bot channels")
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("Slash commands registered!");
  } catch (err) {
    console.log(err);
  }
})();

// --------------------
// MESSAGE SYSTEM
// --------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const userId = message.author.id;
  const channelName = message.channel.name;

  // ONLY #h CHANNEL
  if (channelName === "h") {
    const now = Date.now();
    const last = cooldowns.get(userId) || 0;

    // anti-spam 5s
    if (now - last < 5000) {
      try { await message.delete(); } catch {}
      return;
    }

    cooldowns.set(userId, now);

    if (content === "H" || content === "h") {
      data[userId] = (data[userId] || 0) + 1;
      saveData();

      try {
        await message.react("✅");
        await message.reply("H");
      } catch {}

      return;
    }

    try { await message.delete(); } catch {}
    return;
  }

  // LEADERBOARD ONLY #BOTS
  if (channelName === "bots") {
    if (content === "!hleaderboard") {
      const sorted = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      let text = "🏆 **H LEADERBOARD**\n\n";

      if (!sorted.length) {
        text += "No Hs yet 😄";
      } else {
        for (let i = 0; i < sorted.length; i++) {
          text += `${i + 1}. <@${sorted[i][0]}> — ${sorted[i][1]} H\n`;
        }
      }

      message.channel.send(text);
    }
  }
});

// --------------------
// SLASH COMMAND HANDLER
// --------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "h") {
    if (interaction.options.getSubcommand() === "setup") {

      const member = interaction.member;

      // permission check
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: "Setup failed ❌\nMissing permissions: Manage Server",
          ephemeral: true
        });
      }

      const guild = interaction.guild;

      const hChannel = guild.channels.cache.find(c => c.name === "h");
      const botsChannel = guild.channels.cache.find(c => c.name === "bots");

      if (!hChannel || !botsChannel) {
        return interaction.reply({
          content: "Setup failed ❌\nMissing channels: #h or #bots",
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          "Setup complete ✅\n" +
          "• added #h channel\n" +
          "• added #bots channel",
        ephemeral: true
      });
    }
  }
});

// --------------------
// READY
// --------------------
client.once("clientReady", () => {
  console.log(`H Bot is online as ${client.user.tag}`);
});

// --------------------
// LOGIN
// --------------------
client.login(TOKEN);
