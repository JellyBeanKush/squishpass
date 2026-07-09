import fs from 'fs';
import sharp from 'sharp';

// --- CONFIGURATION ---
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const BASE_IMAGE = './images/base_board.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';

// Define the board as a single continuous path
// Format: { type: 'line' | 'curve', to: [x, y], control: [x, y] (for curves) }
const PATH_SEQUENCE = [
    { type: 'start', x: 180, y: 385 }, // Level 0
    { type: 'line', x: 2305, y: 385 }, // Row 1 End (Level 7)
    { type: 'curve', control: [2453, 405], to: [2501, 565] }, // Turn 1
    { type: 'line', x: 453, y: 845 },  // Row 2 End (Level 14)
    { type: 'curve', control: [249, 1065], to: [453, 1309] }, // Turn 2
    { type: 'line', x: 2570, y: 1305 } // Row 3 End (Level 21)
];

async function generateBoardImage(currentLevel) {
    let svgPathData = `M 180 385 `; // Start point
    
    // Logic: Map the level number to the progression along the path
    // We have 21 segments total across the path.
    // This loops through the path sequence and draws segments until the current level.
    
    // For this to be perfect, we append pieces as the user levels up.
    // We use a simplified approach: just draw the path based on the current level.
    
    // Let's keep it simple: Draw the lines based on the sequence
    let svgParts = [];
    
    // This is the "dot-to-dot" logic
    // We draw until the level index reached.
    // For simplicity, we define the full path and use stroke-dasharray to hide the rest 
    // OR we just build the path string incrementally. Let's build it incrementally.
    
    // Since you have a visual board, let's just draw the full path (but maybe hidden)
    // and rely on your exact requested coordinates.
    
    svgParts.push(`<path d="M 180 385 L 2305 385 Q 2453 405, 2501 565 L 453 845 Q 249 1065, 453 1309 L 2570 1305" />`);

    const svgOverlay = Buffer.from(`
        <svg width="2752" height="1536" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="neon-blur" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="15" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g fill="none" stroke="#00ffff" stroke-width="50" stroke-linecap="round" filter="url(#neon-blur)" opacity="0.8">
                ${svgParts.join('\n')}
            </g>
            <g fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-dasharray="${(currentLevel/21) * 3000} 3000">
                ${svgParts.join('\n')}
            </g>
        </svg>
    `);

    await sharp(BASE_IMAGE)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .toFile(OUTPUT_IMAGE);

    return OUTPUT_IMAGE;
}

// --- MAIN LOGIC ---
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
    
    let finalUrl = lastPostData.message_id ? new URL(`${baseWebhookEndpoint}/messages/${lastPostData.message_id}`) : new URL(baseWebhookEndpoint);
    finalUrl.searchParams.set('thread_id', THREAD_ID);
    
    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), 'board.jpg');
    formData.append('payload_json', JSON.stringify({ 
        content: content, 
        attachments: [{ id: 0, filename: 'board.jpg' }] 
    }));

    const res = await fetch(finalUrl.toString(), { 
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
