import fs from 'fs';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const TARGET_MESSAGE_ID = "1476320490220949686"; 
const MAX_LEVEL = 21; // Updated to match your new 21-level pass

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins! Help us reach Level 1 to kick off the monthly rewards." },
    1: { points: 1, reward: "Music Madness (Launch)", description: "The ultimate monthly kickoff event!" },
    2: { points: 5, reward: "+7 Hours", description: "Adding 7 extra hours to the monthly stream bank." },
    3: { points: 10, reward: "x2 Honeybuns", description: "Point multiplier activated! Everyone earns double." },
    4: { points: 20, reward: "Monthly Art Pack", description: "Custom digital goodies and coloring pages for the community." },
    5: { points: 35, reward: "Weekly TV Time", description: "A regular slot for watching and reacting to shows together." },
    6: { points: 55, reward: "+7 Hours", description: "Another 7-hour deposit into the stream time bank." },
    7: { points: 80, reward: "Tabletop Games Stream", description: "Board games and classic tabletop fun live on stream." },
    8: { points: 110, reward: "x3 Honeybuns", description: "Multiplier upgraded! Now earning triple points." },
    9: { points: 140, reward: "Movie Night #1", description: "The first community cinema hangout of the month." },
    10: { points: 175, reward: "+7 Hours", description: "7 more hours of bonus content unlocked." },
    11: { points: 210, reward: "Arts and Crafts Stream", description: "Getting creative with a live DIY or art project." },
    12: { points: 250, reward: "x4 Honeybuns", description: "Multiplier boost! Quadruple points are now active." },
    13: { points: 290, reward: "Movie Night #2", description: "Another night for films and Discord hanging." },
    14: { points: 330, reward: "Cooking Together Stream", description: "Preparing a meal live with the community." },
    15: { points: 370, reward: "+7 Hours", description: "Adding the final 7-hour block to the bank." },
    16: { points: 415, reward: "IRL Park Stream", description: "Taking the stream outdoors for a park visit and nature walk." },
    17: { points: 460, reward: "Workout Stream", description: "A dedicated fitness and exercise session." },
    18: { points: 510, reward: "x5 Honeybuns", description: "MAX MULTIPLIER! x5 points for all viewers." },
    19: { points: 560, reward: "Shirtless ‘til next Pass", description: "A long-term challenge active until the next reset." },
    20: { points: 610, reward: "+7 Hours", description: "Final bonus time deposit for the month." },
    21: { points: 666, reward: "Cosplay Stream (Date TBD)", description: "The Final Boss reward! A full cosplay debut stream." }
};

async function main() {
    // 1. Capture incoming points from Mix It Up as a Float
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

    // 2. Load previous total from JSON memory
    let previousTotal = 0;
    if (fs.existsSync(PERSISTENCE_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
            previousTotal = parseFloat(data.total_points) || 0;
        } catch (e) {
            console.warn("Could not read persistence file, starting at 0.");
        }
    }

    // 3. Calculate New Total (Rounded to 2 decimals)
    const totalPoints = parseFloat(Math.max(0, previousTotal + incomingPoints).toFixed(2));

    // 4. Calculate Level and Milestone Data
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (totalPoints >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = parseFloat(Math.max(0, LEVEL_DATA[nextLvl].points - totalPoints).toFixed(2));
    const nextReward = LEVEL_DATA[nextLvl];

    // 5. Build unlocked list for Discord
    let fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet! Reach Level 1 to start.";
    
    // 6. Assemble Discord Content
    const changeText = incomingPoints >= 0 
        ? `📈 Added **${incomingPoints}** points!` 
        : `🔧 Manual Adjustment: **${incomingPoints}** points.`;

    let content = `⭐ **SQUISH PASS UPDATE!**\n` +
                  `**Total Points:** ${totalPoints} | **Current Level:** ${currentLevel}\n` +
                  `*${changeText}* \n\n` +
                  `**Rewards Unlocked This Month:**\n${fullUnlockedList}\n\n` +
                  `🎯 **Next Milestone:** **${pointsNeeded}** more points for **Level ${nextLvl}**\n` +
                  `🎁 **Next Reward:** ${nextReward.reward}\n` +
                  `*${nextReward.description}*\n\n` +
                  `💖 **Support the stream to unlock the next milestone!**`;

    const fileName = `SP-LVL${currentLevel}.png`;
    const imagePath = `./images/${fileName}`;

    // 7. Update Discord Post
    const baseWebhookUrl = new URL(webhookUrl);
    const cleanPath = baseWebhookUrl.pathname.replace(/\/$/, "");
    const targetUrl = `${baseWebhookUrl.origin}${cleanPath}/messages/${TARGET_MESSAGE_ID}?wait=true&thread_id=${THREAD_ID}`;

    const formData = new FormData();
    
    /** 
     * FIX: We initialize 'attachments' as an empty array. 
     * This tells Discord to remove any existing images on the message before adding the new one.
     */
    const payload = { 
        content: content,
        attachments: [] 
    };

    if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        // Map the new file to attachment ID 0
        payload.attachments = [{ id: 0, filename: fileName }];
        formData.append('files[0]', new Blob([imageBuffer]), fileName);
        console.log(`Image found: ${fileName}. Uploading...`);
    } else {
        console.warn(`Warning: Image ${imagePath} not found. Updating text only.`);
    }

    formData.append('payload_json', JSON.stringify(payload));

    try {
        await fetch(targetUrl, { method: 'PATCH', body: formData });
        
        // 8. SAVE THE DATA
        const finalData = {
            message_id: TARGET_MESSAGE_ID,
            total_points: totalPoints,
            current_level: currentLevel,
            points_needed: pointsNeeded,
            next_reward: nextReward.reward,
            image_name: fileName,
            last_update: new Date().toISOString()
        };

        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(finalData, null, 2));
        
        console.log(`Successfully updated. New Total: ${totalPoints}`);
    } catch (err) {
        console.error("Update failed:", err);
    }
}

main();
