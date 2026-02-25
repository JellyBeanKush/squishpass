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

    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (points >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = Math.max(0, LEVEL_DATA[nextLvl].points - points);

    let unlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}** — *${data.description}*`)
        .join("\n") || "None yet! Reach Level 1 to start.";

    let content = currentLevel >= MAX_LEVEL 
        ? `🎉 **SQUISH PASS MAXED!** Current Level: **${currentLevel}**! Points: **${points.toLocaleString()}**! 🥳\n\n**All Rewards Unlocked:**\n${unlockedList}\n\n💖 **Contribute to the Squish Pass** via Subs, Bits, Gifts, or Food!`
        : `⭐ **SQUISH PASS UPDATE!** Current Level: **${currentLevel}**! Points: **${points.toLocaleString()}**!\n\n**Rewards Unlocked So Far:**\n${unlockedList}\n\n🎯 **Only ${pointsNeeded.toLocaleString()} more points** to reach **Level ${nextLvl}**: **${LEVEL_DATA[nextLvl].reward}**\n\n💖 **Contribute to the Squish Pass** via Subs, Bits, Gifts, or Food!`;

    const imagePath = `./images/SP - LVL${currentLevel} - FEB26.png`;
    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = `SP-LVL${currentLevel}.png`;

    // 1. Load the ID and LOG IT so we can see what GitHub "thinks" the last message was
    let lastData = { message_id: null };
    if (fs.existsSync(PERSISTENCE_FILE)) {
        lastData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE));
        console.log(`Loaded from file: ${JSON.stringify(lastData)}`);
    } else {
        console.log("No persistence file found. This will be a new post.");
    }

    const formData = new FormData();
    const payload = {
        content: content,
        attachments: [{ id: 0, filename: fileName }]
    };
    formData.append('payload_json', JSON.stringify(payload));
    formData.append('files[0]', new Blob([imageBuffer]), fileName);

    const baseWebhookUrl = new URL(webhookUrl);
    let targetUrl;
    let method = 'POST';

    // 2. Safer URL construction to prevent double slashes
    if (lastData.message_id && lastData.message_id.trim() !== "") {
        const cleanPath = baseWebhookUrl.pathname.endsWith('/') ? baseWebhookUrl.pathname.slice(0, -1) : baseWebhookUrl.pathname;
        targetUrl = new URL(`${baseWebhookUrl.origin}${cleanPath}/messages/${lastData.message_id}?wait=true`);
        method = 'PATCH';
    } else {
        targetUrl = new URL(baseWebhookUrl.toString());
        targetUrl.searchParams.append('wait', 'true');
    }

    try {
        console.log(`Executing ${method} request...`);
        let response = await fetch(targetUrl.toString(), { method, body: formData });

        if (!response.ok) {
            const errorJson = await response.json();
            console.error(`Discord rejected ${method}:`, JSON.stringify(errorJson, null, 2));

            if (method === 'PATCH') {
                console.log("Falling back to NEW POST because PATCH failed.");
                method = 'POST';
                const postUrl = new URL(baseWebhookUrl.toString());
                postUrl.searchParams.append('wait', 'true');
                response = await fetch(postUrl.toString(), { method: 'POST', body: formData });
            }
        }

        const result = await response.json();
        if (result.id) {
            lastData.message_id = result.id;
            fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(lastData, null, 2));
            console.log(`Success! New Message ID saved: ${result.id}`);
        }
    } catch (err) {
        console.error("Critical error:", err);
    }
}

main();
