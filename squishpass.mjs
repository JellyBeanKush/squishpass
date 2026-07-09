import fs from 'fs';
import sharp from 'sharp';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 21; 
const BASE_IMAGE = './images/base_board.png'; 
const LOCK_OVERLAY = './images/lock_overlay.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins!" },
    1: { points: 1, reward: "HBS ART PACK", description: "Custom digital goodies!" },
    2: { points: 5, reward: "MUSIC MADNESS", description: "Music tournament stream!" },
    3: { points: 10, reward: "+10 HOURS", description: "10 extra hours added." },
    4: { points: 20, reward: "X2 HONEY BUNS", description: "Double points active!" },
    5: { points: 35, reward: "WEEKLY WATCH PARTIES", description: "Movie nights unlocked!" },
    6: { points: 55, reward: "TIER LISTS", description: "Community tier lists!" },
    7: { points: 80, reward: "+10 HOURS", description: "Time bank deposit." },
    8: { points: 110, reward: "X3 HONEY BUNS", description: "Triple points active!" },
    9: { points: 140, reward: "TABLETOP GAMES", description: "Board games stream!" },
    10: { points: 175, reward: "COOKING & COCKTAILS", description: "Live cooking session!" },
    11: { points: 210, reward: "+10 HOURS", description: "Time bank deposit." },
    12: { points: 250, reward: "X4 HONEY BUNS", description: "Quadruple points active!" },
    13: { points: 290, reward: "CHAT CHOOSES GAME", description: "Viewer choice stream!" },
    14: { points: 330, reward: "WORKOUT STREAM", description: "Fitness session!" },
    15: { points: 370, reward: "+10 HOURS", description: "Time bank deposit." },
    16: { points: 415, reward: "FIELD TRIP", description: "Outdoor stream!" },
    17: { points: 460, reward: "X5 HONEY BUNS", description: "MAX MULTIPLIER!" },
    18: { points: 510, reward: "SHIRTLESS TIL RESET", description: "Long-term challenge!" },
    19: { points: 560, reward: "+10 HOURS", description: "Time bank deposit." },
    20: { points: 610, reward: "MERCH GIVEAWAY", description: "Exclusive giveaway!" },
    21: { points: 666, reward: "DRAG STREAM", description: "The ultimate reward!" }
};

async function generateBoardImage(currentLevel) {
    let pipeline = sharp(BASE_IMAGE);
    const overlays = [];

    const startX = 50; 
    const startY = 50;
    const stepX = 250; 
    const stepY = 300;

    for (let i = 1; i <= MAX_LEVEL; i++) {
        if (i > currentLevel) {
            let col = (i - 1) % 7;
            let row = Math.floor((i - 1) / 7);
            overlays.push({ 
                input: LOCK_OVERLAY, 
                top: startY + (row * stepY), 
                left: startX + (col * stepX) 
            });
        }
    }

    await pipeline.composite(overlays).toFile(OUTPUT_IMAGE);
    return OUTPUT_IMAGE;
}

async function main() {
    const incomingPoints = parseFloat(process.env.POINTS || 0);
    let lastPostData = { message_id: null, total_points: 0 };
    
    if (fs.existsSync(PERSISTENCE_FILE)) {
        try {
            lastPostData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
        } catch (e) {
            console.error("Failed to read persistence file, resetting state.", e);
        }
    }

    // FIX: Add the new incoming points to our running total instead of overwriting it
    const totalPoints = parseFloat((lastPostData.total_points + incomingPoints).toFixed(2)); 
    
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (totalPoints >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = Math.min(currentLevel + 1, MAX_LEVEL);
    const pointsNeeded = parseFloat(Math.max(0, LEVEL_DATA[nextLvl].points - totalPoints).toFixed(2));
    
    let fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet!";
    
    let content = `⭐ **SQUISH PASS UPDATE!**\n**Total Points:** ${totalPoints} | **Current Level:** ${currentLevel}\n\n` +
                  `**Rewards Unlocked:**\n${fullUnlockedList}\n\n` +
                  `🎯 **Next Milestone:** ${pointsNeeded} points for **Level ${nextLvl}**\n` +
                  `💖 **Support the stream to unlock the next milestone!**`;

    const finalImagePath = await generateBoardImage(currentLevel);

    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), 'board.jpg');
    formData.append('payload_json', JSON.stringify({ content: content, attachments: [{ id: 0, filename: 'board.jpg' }] }));

    const url = lastPostData.message_id 
        ? `${process.env.DISCORD_WEBHOOK_URL}/messages/${lastPostData.message_id}?wait=true&thread_id=${THREAD_ID}`
        : `${process.env.DISCORD_WEBHOOK_URL}?wait=true&thread_id=${THREAD_ID}`;

    const res = await fetch(url, { method: lastPostData.message_id ? 'PATCH' : 'POST', body: formData });
    const data = await res.json();
    
    // Save the combined total back down to the file
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({
        message_id: lastPostData.message_id || data.id,
        total_points: totalPoints
    }, null, 2));
}

main();
