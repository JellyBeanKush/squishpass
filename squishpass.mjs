import fs from 'fs';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const TARGET_MESSAGE_ID = "1476320490220949686"; 
const MAX_LEVEL = 30;

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins! Help us reach Level 1 to kick off the monthly rewards." },
    1: { points: 1, reward: "Lit Club", description: "Our monthly Book Club! We pick a title and dive deep into the story and characters." },
    2: { points: 5, reward: "+5 Hours", description: "Adding 5 extra hours to our monthly stream bank for more hangouts." },
    3: { points: 10, reward: "Music Madness", description: "The ultimate Songbattle.io showdown with the community." },
    4: { points: 15, reward: "x2 Multiplier", description: "Everyone earns double points for the remainder of the month." },
    5: { points: 22, reward: "+5 Hours", description: "Another 5 hours added to the monthly stream bank." },
    6: { points: 30, reward: "Art Pack", description: "Custom mobile/desktop wallpapers and printable coloring pages drop." },
    7: { points: 40, reward: "Tier Lists", description: "A marathon stream where we rank everything with chat." },
    8: { points: 60, reward: "+5 Hours", description: "5 more hours of bonus stream time are now in the bank." },
    9: { points: 80, reward: "Movie Night", description: "Discord hangout to watch films together." },
    10: { points: 100, reward: "$25 Giveaway", description: "Choice of $25 in Cash, V-Bucks, Gift Cards, or Merch credit." },
    11: { points: 120, reward: "+5 Hours", description: "Adding another 5-hour block to the monthly schedule." },
    12: { points: 140, reward: "x3 Multiplier", description: "The point multiplier is upgraded to x3." },
    13: { points: 165, reward: "Arts 'n Crafts", description: "DIY project, painting, or crafting live on stream." },
    14: { points: 190, reward: "+5 Hours", description: "5 more bonus hours added to the time bank." },
    15: { points: 215, reward: "Karaoke", description: "Singing our favorite tracks live on the mic." },
    16: { points: 240, reward: "Tabletop Games", description: "Board games, puzzles, or classic card games on stream." },
    17: { points: 265, reward: "+5 Hours", description: "5 more hours of bonus content unlocked." },
    18: { points: 290, reward: "x4 Multiplier", description: "Everyone is now earning x4 points." },
    19: { points: 315, reward: "+5 Hours", description: "Another 5-hour deposit into the monthly time bank." },
    20: { points: 345, reward: "$25 Giveaway", description: "Level 20 Milestone! Another chance to win a $25 prize." },
    21: { points: 375, reward: "+5 Hours", description: "Adding 5 more bonus hours to the monthly bank." },
    22: { points: 405, reward: "Cooking Stream", description: "Preparing a fancy meal live on camera." },
    23: { points: 435, reward: "Park 'n Picnic", description: "IRL nature stream featuring a hike and outdoor picnic." },
    24: { points: 465, reward: "Workout Stream", description: "Exercise and fitness regimen live for the community." },
    25: { points: 495, reward: "+5 Hours", description: "One of the last 5-hour boosts for the month." },
    26: { points: 525, reward: "Shirtless 'til Reset", description: "Challenge active until the monthly reset." },
    27: { points: 560, reward: "x5 Multiplier", description: "MAX MULTIPLIER! x5 points for all viewers." },
    28: { points: 595, reward: "+5 Hours", description: "The final 5-hour addition to the monthly bank." },
    29: { points: 630, reward: "Special Outfit", description: "A debut of a special community-chosen outfit!" },
    30: { points: 666, reward: "$25 Giveaway", description: "THE FINAL BOSS! One last $25 value giveaway!" }
};

async function main() {
    // 1. Capture the amount using parseFloat to allow decimals
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

    // 2. Load previous total (also as a float)
    let previousTotal = 0;
    if (fs.existsSync(PERSISTENCE_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
            previousTotal = parseFloat(data.total_points) || 0;
        } catch (e) {
            console.warn("Could not read persistence file, starting at 0.");
        }
    }

    // 3. Calculate New Total and fix decimal precision issues
    // Using .toFixed(2) then parseFloat again prevents "floating point errors" like 19.20000000004
    const totalPoints = parseFloat(Math.max(0, previousTotal + incomingPoints).toFixed(2));

    // 4. Calculate Level based on decimals
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (totalPoints >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = parseFloat(Math.max(0, LEVEL_DATA[nextLvl].points - totalPoints).toFixed(2));
    const nextReward = LEVEL_DATA[nextLvl];

    // 5. Build unlocked list
    let fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet! Reach Level 1 to start.";
    
    // 6. Build the Discord message
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

    // 7. Update Discord (PATCH)
    const baseWebhookUrl = new URL(webhookUrl);
    const cleanPath = baseWebhookUrl.pathname.replace(/\/$/, "");
    const targetUrl = `${baseWebhookUrl.origin}${cleanPath}/messages/${TARGET_MESSAGE_ID}?wait=true&thread_id=${THREAD_ID}`;

    const formData = new FormData();
    const payload = { content: content };

    if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        payload.attachments = [{ id: 0, filename: fileName }];
        formData.append('files[0]', new Blob([imageBuffer]), fileName);
    }

    formData.append('payload_json', JSON.stringify(payload));

    try {
        await fetch(targetUrl, { method: 'PATCH', body: formData });
        
        // 8. SAVE the new total (keeping the decimal)
        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({ 
            message_id: TARGET_MESSAGE_ID, 
            total_points: totalPoints 
        }, null, 2));
        
        console.log(`Success! Total: ${totalPoints} (Change: ${incomingPoints})`);
    } catch (err) {
        console.error("Update failed:", err);
    }
}

main();
