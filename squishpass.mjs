import fs from 'fs';
import sharp from 'sharp';

// =============================================================================
// --- CONFIGURATION AND ENVIRONMENT SETTINGS ---
// =============================================================================
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const BASE_IMAGE = './images/base_board.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';

// =============================================================================
// --- LEVEL DATA DEFINITION ---
// Providing full descriptive data for each level on the board.
// =============================================================================
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

// =============================================================================
// --- IMAGE GENERATION MODULE ---
// Handles the drawing of the progress line overlay onto the base board.
// Uses a persistent path to ensure line continuity.
// --- IMAGE GENERATOR ---
async function generateBoardImage(currentLevel) {
    // 1. Define the 5-point segments for the whole board
    // We break the path into chunks: Start -> Turn 1 -> Row 2 -> Turn 2 -> Row 3
    const segments = [
    { min: 0, max: 7,  path: "M 135 385 L 2309 385" }, 
    { min: 7, max: 8,  path: "C 2309 385, 2500 475, 2400 565, 2309 845" }, // Turn 1 ends at 2309, 845
    { min: 8, max: 14, path: "L 455 845" }, // Now draws from 2309, 845 to 455, 845
    { min: 14, max: 15, path: "C 455 845, 250 1065, 350 1309, 455 1309" }, 
    { min: 15, max: 21, path: "L 2625 1309" } // Row 3 starts at 455, 1309 and ends at 2625, 1309
];

    // 2. Filter: Only include segments that are "Locked" (Current Level < Max Level)
    // If currentLevel is 21, activeSegments will be empty (no line).
    // If currentLevel is 0, all segments are included (full line).
    const activePaths = segments
        .filter(seg => currentLevel < seg.max)
        .map(seg => seg.path);

    const fullPath = activePaths.join(' ');

    // 3. Construct SVG
    // Note: We only add the path to the SVG if fullPath is not empty
    const svgOverlay = fullPath ? Buffer.from(`
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
            <path d="${fullPath}" fill="none" stroke="#00ffff" stroke-width="50" stroke-linecap="round" filter="url(#neon-blur)" opacity="0.8" />
            <path d="${fullPath}" fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" />
        </svg>
    `) : Buffer.from(`<svg width="2752" height="1536" xmlns="http://www.w3.org/2000/svg"></svg>`);

    await sharp(BASE_IMAGE)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .toFile(OUTPUT_IMAGE);

    return OUTPUT_IMAGE;
}

// =============================================================================
// --- DATA PERSISTENCE HELPERS ---
// Handles reading and writing the state of the stream's progress.
// =============================================================================
function loadLastPostData() {
    if (fs.existsSync(PERSISTENCE_FILE)) {
        try {
            const data = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error("Critical error reading persistence file. Resetting progress.", error);
        }
    }
    return { message_id: null, total_points: 0 };
}

function saveCurrentState(data) {
    try {
        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing persistent state to disk:", error);
    }
}

// =============================================================================
// --- MAIN ORCHESTRATION ---
// Coordinates the data calculation, image processing, and API transmission.
// =============================================================================
async function main() {
    console.log("Starting SquishPass update process...");

    // 1. Calculate incoming progress
    const incomingPoints = parseFloat(process.env.POINTS || 0);
    const lastPostData = loadLastPostData();
    const totalPoints = parseFloat((lastPostData.total_points + incomingPoints).toFixed(2)); 

    // 2. Determine current level based on total points
    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (totalPoints >= data.points) {
            currentLevel = parseInt(lvl);
        }
    }

    // 3. Prepare milestone information for Discord notification
    const nextLvl = Math.min(currentLevel + 1, 21);
    const pointsNeeded = parseFloat(Math.max(0, LEVEL_DATA[nextLvl].points - totalPoints).toFixed(2));
    
    const fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet!";
    
    const content = `⭐ **SQUISH PASS UPDATE!**\n` +
                    `**Total Points:** ${totalPoints} | **Current Level:** ${currentLevel}\n\n` +
                    `**Rewards Unlocked:**\n${fullUnlockedList}\n\n` +
                    `🎯 **Next Milestone:** ${pointsNeeded} points to unlock **${LEVEL_DATA[nextLvl].reward}**\n` +
                    `💖 **Support the stream to unlock the next milestone!**`;

    // 4. Generate the visual representation of the progress
    const finalImagePath = await generateBoardImage(currentLevel);

    // 5. Discord Webhook Transmission Logic
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error("Webhook URL is missing in environment variables.");
        return;
    }

    const parsedSecret = new URL(webhookUrl.trim());
    const pathParts = parsedSecret.pathname.split('/').filter(Boolean);
    const baseEndpoint = `${parsedSecret.origin}/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`;
    
    let targetUrl = lastPostData.message_id ? `${baseEndpoint}/messages/${lastPostData.message_id}` : baseEndpoint;
    const finalUrl = new URL(targetUrl);
    finalUrl.searchParams.set('thread_id', THREAD_ID);
    
    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), 'board.jpg');
    formData.append('payload_json', JSON.stringify({ 
        content: content, 
        attachments: [{ id: 0, filename: 'board.jpg' }] 
    }));

    // 6. Execute transmission
    try {
        const response = await fetch(finalUrl.toString(), { 
            method: lastPostData.message_id ? 'PATCH' : 'POST', 
            body: formData 
        });

        const responseText = await response.text();
        
        if (response.ok) {
            const data = JSON.parse(responseText);
            saveCurrentState({
                message_id: lastPostData.message_id || data.id,
                total_points: totalPoints,
                current_level: currentLevel,
                last_update: new Date().toISOString()
            });
            console.log("Successfully synched to Discord.");
        } else {
            console.error("Discord API returned error:", responseText);
        }
    } catch (err) {
        console.error("Failed to complete Discord transmission:", err);
    }
}

// Execution trigger
main().catch(err => {
    console.error("Fatal error in main script:", err);
    process.exit(1);
});

/*
    =========================================================================
    --- DOCUMENTATION AND FOOTER ---
    This script is designed to run automatically when the stream points
    receive an update. It maps user progress to the board path defined in
    the generateBoardImage function using precise quadratic curves to ensure
    smooth alignment across rows.
    =========================================================================
*/
