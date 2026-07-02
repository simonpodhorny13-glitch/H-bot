const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

// --------------------
// Keep Render alive
// --------------------
const app = express();

app.get("/", (req, res) => {
  res.send("H Bot is alive 🚢");
});

app.listen(3000, () => {
  console.log("Keep-alive server running");
});

// --------------------
// Discord bot
// --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN;

// --------------------
// Main logic
// --------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ONLY #h channel
  if (message.channel.name !== "h") return;

  const content = message.content.trim();

  // Allow ONLY H or h
  if (content === "H" || content === "h") {
    try {
      await message.react("✅");
      await message.reply("H");
    } catch (err) {
      console.log("Error handling H:", err);
    }
    return;
  }

  // Delete everything else
  try {
    await message.delete();
  } catch (err) {
    console.log("Delete failed:", err);
  }
});

// --------------------
// Ready event
// --------------------
client.once("clientReady", () => {
  console.log(`H Bot is online as ${client.user.tag}`);
});

// --------------------
// Login
// --------------------
client.login(TOKEN);
