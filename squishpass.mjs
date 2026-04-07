import fs from 'fs';

const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 30;

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "Contribute to unlock Level 1!" },
    1: { points: 1, reward: "Lit Club", description: "Our monthly Book Club! Join the deep dives and discussions over in the Discord." },
    2: { points: 5, reward: "+5 Hours", description: "Adding 5 hours to the monthly bonus stream time bank!" },
    3: { points: 10, reward: "Music Madness", description: "The Songbattle.io month-long showdown! Add tracks and vote on favorites to help find the next HBS playlist hits." },
    4: { points: 15, reward: "x2 HoneyBuns", description: "The multiplier is active! Earn double HoneyBuns for the rest of the month." },
    5: { points: 22, reward: "+5 Hours", description: "Another 5 hours added to the monthly stream bank." },
    6: { points: 30, reward: "Art Pack", description: "The monthly HBS asset drop! Exclusive mobile/desktop wallpapers and custom coloring pages." },
    7: { points: 40, reward: "Tier Lists", description: "A dedicated 3-hour stream where we rank everything from snacks to games with the community." },
    8: { points: 60, reward: "+5 Hours", description: "5 more hours of bonus stream time unlocked." },
    9: { points: 80, reward: "Movie Night", description: "Grab the popcorn! 2-3 movies watched together in a special Discord hangout." },
    10: { points: 100, reward: "$25 Giveaway", description: "Milestone Prize! Choose $25 Cash/PayPal, Gift Cards, V-Bucks, a 6-month sub, or Merch credit." },
    11: { points: 120, reward: "+5 Hours", description: "Expanding the monthly schedule with 5 more bonus hours." },
    12: { points: 140, reward: "x3 HoneyBuns", description: "Triple the gains! The x3 multiplier is now active." },
    13: { points: 165, reward: "Arts 'n Crafts", description: "Time to get creative! A special stream where we tackle a DIY project, painting, or crafting live." },
    14: { points: 190, reward: "+5 Hours", description: "5 more hours added to the time bank." },
    15: { points: 215, reward: "Karaoke", description: "Warm up the vocal cords! A singular special vocal/karaoke stream event for the month." },
    16: { points: 240, reward: "Tabletop Games", description: "Unplugged and live! We’ll be playing various tabletop games, puzzles, or card games on stream." },
    17: { points: 265, reward: "+5 Hours", description: "5 more hours added to the stream bank." },
    18: { points: 290, reward: "x4 HoneyBuns", description: "Quadruple HoneyBuns! The multiplier is getting serious." },
    19: { points: 315, reward: "+5 Hours", description: "Another 5-hour boost to the monthly schedule." },
    20: { points: 345, reward: "$25 Giveaway", description: "Level 20 Milestone! $25 value in Cash, V-Bucks, Subs, or Merch." },
    21: { points: 375, reward: "+5 Hours", description: "5 more bonus hours unlocked for the month." },
    22: { points: 405, reward: "Cooking Stream", description: "HoneyBear and JellyBean tackle a fancy 3+ course meal live in the kitchen!" },
    23: { points: 435, reward: "Park 'n Picnic", description: "We're going outside! An IRL nature stream featuring a hike and a picnic." },
    24: { points: 465, reward: "Workout Stream", description: "Time to sweat! We’re going through a full exercise regimen live on stream." },
    25: { points: 495, reward: "+5 Hours", description: "Adding the final batch of 5 bonus hours to the bank." },
    26: { points: 525, reward: "Shirtless 'til Reset", description: "The ultimate commitment. Shirtless streams only until the end of the month!" },
    27: { points: 560, reward: "x5 HoneyBuns", description: "The Max Multiplier! x5 HoneyBuns for everyone until reset." },
    28: { points: 595, reward: "+5 Hours", description: "The final 5-hour push for the month's schedule." },
    29: { points: 630, reward: "Special Outfit", description: "The community choice! HoneyBear debuts the Maid Outfit (or the next unlocked look)." },
    30: { points: 666, reward: "$25 Giveaway", description: "The Final Boss Giveaway! A $25 value prize to celebrate hitting MAX LEVEL!" }
};

async function main() {
    const rawPoints = process.env.POINTS;
    const points = (rawPoints && rawPoints !== "undefined" && rawPoints !== "NaN") ? parseInt(rawPoints) : 0;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error("Missing DISCORD_WEBHOOK_URL");
        process.exit(1);
    }

    let currentLevel = 0;
    for (const [lvl, data] of Object.entries(LEVEL_DATA)) {
        if (points >= data.points) currentLevel = parseInt(lvl);
    }

    const nextLvl = currentLevel < MAX_LEVEL ? currentLevel + 1 : MAX_LEVEL;
    const pointsNeeded = Math.max(0, LEVEL_DATA[nextLvl].points - points);

    // This now builds the full list of everything unlocked so far
    let fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet! Reach Level 1 to start.";

    let nextReward = LEVEL_DATA[nextLvl];
    
    let content = `⭐ **SQUISH PASS UPDATE!**\n` +
                  `Current Level: **${currentLevel}** | Points: **${points.toLocaleString()}**\n` +
                  `*Bonus hours go into the monthly Time Bank.* \n\n` +
                  `**Rewards Unlocked This Month:**\n${fullUnlockedList}\n\n` +
                  `🎯 **Goal:** **${pointsNeeded.toLocaleString()}** more points for **Level ${nextLvl}**\n` +
                  `🎁 **Next Up:** **${nextReward.reward}**\n*${nextReward.description}*\n\n` +
                  `💖 **Contribute:** Subs, Bits, Gifts, or Food!`;

    const fileName = `SP-LVL${currentLevel}.png`;
    const imagePath = `./images/${fileName}`;
    const imageBuffer = fs.readFileSync(imagePath);

    let lastData = { message_id: null };
    if (fs.existsSync(PERSISTENCE_FILE)) {
        lastData = JSON.parse(fs.readFileSync(PERSISTENCE_FILE));
    }

    const baseWebhookUrl = new URL(webhookUrl);
    const cleanPath = baseWebhookUrl.pathname.replace(/\/$/, "");
    
    let targetUrl;
    let method = 'POST';

    if (lastData.message_id && lastData.message_id.length > 5) {
        targetUrl = `${baseWebhookUrl.origin}${cleanPath}/messages/${lastData.message_id}?wait=true&thread_id=${THREAD_ID}`;
        method = 'PATCH';
    } else {
        targetUrl = `${baseWebhookUrl.origin}${cleanPath}?wait=true&thread_id=${THREAD_ID}`;
        method = 'POST';
    }

    const formData = new FormData();
    const payload = {
        content: content,
        attachments: [{ id: 0, filename: fileName }]
    };

    formData.append('payload_json', JSON.stringify(payload));
    formData.append('files[0]', new Blob([imageBuffer]), fileName);

    try {
        console.log(`Sending ${method} request...`);
        let response = await fetch(targetUrl, { method, body: formData });

        if (!response.ok && method === 'PATCH') {
            method = 'POST';
            const postUrl = `${baseWebhookUrl.origin}${cleanPath}?wait=true&thread_id=${THREAD_ID}`;
            response = await fetch(postUrl, { method: 'POST', body: formData });
        }

        const result = await response.json();
        if (result.id) {
            fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({ message_id: result.id }, null, 2));
            console.log(`Success! Updated message ID ${result.id}.`);
        }
    } catch (err) {
        console.error("Critical error:", err);
    }
}

main();
