import fs from 'fs';
import sharp from 'sharp';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 21; 
const BASE_IMAGE = './images/base_board.png'; 
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

// --- AUTOMATED UNDERLINE TRACKER GENERATOR ---
async function generateBoardImage(currentLevel) {
    const rowY = {
        1: 525,
        2: 985,
        3: 1445
    };
    
    const startX = 180;  
    const endX = 2570;   
    const totalRowWidth = endX - startX;

    let svgParts = [];
    let remainingLevels = currentLevel;
    
    // --- ROW 1 ---
    let row1Progress = Math.min(remainingLevels, 7);
    let r1X2 = startX + ((row1Progress / 7) * totalRowWidth);
    
    if (row1Progress > 0) {
        svgParts.push(`<line x1="${startX}" y1="${rowY[1]}" x2="${r1X2}" y2="${rowY[1]}" stroke="#00ffff" stroke-width="20" stroke-linecap="round" />`);
    }
    remainingLevels -= row1Progress;

    // --- ROW 2 ---
    if (remainingLevels > 0) {
        let row2Progress = Math.min(remainingLevels, 7);
        let r2X2 = endX - ((row2Progress / 7) * totalRowWidth);
        
        svgParts.push(`<path d="M ${endX} ${rowY[1]} C ${endX + 200} ${rowY[1]}, ${endX + 200} ${rowY[2]}, ${endX} ${rowY[2]}" fill="none" stroke="#00ffff" stroke-width="20" />`);
        svgParts.push(`<line x1="${endX}" y1="${rowY[2]}" x2="${r2X2}" y2="${rowY[2]}" stroke="#00ffff" stroke-width="20" stroke-linecap="round" />`);
        remainingLevels -= row2Progress;
    }

    // --- ROW 3 ---
    if (remainingLevels > 0) {
        let row3Progress = Math.min(remainingLevels, 7);
        let r3X2 = startX + ((row3Progress / 7) * totalRowWidth);
        
        svgParts.push(`<path d="M ${startX} ${rowY[2]} C ${startX - 200} ${rowY[2]}, ${startX - 200} ${rowY[3]}, ${startX} ${rowY[3]}" fill="none" stroke="#00ffff" stroke-width="20" />`);
        svgParts.push(`<line x1="${startX}" y1="${rowY[3]}" x2="${r3X2}" y2="${rowY[3]}" stroke="#00ffff" stroke-width="20" stroke-linecap="round" />`);
    }

    const svgOverlay = Buffer.from(`
        <svg width="2752" height="1536" xmlns="http://www.w3.org/2000/svg">
            ${svgParts.join('\n')}
        </svg>
    `);

    await sharp(BASE_IMAGE)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .toFile(OUTPUT_IMAGE);

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
    
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({
        message_id: lastPostData.message_id || data.id,
        total_points: totalPoints,
        current_level: currentLevel,
        points_needed: pointsNeeded,
        next_reward: LEVEL_DATA[nextLvl].reward,
        image_name: "board.jpg",
        last_update: new Date().toISOString()
    }, null, 2));
}

main();
