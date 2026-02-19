import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import fs from 'fs';

const PERSISTENCE_FILE = "last_post_data.json";
const CHANNEL_ID = "1435754946321453247"; // Your SquishPass Channel
const MAX_LEVEL = 20;

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "Contribute to unlock Level 1!" },
    1: { points: 1, reward: "Friday Night Flix", description: "A community movie night in Discord." },
    2: { points: 25, reward: "x2 HoneyBun Multiplier", description: "Active until the next month." },
    // ... (Add levels 3-20 here from your daily_image_bot.py)
    20: { points: 750, reward: "Special Outfit Stream", description: "Bear mascot in a maid outfit! (MAX REWARD)" }
};

const DIGIT_EMOJI_MAP = { '0': '0️⃣', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣', '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣' };

async function main() {
    const points = parseInt(process.env.POINTS || 0);
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(process.env.DISCORD_TOKEN);

    // Calculate Level
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (points >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = LEVEL_DATA[nextLvl].points - points;

    // Build Message
    let unlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}** — *${data.description}*`)
        .join("\n") || "None yet! Reach Level 1 to start.";

    const content = `⭐ **SQUISH PASS UPDATE!** Level: **${currentLevel}** | Points: **${points}**\n\n**Rewards Unlocked:**\n${unlockedList}\n\n🎯 **${pointsNeeded} more** to Level ${nextLvl}: **${LEVEL_DATA[nextLvl].reward}**`;

    // Handle Image and Discord Post
    const channel = await client.channels.fetch(CHANNEL_ID);
    const imagePath = `./images/SP - LVL${currentLevel} - FEB26.png`;
    const attachment = new AttachmentBuilder(imagePath);

    // Load last message ID to edit instead of reposting
    let lastData = { message_id: null };
    if (fs.existsSync(PERSISTENCE_FILE)) lastData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE));

    if (lastData.message_id) {
        const msg = await channel.messages.fetch(lastData.message_id);
        await msg.edit({ content, files: [attachment] });
    } else {
        const msg = await channel.send({ content, files: [attachment] });
        lastData.message_id = msg.id;
        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(lastData));
    }

    console.log(`Updated to Level ${currentLevel}`);
    process.exit(0);
}

main();
