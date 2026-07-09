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

// --- AUTOMATED STRIKE-THROUGH (LOCKED) TRACKER GENERATOR ---
async function generateBoardImage(currentLevel) {
    // 🎯 Pinpoint vertical centers of the text tracks
    const rowY = {
        1: 385, 
        2: 845, 
        3: 1305 
    };
    
    const startX = 180;  
    const endX = 2570;   
    const totalRowWidth = endX - startX;

    let svgParts = [];
    
    // --- ROW 1 (Levels 1-7, Left to Right) ---
    if (currentLevel < 7) {
        let r1Start = currentLevel === 0 ? startX : startX + ((currentLevel / 7) * totalRowWidth);
        svgParts.push(`<line x1="${r1Start}" y1="${rowY[1]}" x2="${endX}" y2="${rowY[1]}" />`);
    }

    // --- CURVE 1 (Row 1 to Row 2 connection at the right edge) ---
    // 🛠️ Control points targeted directly at corner tile centers to guide the sweep cleanly inside the tracks
    if (currentLevel < 8) {
        svgParts.push(`<path d="M ${endX} ${rowY[1]} C ${endX} ${rowY[1]}, ${endX} ${rowY[2]}, ${endX} ${rowY[2]}" />`);
    }

    // --- ROW 2 (Levels 8-14, Right to Left) ---
    if (currentLevel < 14) {
        let r2Start = currentLevel <= 7 ? endX : endX - (((currentLevel - 7) / 7) * totalRowWidth);
        svgParts.push(`<line x1="${r2Start}" y1="${rowY[2]}" x2="${startX}" y2="${rowY[2]}" />`);
    }

    // --- CURVE 2 (Row 2 to Row 3 connection at the left edge) ---
    // 🛠️ Control points targeted directly at corner tile centers to drop cleanly through the inner bounds
    if (currentLevel < 15) {
        svgParts.push(`<path d="M ${startX} ${rowY[2]} C ${startX} ${rowY[2]}, ${startX} ${rowY[3]}, ${startX} ${rowY[3]}" />`);
    }

    // --- ROW 3 (Levels 15-21, Left to Right) ---
    if (currentLevel < 21) {
        let r3Start = currentLevel <= 14 ? startX : startX + (((currentLevel - 14) / 7) * totalRowWidth);
        svgParts.push(`<line x1="${r3Start}" y1="${rowY[3]}" x2="${endX}" y2="${rowY[3]}" />`);
    }

    // 🎨 Layout Styling Setup
    const coreLineWidth = "24";     // Thicker, bolder strike-through bar
    const glowLineWidth = "44";     // Ultra-wide footprint underneath for the aura effect
    const glowColor = "#00ffff";    // Bright Neon Cyan glow (Matches the layout accents)

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

    // --- PARSE WEBHOOK URL CLEANLY ---
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

    // --- PREPARE MULTIPART FORM DATA PAYLOAD ---
    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), 'board.jpg');
    formData.append('payload_json', JSON.stringify({ 
        content: content, 
        attachments: [{ id: 0, filename: 'board.jpg' }] 
    }));

    // --- CORRECTLY ROUTE POST VS PATCH PAYLOADS ---
    let res;
    if (lastPostData.message_id) {
        console.log("Sending PATCH request with text and updated tracking image...");
        res = await fetch(url, {
            method: 'PATCH',
            body: formData
        });
    } else {
        console.log("Sending POST request with new image attachment layout...");
        res = await fetch(url, { 
            method: 'POST', 
            body: formData 
        });
    }
    
    console.log(`Discord Response Status: ${res.status} ${res.statusText}`);
    
    const responseText = await res.text();
    console.log(`Raw Discord Response: ${responseText}`);

    let data;
    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Discord response as JSON.");
        }
    }

    if (!res.ok) {
        console.error(`Discord API Error! Status: ${res.status}.`);
        return;
    }
    
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({
        message_id: lastPostData.message_id || (data ? data.id : null),
        total_points: totalPoints,
        current_level: currentLevel,
        points_needed: pointsNeeded,
        image_name: "board.jpg",
        last_update: new Date().toISOString()
    }, null, 2));
    
    console.log("State successfully synchronized with Discord and saved!");
}

main();
