import fs from 'fs';

const PERSISTENCE_FILE = "last_post_data.json";
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
    20: { points: 750, reward: "Special Outfit Stream", description: "Bear mascot in a maid outfit! (MAX REWARD)" }
};

async function main() {
    const rawPoints = process.env.POINTS;
    const points = (rawPoints && rawPoints !== "undefined" && rawPoints !== "NaN") ? parseInt(rawPoints) : 0;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error("Missing DISCORD_WEBHOOK_URL");
        process.exit(1);
    }

    // CALCULATE LEVEL
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (points >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = Math.max(0, LEVEL_DATA[nextLvl].points - points);

    // BUILD REWARD LIST
    let unlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}** — *${data.description}*`)
        .join("\n") || "None yet! Reach Level 1 to start.";

    // BUILD CONTENT STRING
    let content = "";
    if (currentLevel >= MAX_LEVEL) {
        content = `🎉 **SQUISH PASS MAXED!** Current Level: **${currentLevel}**! Total Points: **${points.toLocaleString()}**! 🥳\n\n**All Rewards Unlocked:**\n${unlockedList}\n\n💖 **Contribute to the Squish Pass** via Subs, Bits, Gifts, or Food!`;
    } else {
        content = `⭐ **SQUISH PASS UPDATE!** Current Level: **${currentLevel}**! Total Points: **${points.toLocaleString()}**!\n\n**Rewards Unlocked So Far:**\n${unlockedList}\n\n🎯 **Only ${pointsNeeded.toLocaleString()} more points** to reach **Level ${nextLvl}**: **${LEVEL_DATA[nextLvl].reward}**\n\n💖 **Contribute to the Squish Pass** via Subs, Bits, Gifts, or Food!`;
    }

    // IMAGE PREP
    const imagePath = `./images/SP - LVL${currentLevel} - FEB26.png`;
    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = `SP-LVL${currentLevel}.png`;

    // PERSISTENCE
    let lastData = { message_id: null };
    if (fs.existsSync(PERSISTENCE_FILE)) {
        lastData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE));
    }

    // SEND/EDIT VIA WEBHOOK
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({ content }));
    formData.append('file', new Blob([imageBuffer]), fileName);

    let targetUrl = `${webhookUrl}&wait=true`; // wait=true allows us to get the message ID back
    let method = 'POST';

    if (lastData.message_id) {
        targetUrl = `${webhookUrl}/messages/${lastData.message_id}?wait=true`;
        method = 'PATCH';
    }

    try {
        console.log(`${method === 'PATCH' ? 'Editing' : 'Sending'} message...`);
        let response = await fetch(targetUrl, { method, body: formData });

        // If PATCH fails (e.g. message deleted or webhook changed), fallback to POST
        if (!response.ok && method === 'PATCH') {
            console.log("Edit failed, sending new message...");
            targetUrl = `${webhookUrl}&wait=true`;
            response = await fetch(targetUrl, { method: 'POST', body: formData });
        }

        const result = await response.json();
        if (result.id) {
            lastData.message_id = result.id;
            fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(lastData, null, 2));
            console.log(`Success! Message ID: ${result.id}`);
        } else {
            console.error("Error from Discord:", result);
        }
    } catch (err) {
        console.error("Request failed:", err);
    }

    process.exit(0);
}

main();
