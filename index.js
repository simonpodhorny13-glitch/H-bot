require("dotenv").config();

const express = require("express");
const fs = require("fs");
const axios = require("axios");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

// --------------------
// KEEP ALIVE SERVER
// --------------------

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("H Bot is live");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Keep-alive server running on ${PORT}`);
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

// RO-12 API
const RO12_URL = process.env.RO12_URL; // your render link
const API_KEY = process.env.H_API_KEY;

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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName("setup")
        .setDescription("Setup H bot channels")
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("Registered slash commands.");
  } catch (err) {
    console.error("Slash command register error:", err);
  }
})();

// --------------------
// SLASH COMMAND HANDLER
// --------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "h") return;

  const subcommand = interaction.options.getSubcommand();

  if (subcommand !== "setup") return;

  try {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: "❌ `/h setup` can only be used in a server.", ephemeral: true });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ You need **Manage Channels** to use `/h setup`.", ephemeral: true });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ I need the **Manage Channels** permission to create setup channels.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    let category = interaction.guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name === "Bot commands"
    );

    if (!category) {
      category = await interaction.guild.channels.create({
        name: "Bot commands",
        type: ChannelType.GuildCategory,
      });
    }

    let hChannel = interaction.guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildText && channel.name === "h"
    );

    if (!hChannel) {
      hChannel = await interaction.guild.channels.create({
        name: "h",
        type: ChannelType.GuildText,
        parent: category.id,
        topic: "H.",
      });
    } else if (!hChannel.parentId && category) {
      await hChannel.setParent(category.id).catch(() => null);
    }

    await interaction.editReply(
      `✅ H setup complete!\n\nCreated/found: ${hChannel}\n\nType **H** there to test me.`
    );
  } catch (err) {
    console.error("/h setup error:", err);

    const message = "❌ H setup crashed. Check the bot logs.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => null);
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
    }
  }
});

// --------------------
// RO-12 REWARD FUNCTION
// --------------------
async function sendReward(userId, username, hCount) {
  try {
    const res = await axios.post(`${RO12_URL}/claim-h-reward`, {
      userId,
      username,
      hCount
    }, {
      headers: {
        "x-api-key": API_KEY
      }
    });

    return res.data;
  } catch (err) {
    console.log("RO-12 error:", err.message);
    return null;
  }
}

// --------------------
// MESSAGE SYSTEM
// --------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const userId = message.author.id;
  const channelName = message.channel.name;

  if (!data[userId]) data[userId] = { h: 0, lastReward: 0 };

  // ONLY #h CHANNEL
  if (channelName === "h") {
    const now = Date.now();
    const last = cooldowns.get(userId) || 0;

    if (now - last < 5000) {
      try { await message.delete(); } catch {}
      return;
    }

    cooldowns.set(userId, now);

    if (content === "H" || content === "h") {
      data[userId].h += 1;
      saveData();

      try {
        await message.react("✅");
        await message.reply("H");
      } catch {}

      // --------------------
      // RO-12 TRIGGER (every 50 H)
      // --------------------
      if (data[userId].h % 50 === 0) {
        const result = await sendReward(
          userId,
          message.author.username,
          data[userId].h
        );

        if (result?.success) {
          await message.channel.send(
            `💰 RO-12 Reward: +$50 for ${message.author.username}!`
          );
        } else {
          await message.channel.send(
            `⏳ RO-12 reward not available (daily limit reached)`
          );
        }
      }

      return;
    }

    try { await message.delete(); } catch {}
    return;
  }

  // LEADERBOARD ONLY #BOTS
  if (channelName === "bots") {
    if (content === "!hleaderboard") {
      const sorted = Object.entries(data)
        .sort((a, b) => b[1].h - a[1].h)
        .slice(0, 10);

      let text = "🏆 **H LEADERBOARD**\n\n";

      if (!sorted.length) {
        text += "No Hs yet 😄";
      } else {
        for (let i = 0; i < sorted.length; i++) {
          text += `${i + 1}. <@${sorted[i][0]}> — ${sorted[i][1].h} H\n`;
        }
      }

      message.channel.send(text);
    }
  }
});

// --------------------
// READY
// --------------------
client.once("ready", () => {
  console.log(`H Bot is online as ${client.user.tag}`);
});

// --------------------
// LOGIN
// --------------------
console.log("Token exists:", !!TOKEN);
console.log("Token length:", TOKEN?.length);

client.login(TOKEN);
