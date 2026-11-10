import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// --- CONFIGURATION AND ENVIRONMENT SETTINGS ---
// =============================================================================
const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const BACKGROUND_IMAGE = './images/background.jpg'; 
const BASE_BOARD = './images/base_board.png'; 
const OUTPUT_IMAGE = './images/final_discord_board.jpg';
const PORT = process.env.PORT || 3000;

// =============================================================================
// --- LEVEL DATA DEFINITION ---
// 21-Level Board: 700-Point Max Cap, Left-to-Right
// =============================================================================
const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins!" },
    1: { points: 5, reward: "MUSIC MADNESS", description: "Music tournament stream!" },
    2: { points: 10, reward: "X3 HONEY BUNS", description: "Triple points active!" },
    3: { points: 20, reward: "+5 HOURS", description: "5 extra hours added." },
    4: { points: 30, reward: "$10 GIVE AWAY", description: "Community giveaway!" },
    5: { points: 45, reward: "ARTS & CRAFTS", description: "Creative crafting stream!" },
    6: { points: 69, reward: "X2 SQUISH POINTS", description: "Double squish points boost!" },
    7: { points: 95, reward: "DRAG AND DRINKS", description: "Drag stream & drink mixing!" },
    8: { points: 125, reward: "MOVIE MARATHON", description: "Movie watch party unlocked!" },
    9: { points: 155, reward: "X5 HONEY BUNS", description: "5X points active!" },
    10: { points: 185, reward: "+10 HOURS", description: "10 extra hours added." },
    11: { points: 215, reward: "$20 GIVE AWAY", description: "Mid-pass cash drop!" },
    12: { points: 250, reward: "BEAR VS BEAN", description: "Head-to-head showdown!" },
    13: { points: 285, reward: "X3 SQUISH POINTS", description: "Triple squish points boost!" },
    14: { points: 325, reward: "COOKING AFTER DARK", description: "Late-night cooking stream!" },
    15: { points: 370, reward: "KARAOKE PARTY", description: "Live singing stream!" },
    16: { points: 420, reward: "X10 HONEY BUNS", description: "Massive multiplier active!" },
    17: { points: 470, reward: "+20 HOURS", description: "Huge time bank deposit." },
    18: { points: 525, reward: "$30 GIVE AWAY", description: "Late-stage cash giveaway!" },
    19: { points: 580, reward: "WORK OUT SESH", description: "Fitness session!" },
    20: { points: 640, reward: "X5 SQUISH POINTS", description: "Max squish points boost!" },
    21: { points: 700, reward: "SHIRTLESS STREAMS", description: "The ultimate reward reached!" }
};

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
    return { message_id: null, total_points: 0, multiplier: 1 };
}

function saveCurrentState(data) {
    try {
        fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing persistent state to disk:", error);
    }
}

// Load initial state from disk
const persistentData = loadLastPostData();
let squishState = {
    totalPoints: persistentData.total_points || 0,
    multiplier: persistentData.multiplier || 1
};

