import fs from 'fs';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 21; 

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins! Help us reach Level 1 to kick off the monthly rewards." },
    1: { points: 1, reward: "HBS ART PACK", description: "Custom digital goodies and community coloring pages unlocked!" },
    2: { points: 5, reward: "MUSIC MADNESS", description: "The ultimate music tournament tracking stream event!" },
    3: { points: 10, reward: "+10 HOURS", description: "Adding 10 extra hours to the monthly stream time bank." },
    4: { points: 20, reward: "X2 HONEY BUNS", description: "Double channel multiplier activated! Points multiplier is live." },
    5: { points: 35, reward: "WEEKLY WATCH PARTIES", description: "Watching TV on stream, then going to Discord for a movie!" },
    6: { points: 55, reward: "TIER LISTS", description: "A dedicated stream for tier lists ranking community favorites." },
    7: { points: 80, reward: "+10 HOURS", description: "Another 10-hour deposit added directly into the stream bank." },
    8: { points: 110, reward: "X3 HONEY BUNS", description: "Point multiplier upgraded! Triple points are now active." },
    9: { points: 140, reward: "TABLETOP GAMES", description: "Classic tabletop fun and board games live on stream." },
    10: { points: 175, reward: "COOKING & COCKTAILS", description: "Preparing a meal and mixing drinks live with the community." },
    11: { points: 210, reward: "+10 HOURS", description: "10 more bonus hours of stream content unlocked." },
    12: { points: 250, reward: "X4 HONEY BUNS", description: "Multiplier boost! Quadruple points are now active." },
    13: { points: 290, reward: "CHAT CHOOSES GAME", description: "The viewers completely dictate what game is played live." },
    14: { points: 330, reward: "WORKOUT STREAM", description: "A dedicated fitness and exercise session live." },
    15: { points: 370, reward: "+10 HOURS", description: "Adding a fresh 10-hour block into the time reserve." },
    16: { points: 415, reward: "FIELD TRIP", description: "Taking the stream outdoors live for an exciting community excursion." },
    17: { points: 460, reward: "X5 HONEY BUNS", description: "MAX MULTIPLIER! Everyone earns x5 points on the channel." },
    18: { points: 510, reward: "SHIRTLESS TIL RESET", description: "A long-term challenge active until the next reset." },
    19: { points: 560, reward: "+10 HOURS", description: "Another 10 bonus hours deposited into the stream bank." },
    20: { points: 610, reward: "MERCH GIVEAWAY", description: "Exclusive custom community merchandise given away live to viewers." },
    21: { points: 666, reward: "DRAG STREAM", description: "The ultimate pass reward! A special drag streaming event!" }
};

async function main() {
    const incomingRaw = process.env.POINTS;
    let incomingPoints = parseFloat(incomingRaw);
    
    if (isNaN(incomingPoints)) {
        console.log("No valid points detected, defaulting change to 0.");
        incomingPoints = 0;
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error("Missing DISCORD_WEBHOOK_URL");
        process.exit(1);
    }

    let lastPostData = { message_id: null, total_points: 0 };
    if (fs.existsSync(PERSISTENCE_FILE)) {
        try {
            lastPostData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
        } catch (e) {
            console.warn("Could not read persistence file, starting fresh.");
        }
    }

    const totalPoints = parseFloat(Math.max(0, (lastPostData.total_points || 0) + incomingPoints).toFixed(2));
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (totalPoints >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = parseFloat(Math.max(0, LEVEL_DATA[nextLvl].points - totalPoints).toFixed(2));
    const nextReward = LEVEL_DATA[nextLvl];

    let fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet! Reach Level 1 to start.";
    
    const changeText = incomingPoints >= 0 ? `📈 Added **${incomingPoints}** points!` : `🔧 Manual Adjustment: **${incomingPoints}** points.`;

    let content = `⭐ **SQUISH PASS UPDATE!**\n` +
                  `**Total Points:** ${totalPoints} | **Current Level:** ${currentLevel}\n` +
                  `*${changeText}* \n\n` +
                  `**Rewards Unlocked This Month:**\n${fullUnlockedList}\n\n` +
                  `🎯 **Next Milestone:** **${pointsNeeded}** more points for **Level ${nextLvl}**\n` +
                  `🎁 **Next Reward:** ${nextReward.reward}\n` +
                  `*${nextReward.description}*\n\n` +
                  `💖 **Support the stream to unlock the next milestone!**`;

    const fileName = `SP - LVL${currentLevel}.png`;
    const imagePath = `./images/${fileName}`;

    const baseWebhookUrl = new URL(webhookUrl);
    const cleanPath = baseWebhookUrl.pathname.replace(/\/$/, "");
    
    // Logic to decide between creating new message or editing old one
    let targetUrl = `${baseWebhookUrl.origin}${cleanPath}?wait=true&thread_id=${THREAD_ID}`;
    let method = 'POST';

    if (lastPostData.message_id) {
        targetUrl = `${baseWebhookUrl.origin}${cleanPath}/messages/${lastPostData.message_id}?wait=true&thread_id=${THREAD_ID}`;
        method = 'PATCH';
    }

    const formData = new FormData();
    const payload = { content: content, attachments: [] };

    if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        payload.attachments = [{ id: 0, filename: fileName }];
        formData.append('files[0]', new Blob([imageBuffer]), fileName);
    }

    formData.append('payload_json', JSON.stringify(payload));

    try {
        const response = await fetch(targetUrl, { method: method, body: formData });
        const responseData = await response.json();
        
        const finalData = {
            message_id: method === 'POST' ? responseData.id : lastPostData.message_id,
            total_points: totalPoints,
            last_update: new Date().toISOString()
        };

        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(finalData, null, 2));
        console.log(`Successfully updated. New Total: ${totalPoints} (Action: ${method})`);
    } catch (err) {
        console.error("Update failed:", err);
    }
}

main();
