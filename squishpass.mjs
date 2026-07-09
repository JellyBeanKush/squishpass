import fs from 'fs';
import sharp from 'sharp';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 21; 
const BASE_IMAGE = './images/base_board.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';

// --- YOUR COORDINATES ---
const CURVE_DEFINITIONS = {
    "TURN_1": "M 2301 385 Q 2501 585, 2305 845",
    "TURN_2": "M 453 845 Q 249 1065, 453 1309"
};

const LAYOUT_COORDINATES = {
    ROW_Y: { 1: 385, 2: 845, 3: 1305 },
    X_START: 180,
    X_END: 2570
};

const LEVEL_DATA = {
    0: { points: 0 }, 1: { points: 1 }, 2: { points: 5 }, 3: { points: 10 }, 4: { points: 20 },
    5: { points: 35 }, 6: { points: 55 }, 7: { points: 80 }, 8: { points: 110 }, 9: { points: 140 },
    10: { points: 175 }, 11: { points: 210 }, 12: { points: 250 }, 13: { points: 290 }, 14: { points: 330 },
    15: { points: 370 }, 16: { points: 415 }, 17: { points: 460 }, 18: { points: 510 }, 19: { points: 560 },
    20: { points: 610 }, 21: { points: 666 }
};

async function generateBoardImage(currentLevel) {
    const { ROW_Y, X_START, X_END } = LAYOUT_COORDINATES;
    let svgParts = [];
    
    // --- PATH GENERATION LOGIC ---
    // Row 1
    if (currentLevel >= 1) {
        let r1End = currentLevel >= 7 ? 2301 : X_START + ((currentLevel / 7) * (2301 - X_START));
        svgParts.push(`<line x1="${X_START}" y1="${ROW_Y[1]}" x2="${r1End}" y2="${ROW_Y[1]}" />`);
    }

    // Turn 1
    if (currentLevel >= 8) {
        svgParts.push(`<path d="${CURVE_DEFINITIONS.TURN_1}" />`);
    }

    // Row 2
    if (currentLevel >= 9) {
        let r2End = currentLevel >= 14 ? 453 : 2305 - (((currentLevel - 8) / 6) * (2305 - 453));
        svgParts.push(`<line x1="2305" y1="${ROW_Y[2]}" x2="${r2End}" y2="${ROW_Y[2]}" />`);
    }

    // Turn 2
    if (currentLevel >= 15) {
        svgParts.push(`<path d="${CURVE_DEFINITIONS.TURN_2}" />`);
    }

    // Row 3
    if (currentLevel >= 16) {
        let r3End = currentLevel >= 21 ? X_END : 453 + (((currentLevel - 15) / 6) * (X_END - 453));
        svgParts.push(`<line x1="453" y1="${ROW_Y[3]}" x2="${r3End}" y2="${ROW_Y[3]}" />`);
    }

    // --- BIG GLOW STYLING ---
    const coreLineWidth = "24";     
    const glowLineWidth = "60";     // Thick glow
    const glowColor = "#00ffff";    

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
            <g fill="none" stroke="${glowColor}" stroke-width="${glowLineWidth}" stroke-linecap="round" filter="url(#neon-blur)" opacity="0.9">
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

// ... (main function remains the same) ...
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
        .map(([lvl, data]) => `✅ Level ${lvl}: Unlocked`)
        .join("\n") || "None yet!";
    
    let content = `⭐ **SQUISH PASS UPDATE!**\n**Total Points:** ${totalPoints} | **Current Level:** ${currentLevel}\n\n` +
                  `**Rewards Unlocked:**\n${fullUnlockedList}\n\n` +
                  `🎯 **Next Milestone:** ${pointsNeeded} points to unlock next reward!\n` +
                  `💖 **Support the stream to unlock the next milestone!**`;

    const finalImagePath = await generateBoardImage(currentLevel);

    const parsedSecret = new URL(process.env.DISCORD_WEBHOOK_URL.trim());
    const pathParts = parsedSecret.pathname.split('/').filter(Boolean);
    const baseWebhookEndpoint = `${parsedSecret.origin}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`;
    
    let finalUrl = lastPostData.message_id ? 
        new URL(`${baseWebhookEndpoint}/messages/${lastPostData.message_id}`) : 
        new URL(baseWebhookEndpoint);
    
    finalUrl.searchParams.set('thread_id', THREAD_ID);
    
    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), 'board.jpg');
    formData.append('payload_json', JSON.stringify({ 
        content: content, 
        attachments: [{ id: 0, filename: 'board.jpg' }] 
    }));

    let res = await fetch(finalUrl.toString(), { 
        method: lastPostData.message_id ? 'PATCH' : 'POST', 
        body: formData 
    });
    
    const responseText = await res.text();
    if (!res.ok) {
        console.error(`Discord API Error! Status: ${res.status}.`);
        return;
    }
    
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({
        message_id: lastPostData.message_id || (responseText ? JSON.parse(responseText).id : null),
        total_points: totalPoints,
        current_level: currentLevel,
        last_update: new Date().toISOString()
    }, null, 2));
    
    console.log("State synchronized!");
}

main();
