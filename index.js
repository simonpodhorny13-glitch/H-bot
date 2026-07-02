const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

// Keep Render alive
app.get("/", (req, res) => {
  res.send("H Bot is alive 🚢");
});

app.listen(3000, () => {
  console.log("Keep-alive server running");
});

// Discord bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN;

// Main logic
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // ONLY "H" allowed
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

// Ready event (no warning)
client.once("clientReady", () => {
  console.log(`H Bot is online as ${client.user.tag}`);
});

client.login(TOKEN);
