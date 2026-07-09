import fs from 'fs';
import sharp from 'sharp';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 21; 
const BASE_IMAGE = './images/base_board.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';

// --- COORDINATE SETUP ---
const CURVE_DEFINITIONS = {
    "TURN_1": "M 2301 385 Q 2501 585, 2305 845",
    "TURN_2": "M 453 845 Q 249 1065, 453 1309"
};

const LAYOUT = {
    ROW_Y: { 1: 385, 2: 845, 3: 1305 },
    // This helper explicitly calculates the start position for a row based on the level
    getStartPos: (lvl) => {
        if (lvl <= 7) return 180 + ((lvl - 1) * ((2301 - 180) / 7));
        if (lvl <= 14) return 2305 - ((lvl - 8) * ((2305 - 453) / 7));
        return 453 + ((lvl - 15) * ((2570 - 453) / 7));
    }
};

const LEVEL_DATA = {
    0: { points: 0 }, 1: { points: 1 }, 2: { points: 5 }, 3: { points: 10 }, 4: { points: 20 },
    5: { points: 35 }, 6: { points: 55 }, 7: { points: 80 }, 8: { points: 110 }, 9: { points: 140 },
    10: { points: 175 }, 11: { points: 210 }, 12: { points: 250 }, 13: { points: 290 }, 14: { points: 330 },
    15: { points: 370 }, 16: { points: 415 }, 17: { points: 460 }, 18: { points: 510 }, 19: { points: 560 },
    20: { points: 610 }, 21: { points: 666 }
};

// --- IMAGE GENERATION ---
async function generateBoardImage(currentLevel) {
    let svgParts = [];
    
    // Logic: Start line from the NEXT level (locked) up to level 21
    const lockedStart = currentLevel + 1;

    // --- Row 1 Logic ---
    if (lockedStart <= 7) {
        const xStart = (lockedStart <= 1) ? 180 : LAYOUT.getStartPos(lockedStart);
        svgParts.push(`<line x1="${xStart}" y1="${LAYOUT.ROW_Y[1]}" x2="2301" y2="${LAYOUT.ROW_Y[1]}" />`);
    }

    // --- Turn 1 Logic ---
    if (lockedStart <= 8) {
        svgParts.push(`<path d="${CURVE_DEFINITIONS.TURN_1}" />`);
    }

    // --- Row 2 Logic ---
    if (lockedStart <= 14) {
        const xStart = (lockedStart <= 8) ? 2305 : LAYOUT.getStartPos(lockedStart);
        svgParts.push(`<line x1="${xStart}" y1="${LAYOUT.ROW_Y[2]}" x2="453" y2="${LAYOUT.ROW_Y[2]}" />`);
    }

    // --- Turn 2 Logic ---
    if (lockedStart <= 15) {
        svgParts.push(`<path d="${CURVE_DEFINITIONS.TURN_2}" />`);
    }

    // --- Row 3 Logic ---
    if (lockedStart <= 21) {
        const xStart = (lockedStart <= 15) ? 453 : LAYOUT.getStartPos(lockedStart);
        svgParts.push(`<line x1="${xStart}" y1="${LAYOUT.ROW_Y[3]}" x2="2570" y2="${LAYOUT.ROW_Y[3]}" />`);
    }

    // --- RENDER WITH BIG GLOW ---
    const svgOverlay = Buffer.from(`
        <svg width="2752" height="1536" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="neon-blur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="20" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g fill="none" stroke="#00ffff" stroke-width="60" stroke-linecap="round" filter="url(#neon-blur)" opacity="0.9">
                ${svgParts.join('\n')}
            </g>
            <g fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round">
                ${svgParts.join('\n')}
            </g>
        </svg>
    `);

    await sharp(BASE_IMAGE)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .toFile(OUTPUT_IMAGE);

    return OUTPUT_IMAGE;
}

// --- MAIN BOT LOGIC ---
async function main() {
    // 1. Get incoming points
    const incomingPoints = parseFloat(process.env.POINTS || 0);
    
    // 2. Load previous state
    let lastPostData = { message_id: null, total_points: 0 };
    if (fs.existsSync(PERSISTENCE_FILE)) {
        try {
            lastPostData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
        } catch (e) {
            console.error("Persistence file corrupted, resetting...");
        }
    }

    // 3. Calculate new totals
    const totalPoints = parseFloat((lastPostData.total_points + incomingPoints).toFixed(2)); 
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (totalPoints >= data.points) currentLevel = parseInt(lvl);
    }

    // 4. Generate Image
    const finalImagePath = await generateBoardImage(currentLevel);
    
    // 5. Build Content
    const nextLvl = Math.min(currentLevel + 1, MAX_LEVEL);
    const pointsNeeded = parseFloat(Math.max(0, LEVEL_DATA[nextLvl].points - totalPoints).toFixed(2));
    const content = `⭐ **SQUISH PASS UPDATE!**\n**Total Points:** ${totalPoints} | **Level:** ${currentLevel}\n\n` +
                    `🎯 **Next:** ${pointsNeeded} points to unlock next reward!`;

    // 6. Post to Discord
    const parsedSecret = new URL(process.env.DISCORD_WEBHOOK_URL.trim());
    const baseWebhookEndpoint = `${parsedSecret.origin}${parsedSecret.pathname}`;
    let finalUrl = lastPostData.message_id ? `${baseWebhookEndpoint}/messages/${lastPostData.message_id}` : baseWebhookEndpoint;
    
    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), 'board.jpg');
    formData.append('payload_json', JSON.stringify({ content: content, attachments: [{ id: 0, filename: 'board.jpg' }] }));

    const res = await fetch(`${finalUrl}?thread_id=${THREAD_ID}`, { 
        method: lastPostData.message_id ? 'PATCH' : 'POST', 
        body: formData 
    });
    
    const responseText = await res.text();
    if (res.ok) {
        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({
            message_id: lastPostData.message_id || (responseText ? JSON.parse(responseText).id : null),
            total_points: totalPoints,
            current_level: currentLevel
        }, null, 2));
        console.log("Success: State saved and board updated.");
    } else {
        console.error("Discord Error:", responseText);
    }
}

main();
