import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import fs from 'fs';

const PERSISTENCE_FILE = "last_post_data.json";
const CHANNEL_ID = "1435754946321453247"; // Your SquishPass Channel
const MAX_LEVEL = 20;

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "Contribute to unlock Level 1!" },
    1: { points: 1, reward: "Friday Night Flix", description: "A community movie night in Discord every Friday for the rest of the month." },
    2: { points: 25, reward: "x2 HoneyBun Multiplier", description: "Active until the next month." },
    3: { points: 50, reward: "Lit Club", description: "A monthly Book club! Discussion takes place in Discord!" },
    4: { points: 75, reward: "Monthly Art Pack", description: "HBS themed Desktop/Mobile Wallpapers and coloring pages released every month!" },
    5: { points: 100, reward: "Tier List Tuesdays", description: "Bonus chill stream where we rank things every Tuesday night." },
    6: { points: 130, reward: "$15 Giveaway", description: "Paid via PayPal/CashApp or equivalent gift card." },
    7: { points: 160, reward: "x3 HoneyBun Multiplier", description: "Active until the next month." },
    8: { points: 190, reward: "Throwback Thursdays", description: "Bonus retro gaming stream every Thursday night." },
    9: { points: 225, reward: "Karaoke Night", description: "A singular special vocal/karaoke stream event." },
    10: { points: 260, reward: "$15 Giveaway", description: "Paid via PayPal/CashApp or equivalent gift card." },
    11: { points: 300, reward: "Wildcard Wednesdays", description: "A surprise variety bonus stream every Wednesday night." },
    12: { points: 340, reward: "x4 HoneyBun Multiplier", description: "Active until the next month." },
    13: { points: 385, reward: "Cooking Stream", description: "A singular special event where we cook a meal live on stream." },
    14: { points: 430, reward: "Maker Mondays", description: "A creative/DIY bonus stream every Monday night." },
    15: { points: 475, reward: "$15 Giveaway", description: "Paid via PayPal/CashApp or equivalent gift card." },
    16: { points: 525, reward: "Shirtless Streams", description: "The rest of the month is streamed without a shirt." },
    17: { points: 575, reward: "x5 HoneyBun Multiplier", description: "Active until the next month." },
    18: { points: 630, reward: "24 Hour Stream", description: "A singular, continuous 24-hour marathon stream." },
    19: { points: 690, reward: "$15 Giveaway", description: "Paid via PayPal/CashApp or equivalent gift card." },
    20: { points: 750, reward: "Special Outfit Stream", description: "A singular special stream featuring your bear mascot character in a maid outfit! (MAX REWARD)" }
};

async function main() {
    const points = parseInt(process.env.POINTS || 0);
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(process.env.DISCORD_TOKEN);

    // Calculate Current Level
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (points >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = LEVEL_DATA[nextLvl].points - points;

    // Build Reward List
    let unlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}** — *${data.description}*`)
        .join("\n") || "None yet! Reach Level 1 to start.";

    // Build Post Content
    let content = "";
    if (currentLevel >= MAX_LEVEL) {
        content = `🎉 **SQUISH PASS MAXED!** Current Level: **${currentLevel}**! Total Points: **${points.toLocaleString()}**! 🥳\n\n**All Rewards Unlocked:**\n${unlockedList}\n\n💖 **Contribute to the Squish Pass** via Subs, Bits, Gifts, or Food!`;
    } else {
        content = `⭐ **SQUISH PASS UPDATE!** Current Level: **${currentLevel}**! Total Points: **${points.toLocaleString()}**!\n\n**Rewards Unlocked So Far:**\n${unlockedList}\n\n🎯 **Only ${pointsNeeded.toLocaleString()} more points** to reach **Level ${nextLvl}**: **${LEVEL_DATA[nextLvl].reward}** (${LEVEL_DATA[nextLvl].description})\n\n💖 **Contribute to the Squish Pass** via Subs, Bits, Gifts, or Food!`;
    }

    const channel = await client.channels.fetch(CHANNEL_ID);
    const imagePath = `./images/SP - LVL${currentLevel} - FEB26.png`;
    const attachment = new AttachmentBuilder(imagePath);

    let lastData = { message_id: null };
    if (fs.existsSync(PERSISTENCE_FILE)) {
        lastData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE));
    }

    try {
        if (lastData.message_id) {
            // Fix: Directly fetch the message object
            const msg = await channel.messages.fetch(lastData.message_id.toString());
            await msg.edit({ content, files: [attachment] });
            console.log(`Successfully edited message for Level ${currentLevel}`);
        } else {
            throw new Error("No existing message ID found.");
        }
    } catch (err) {
        console.log("Could not find or edit message, sending new one...");
        const newMsg = await channel.send({ content, files: [attachment] });
        lastData.message_id = newMsg.id;
        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(lastData));
        console.log("Sent new message and saved ID.");
    }

    process.exit(0);
}

main();
