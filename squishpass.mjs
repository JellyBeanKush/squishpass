import fs from 'fs';
import sharp from 'sharp';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 21; 
const BASE_IMAGE = './images/base_board.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';

// --- YOU CAN MANUALLY DEFINE CURVES HERE ---
// Format: M [start] Q [middle/control_point] [end]
const CURVE_DEFINITIONS = {
    "TURN_1": "M 2301 385 Q 2501 585, 2305 845", // Custom path for the first turn
    "TURN_2": "M 453 845 Q 249 1065, 453 1309"   // You can add your next turn coordinates here
};

const LAYOUT_COORDINATES = {
    ROW_Y: { 1: 385, 2: 845, 3: 1305 },
    X_START: 180,
    X_END: 2570
};

// ... (LEVEL_DATA remains the same as previous) ...
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

// --- AUTOMATED STRIKE-THROUGH (LOCKED) TRACKER GENERATOR ---
async function generateBoardImage(currentLevel) {
    const { ROW_Y, X_START, X_END } = LAYOUT_COORDINATES;
    const totalRowWidth = X_END - X_START;

    let svgParts = [];
    
    // --- ROW 1 ---
    if (currentLevel < 7) {
        let r1End = currentLevel === 0 ? X_START : X_START + ((currentLevel / 7) * totalRowWidth);
        svgParts.push(`<line x1="${X_START}" y1="${ROW_Y[1]}" x2="${r1End}" y2="${ROW_Y[1]}" />`);
    }

    // --- CURVE 1 (Uses your custom coordinates) ---
    if (currentLevel >= 7) {
        svgParts.push(`<line x1="${X_START}" y1="${ROW_Y[1]}" x2="2301" y2="385" />`);
        svgParts.push(`<path d="${CURVE_DEFINITIONS.TURN_1}" />`);
    }

    // --- ROW 2 ---
    if (currentLevel >= 8 && currentLevel < 14) {
        let r2Current = 2305 - (((currentLevel - 8) / 6) * (2305 - X_START));
        svgParts.push(`<line x1="2305" y1="${ROW_Y[2]}" x2="${r2Current}" y2="${ROW_Y[2]}" />`);
    } else if (currentLevel >= 14) {
        svgParts.push(`<line x1="2305" y1="${ROW_Y[2]}" x2="${X_START}" y2="${ROW_Y[2]}" />`);
    }

    // --- CURVE 2 (Left Turn) ---
    if (currentLevel >= 14) {
        svgParts.push(`<path d="${CURVE_DEFINITIONS.TURN_2}" />`);
    }

    // --- ROW 3 ---
    if (currentLevel >= 15) {
        let r3Current = currentLevel >= 21 ? X_END : X_START + (((currentLevel - 15) / 6) * (X_END - X_START));
        svgParts.push(`<line x1="${X_START}" y1="${ROW_Y[3]}" x2="${r3Current}" y2="${ROW_Y[3]}" />`);
    }

    const coreLineWidth = "24";     
    const glowLineWidth = "44";     
    const glowColor = "#00ffff";    

    const svgOverlay = Buffer.from(`
        <svg width="2752" height="1536" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="neon-blur" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="10" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g fill="none" stroke="${glowColor}" stroke-width="${glowLineWidth}" stroke-linecap="round" filter="url(#neon-blur)" opacity="0.85">
                ${svgParts.join('\n')}
            </g>
            <g fill="none" stroke="#ffffff" stroke-width="${coreLineWidth}" stroke-linecap="round">
                ${svgParts.join('\n')}
            </g>
        </svg>
    `);

    await sharp(BASE_IMAGE)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .toFile(OUTPUT_IMAGE);

    return OUTPUT_IMAGE;
}

// ... (main function stays the same) ...
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
                  `🎯 **Next Milestone:** ${pointsNeeded} points to unlock **${LEVEL_DATA[nextLvl].reward}**\n` +
                  `💖 **Support the stream to unlock the next milestone!**`;

    const finalImagePath = await generateBoardImage(currentLevel);

    const parsedSecret = new URL(process.env.DISCORD_WEBHOOK_URL.trim());
    const pathParts = parsedSecret.pathname.split('/').filter(Boolean);
    const baseWebhookEndpoint = `${parsedSecret.origin}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`;
    
    let finalUrl;
    if (lastPostData.message_id) {
        finalUrl = new URL(`${baseWebhookEndpoint}/messages/${lastPostData.message_id}`);
    } else {
        finalUrl = new URL(baseWebhookEndpoint);
    }
    
    finalUrl.searchParams.set('thread_id', THREAD_ID);
    const url = finalUrl.toString();

    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), 'board.jpg');
    formData.append('payload_json', JSON.stringify({ 
        content: content, 
        attachments: [{ id: 0, filename: 'board.jpg' }] 
    }));

    let res;
    if (lastPostData.message_id) {
        res = await fetch(url, { method: 'PATCH', body: formData });
    } else {
        res = await fetch(url, { method: 'POST', body: formData });
    }
    
    const responseText = await res.text();
    if (!res.ok) {
        console.error(`Discord API Error! Status: ${res.status}.`);
        return;
    }
    
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({
        message_id: lastPostData.message_id || (responseText ? JSON.parse(responseText).id : null),
        total_points: totalPoints,
        current_level: currentLevel,
        points_needed: pointsNeeded,
        image_name: "board.jpg",
        last_update: new Date().toISOString()
    }, null, 2));
    
    console.log("State successfully synchronized with Discord and saved!");
}

main();
