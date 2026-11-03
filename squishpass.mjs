import fs from 'fs';
import sharp from 'sharp';

// =============================================================================
// --- CONFIGURATION AND ENVIRONMENT SETTINGS ---
// =============================================================================
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const BACKGROUND_IMAGE = './images/background.jpg'; 
const BASE_BOARD = './images/base_board.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';

// =============================================================================
// --- LEVEL DATA DEFINITION ---
// 21-Level Board: Right-to-Left on Every Row (ROYGBIV Sequence)
// =============================================================================
const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins!" },
    // Row 1 (Top): Right to Left
    1: { points: 1, reward: "MUSIC MADNESS", description: "Music tournament stream!" },
    2: { points: 5, reward: "X3 HONEY BUNS", description: "Triple points active!" },
    3: { points: 10, reward: "+5 HOURS", description: "5 extra hours added." },
    4: { points: 20, reward: "$10 GIVE AWAY", description: "Community giveaway!" },
    5: { points: 30, reward: "ARTS & CRAFTS", description: "Creative crafting stream!" },
    6: { points: 45, reward: "X2 SQUISH POINTS", description: "Double squish points boost!" },
    7: { points: 60, reward: "DRAG AND DRINKS", description: "Drag stream & drink mixing!" },
    // Row 2 (Middle): Right to Left
    8: { points: 80, reward: "MOVIE MARATHON", description: "Movie watch party unlocked!" },
    9: { points: 100, reward: "X5 HONEY BUNS", description: "5X points active!" },
    10: { points: 125, reward: "+10 HOURS", description: "10 extra hours added." },
    11: { points: 150, reward: "$20 GIVE AWAY", description: "Mid-pass cash drop!" },
    12: { points: 180, reward: "BEAR VS BEAN", description: "Head-to-head showdown!" },
    13: { points: 210, reward: "X3 SQUISH POINTS", description: "Triple squish points boost!" },
    14: { points: 240, reward: "COOKING AFTER DARK", description: "Late-night cooking stream!" },
    // Row 3 (Bottom): Right to Left
    15: { points: 275, reward: "KARAOKE PARTY", description: "Live singing stream!" },
    16: { points: 310, reward: "X10 HONEY BUNS", description: "Massive multiplier active!" },
    17: { points: 345, reward: "+20 HOURS", description: "Huge time bank deposit." },
    18: { points: 380, reward: "$30 GIVE AWAY", description: "Late-stage cash giveaway!" },
    19: { points: 420, reward: "WORK OUT SESH", description: "Fitness session!" },
    20: { points: 460, reward: "X5 SQUISH POINTS", description: "Max squish points boost!" },
    21: { points: 500, reward: "SHIRTLESS STREAMS", description: "The ultimate reward reached!" }
};

// =============================================================================
// --- UPDATED IMAGE GENERATOR WITH ADJUSTED OVERLAY OPACITY ---
// =============================================================================
async function generateBoardImage(currentLevel) {
    const level = Math.min(Math.max(currentLevel, 0), 21);
    const overlayPath = `./images/sp ${level}.png`;

    console.log("Attempting to overlay:", overlayPath);

    // Verify files exist
    if (!fs.existsSync(BACKGROUND_IMAGE) || !fs.existsSync(BASE_BOARD) || !fs.existsSync(overlayPath)) {
        console.error("CRITICAL: One or more image assets are missing in ./images/");
    }

    try {
        await sharp(BACKGROUND_IMAGE)
            .composite([
                { input: BASE_BOARD, top: 0, left: 0, blend: 'over' },
                { input: overlayPath, top: 0, left: 0, blend: 'over', opacity: 0.75 }
            ])
            .toFile(OUTPUT_IMAGE);
        
        console.log("Successfully created composite board with adjusted overlay opacity for level:", level);
    } catch (err) {
        console.error("Sharp composite error:", err);
    }

    return OUTPUT_IMAGE;
}

// =============================================================================
// --- DATA PERSISTENCE HELPERS ---
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
                points_needed: pointsNeeded,
                next_reward: LEVEL_DATA[nextLvl].reward,
                image_name: `sp ${currentLevel}.png`,
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
