const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

app.get("/", (req, res) => {
  res.send("H Bot is alive 🚢");
});

app.listen(3000, () => {
  console.log("Keep-alive server running");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN;

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  if (content === "H" || content === "h") {
    await message.react("✅");
    return;
  }

  await message.delete().catch(() => {});
});

client.once("clientReady", () => {
  console.log(`H Bot is online as ${client.user.tag}`);
});

client.login(TOKEN);