// =============================================================================
// --- DISCORD SYNC ORCHESTRATION ---
// =============================================================================
async function updateAndSyncDiscord() {
    const totalPoints = squishState.totalPoints;

    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (totalPoints >= data.points) {
            currentLevel = parseInt(lvl);
        }
    }

    const nextLvl = Math.min(currentLevel + 1, 21);
    const pointsNeeded = parseFloat(Math.max(0, LEVEL_DATA[nextLvl].points - totalPoints).toFixed(2));
    
    const fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet!";
    
    const content = `⭐ **SQUISH PASS UPDATE!**\n` +
                    `**Total Points:** ${totalPoints} | **Current Level:** ${currentLevel} | **Multiplier:** ${squishState.multiplier}x\n\n` +
                    `**Rewards Unlocked:**\n${fullUnlockedList}\n\n` +
                    `🎯 **Next Milestone:** ${pointsNeeded} points to unlock **${LEVEL_DATA[nextLvl].reward}**\n` +
                    `💖 **Support the stream to unlock the next milestone!**`;

    const finalImagePath = await generatorBoardImageInternal(currentLevel);
    const lastPostData = loadLastPostData();

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
    
    const uniqueAttachmentName = `board_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append('files[0]', new Blob([fs.readFileSync(finalImagePath)]), uniqueAttachmentName);
    formData.append('payload_json', JSON.stringify({ 
        content: content, 
        attachments: [{ id: 0, filename: uniqueAttachmentName }] 
    }));

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
                multiplier: squishState.multiplier,
                last_update: new Date().toISOString()
            });
            console.log("Successfully synched to Discord with fresh image generation.");
        } else {
            console.error("Discord API returned error:", responseText);
        }
    } catch (err) {
        console.error("Failed to complete Discord transmission:", err);
    }
}

async function generatorBoardImageInternal(currentLevel) {
    const level = Math.min(Math.max(currentLevel, 0), 21);
    const overlayPath = `./images/sp ${level}.png`;

    if (!fs.existsSync('./images')) fs.mkdirSync('./images', { recursive: true });
    if (!fs.existsSync(BACKGROUND_IMAGE)) throw new Error(`Missing background image: ${BACKGROUND_IMAGE}`);
    if (!fs.existsSync(BASE_BOARD)) throw new Error(`Missing base board image: ${BASE_BOARD}`);
    if (!fs.existsSync(overlayPath)) throw new Error(`Missing level overlay image: ${overlayPath}`);

    await sharp(BACKGROUND_IMAGE)
        .composite([
            { input: BASE_BOARD, top: 0, left: 0, blend: 'over' },
            { input: overlayPath, top: 0, left: 0, blend: 'over', opacity: 0.75 }
        ])
        .toFile(OUTPUT_IMAGE);

    return OUTPUT_IMAGE;
}

// =============================================================================
// --- ENVIRONMENT EXECUTION BRANCH ---
// =============================================================================
if (process.env.CI) {
    console.log("Running in GitHub Actions CI environment. Executing sync and exiting...");
    updateAndSyncDiscord().then(() => {
        console.log("CI sync completed successfully.");
        setTimeout(() => process.exit(0), 500);
    }).catch(err => {
        console.error("CI sync failed:", err);
        process.exit(1);
    });
} else {
    // Local Stream / Mix It Up Server Setup
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });

    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    let isProcessingQueue = false;
    const eventQueue = [];

    function enqueueEvent(eventData) {
        eventQueue.push(eventData);
        processEventQueue();
    }

    async function processEventQueue() {
        if (isProcessingQueue || eventQueue.length === 0) return;
        isProcessingQueue = true;

        const event = eventQueue.shift();
        await handleEventCalculation(event);

        isProcessingQueue = false;
        processEventQueue();
    }

    async function handleEventCalculation(data) {
        let basePoints = 0;

        switch (data.type) {
            case 'BITS':
            case 'TANGIA':
            case 'BLERP':
                basePoints = parseFloat(data.amount) * 0.01;
                break;
            case 'SUB':
                basePoints = data.tier === 3 ? 15 : (data.tier === 2 ? 5 : 3);
                break;
            case 'CHANNEL_POINT':
                basePoints = parseFloat(data.amount) || 1;
                break;
            case 'RANDOM_REWARD':
                basePoints = parseFloat(data.amount) || 0;
                break;
            case 'MANUAL_DONATION':
                basePoints = parseFloat(data.amount) || 0;
                break;
            case 'SET_MULTIPLIER':
                squishState.multiplier = Number(data.amount);
                broadcastOverlayUpdate();
                saveStateToDisk();
                return;
            default:
                basePoints = parseFloat(data.amount) || 0;
        }

        let finalAddedPoints;
        if (data.type === 'RANDOM_REWARD' && basePoints < 0) {
            finalAddedPoints = basePoints; 
        } else {
            finalAddedPoints = basePoints * squishState.multiplier;
        }

        squishState.totalPoints = parseFloat(Math.max(0, squishState.totalPoints + finalAddedPoints).toFixed(2));
        
        await updateAndSyncDiscord();
        broadcastOverlayUpdate();
        saveStateToDisk();
    }

    function saveStateToDisk() {
        const lastData = loadLastPostData();
        saveCurrentState({
            ...lastData,
            total_points: squishState.totalPoints,
            multiplier: squishState.multiplier
        });
    }

    function broadcastOverlayUpdate() {
        let currentLevel = 0;
        for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
            if (squishState.totalPoints >= data.points) {
                currentLevel = parseInt(lvl);
            }
        }
        const nextLvl = Math.min(currentLevel + 1, 21);

        const payload = JSON.stringify({
            type: 'SQUISH_UPDATE',
            totalPoints: squishState.totalPoints,
            currentLevel: currentLevel,
            nextLevelTarget: LEVEL_DATA[nextLvl].points,
            rewardName: LEVEL_DATA[nextLvl].reward,
            multiplier: squishState.multiplier
        });

        wss.clients.forEach(client => {
            if (client.readyState === 1) client.send(payload);
        });
    }

    // API Endpoints
    app.post('/api/multiplier', (req, res) => {
        const { mult, amount } = req.body;
        const val = Number(mult !== undefined ? mult : amount);
        if ([1, 2, 3, 4, 5].includes(val)) {
            enqueueEvent({ type: 'SET_MULTIPLIER', amount: val });
            res.json({ success: true, multiplier: val });
        } else {
            res.status(400).json({ error: "Invalid multiplier value (must be 1-5)" });
        }
    });

    app.post('/api/donation', (req, res) => {
        const { amount, username } = req.body;
        enqueueEvent({ type: 'MANUAL_DONATION', amount, username });
        res.json({ success: true });
    });

    app.post('/api/channel-point', (req, res) => {
        const { amount, username } = req.body;
        enqueueEvent({ type: 'CHANNEL_POINT', amount: amount || 1, username });
        res.json({ success: true });
    });

    app.post('/api/random-reward', (req, res) => {
        const { amount, username } = req.body;
        enqueueEvent({ type: 'RANDOM_REWARD', amount, username });
        res.json({ success: true });
    });

    app.post('/api/event', (req, res) => {
        enqueueEvent(req.body);
        res.json({ success: true });
    });

    wss.on('connection', (ws) => {
        let currentLevel = 0;
        for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
            if (squishState.totalPoints >= data.points) currentLevel = parseInt(lvl);
        }
        const nextLvl = Math.min(currentLevel + 1, 21);
        ws.send(JSON.stringify({
            type: 'SQUISH_UPDATE',
            totalPoints: squishState.totalPoints,
            currentLevel: currentLevel,
            nextLevelTarget: LEVEL_DATA[nextLvl].points,
            rewardName: LEVEL_DATA[nextLvl].reward,
            multiplier: squishState.multiplier
        }));
    });

    server.listen(PORT, () => {
        console.log(`Unified SquishPass bot & web server running on port ${PORT}`);
    });
}
