import fs from 'fs';

const PERSISTENCE_FILE = "last_post_data.json";
const THREAD_ID = "1476295145371467908"; 
const MAX_LEVEL = 30;

const LEVEL_DATA = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins! Help us reach Level 1 to kick off the monthly rewards." },
    1: { points: 1, reward: "Lit Club", description: "Our monthly Book Club! We pick a title and dive deep into the story, characters, and theories in the dedicated Discord channel." },
    2: { points: 5, reward: "+5 Hours", description: "The grind continues! We're adding 5 extra hours to our monthly stream bank for more hangouts." },
    3: { points: 10, reward: "Music Madness", description: "The ultimate Songbattle.io showdown. Viewers add tracks all month long, ending in a massive review stream to vote on new playlist hits." },
    4: { points: 15, reward: "x2 Multiplier", description: "The hype train is moving! Everyone earns double points for the remainder of the month." },
    5: { points: 22, reward: "+5 Hours", description: "Boosting the schedule again! Another 5 hours added to the monthly stream bank." },
    6: { points: 30, reward: "Art Pack", description: "Exclusive goodies! Unlocks a monthly drop of custom mobile/desktop wallpapers and printable coloring pages." },
    7: { points: 40, reward: "Tier Lists", description: "A dedicated 3-hour marathon stream where we rank everything from the best snacks to the worst game mechanics with chat." },
    8: { points: 60, reward: "+5 Hours", description: "Expanding the calendar! 5 more hours of bonus stream time are now in the bank." },
    9: { points: 80, reward: "Movie Night", description: "Grab the popcorn and settle in. We’re hosting a Discord hangout to watch films together." },
    10: { points: 100, reward: "$25 Giveaway", description: "The first major milestone! One lucky winner gets their choice of $25 in Cash, V-Bucks, Gift Cards, or Merch credit." },
    11: { points: 120, reward: "+5 Hours", description: "More time for activities! Adding another 5-hour block to the monthly stream schedule." },
    12: { points: 140, reward: "x3 Multiplier", description: "Triple time! The point multiplier is officially upgraded to x3." },
    13: { points: 165, reward: "Arts 'n Crafts", description: "Getting hands-on! A special stream where we tackle a DIY project, painting, or crafting live with the community." },
    14: { points: 190, reward: "+5 Hours", description: "Keeping the energy up with 5 more bonus hours added to the time bank." },
    15: { points: 215, reward: "Karaoke", description: "Mic check, 1-2! A high-energy karaoke stream where we sing our favorite tracks live." },
    16: { points: 240, reward: "Tabletop Games", description: "Unplugged fun! A dedicated night for various board games, complex puzzles, or classic card games on stream." },
    17: { points: 265, reward: "+5 Hours", description: "The schedule is growing! 5 more hours of bonus content unlocked." },
    18: { points: 290, reward: "x4 Multiplier", description: "Insane gains! Everyone is now earning x4 points until the end of the month." },
    19: { points: 315, reward: "+5 Hours", description: "Another 5-hour deposit into the monthly stream time bank." },
    20: { points: 345, reward: "$25 Giveaway", description: "Level 20 Milestone! Another chance to win a $25 prize of your choosing (Cash, Subs, or Merch)." },
    21: { points: 375, reward: "+5 Hours", description: "The final stretch! Adding 5 more bonus hours to our monthly stream bank." },
    22: { points: 405, reward: "Cooking Stream", description: "A special culinary takeover to prepare a fancy, 3+ course meal live on camera." },
    23: { points: 435, reward: "Park 'n Picnic", description: "We're going IRL! Join us for a nature stream featuring a local hike and a scenic outdoor picnic." },
    24: { points: 465, reward: "Workout Stream", description: "Breaking a sweat! We'll be going through a full exercise and fitness regimen live for the community." },
    25: { points: 495, reward: "+5 Hours", description: "Maximizing the schedule! One of the last 5-hour boosts for the month." },
    26: { points: 525, reward: "Shirtless 'til Reset", description: "The ultimate stream challenge! Once unlocked, the challenge remains active until the monthly reset." },
    27: { points: 560, reward: "x5 Multiplier", description: "MAX MULTIPLIER! Enjoy x5 points for all viewers until the end of the month." },
    28: { points: 595, reward: "+5 Hours", description: "The final 5-hour addition to the monthly stream time bank." },
    29: { points: 630, reward: "Special Outfit", description: "The community choice! A debut of a special outfit (like the Maid Outfit) chosen by you!" },
    30: { points: 666, reward: "$25 Giveaway", description: "THE FINAL BOSS! One last $25 value giveaway to celebrate hitting Max Level 30!" }
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

    let fullUnlockedList = Object.entries(LEVEL_DATA)
        .filter(([lvl]) => lvl > 0 && lvl <= currentLevel)
        .map(([lvl, data]) => `✅ Level ${lvl}: **${data.reward}**`)
        .join("\n") || "None yet! Reach Level 1 to start.";

    let nextReward = LEVEL_DATA[nextLvl];
    
    let content = `⭐ **SQUISH PASS UPDATE!**\n` +
                  `Current Level: **${currentLevel}** | Points: **${points.toLocaleString()}**\n` +
                  `*Bonus hours go into the monthly Time Bank (no rollover).* \n\n` +
                  `**Rewards Unlocked This Month:**\n${fullUnlockedList}\n\n` +
                  `🎯 **Goal:** **${pointsNeeded.toLocaleString()}** points for **Level ${nextLvl}**\n` +
                  `🎁 **Next Up:** **${nextReward.reward}**\n*${nextReward.description}*\n\n` +
                  `✨ **How to Add to the Pass:**\n` +
                  `* **Digital:** Subscriptions, Bits, Gifted Subs, Tangias, Blerps, and Powerups!\n` +
                  `* **Daily:** Use your daily Channel Point option in chat.\n` +
                  `* **Gifts:** Sending food or IRL/Digital gifts also boosts our progress!\n\n` +
                  `💖 **Support the stream to unlock the next milestone!**`;

    // UPDATED FILENAME LOGIC
    const fileName = `SP-LVL${currentLevel}.png`;
    const imagePath = `./images/${fileName}`;

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
    const payload = { content: content };

    if (fs.existsSync(imagePath)) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            payload.attachments = [{ id: 0, filename: fileName }];
            formData.append('files[0]', new Blob([imageBuffer]), fileName);
        } catch (err) {
            console.warn(`Image check passed but read failed: ${err.message}`);
        }
    }

    formData.append('payload_json', JSON.stringify(payload));

    try {
        let response = await fetch(targetUrl, { method, body: formData });

        if (!response.ok && method === 'PATCH') {
            method = 'POST';
            const postUrl = `${baseWebhookUrl.origin}${cleanPath}?wait=true&thread_id=${THREAD_ID}`;
            response = await fetch(postUrl, { method: 'POST', body: formData });
        }

        const result = await response.json();
        if (result.id) {
            fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify({ message_id: result.id }, null, 2));
            console.log(`Success! Updated Level ${currentLevel}.`);
        }
    } catch (err) {
        console.error("Critical error:", err);
    }
}

main();
