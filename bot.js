const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = "YOUR_BOT_TOKEN_HERE";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // Allow only "H" or "h"
  if (content === "H" || content === "h") {
    try {
      await message.react("✅");
    } catch (err) {
      console.log("Reaction failed:", err);
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

client.once("ready", () => {
  console.log(`H Bot is online as ${client.user.tag}`);
});

client.login(TOKEN);
