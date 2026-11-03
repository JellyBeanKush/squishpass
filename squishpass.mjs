import fs from 'fs';
import sharp from 'sharp';

// ---------------------------------------------------------
// SQUISHPASS LEVEL DATA
// ---------------------------------------------------------
export const squishPassLevels = {
    0: { points: 0, reward: "Squish Pass Start", description: "The journey begins!" },
    
    // Row 1 (Top): Right to Left
    1: { points: 5, reward: "MUSIC MADNESS", description: "Music tournament stream!" },
    2: { points: 10, reward: "X3 HONEY BUNS", description: "Triple points active!" },
    3: { points: 20, reward: "+5 HOURS", description: "5 extra hours added." },
    4: { points: 30, reward: "$10 GIVE AWAY", description: "Community giveaway!" },
    5: { points: 45, reward: "ARTS & CRAFTS", description: "Creative crafting stream!" },
    6: { points: 69, reward: "X2 SQUISH POINTS", description: "Double squish points boost!" },
    7: { points: 95, reward: "DRAG AND DRINKS", description: "Drag stream & drink mixing!" },
    
    // Row 2 (Middle): Right to Left
    8: { points: 125, reward: "MOVIE MARATHON", description: "Movie watch party unlocked!" },
    9: { points: 155, reward: "X5 HONEY BUNS", description: "5X points active!" },
    10: { points: 185, reward: "+10 HOURS", description: "10 extra hours added." },
    11: { points: 215, reward: "$20 GIVE AWAY", description: "Mid-pass cash drop!" },
    12: { points: 250, reward: "BEAR VS BEAN", description: "Head-to-head showdown!" },
    13: { points: 285, reward: "X3 SQUISH POINTS", description: "Triple squish points boost!" },
    14: { points: 325, reward: "COOKING AFTER DARK", description: "Late-night cooking stream!" },
    
    // Row 3 (Bottom): Right to Left
    15: { points: 370, reward: "KARAOKE PARTY", description: "Live singing stream!" },
    16: { points: 420, reward: "X10 HONEY BUNS", description: "Massive multiplier active!" },
    17: { points: 470, reward: "+20 HOURS", description: "Huge time bank deposit." },
    18: { points: 525, reward: "$30 GIVE AWAY", description: "Late-stage cash giveaway!" },
    19: { points: 580, reward: "WORK OUT SESH", description: "Fitness session!" },
    20: { points: 640, reward: "X5 SQUISH POINTS", description: "Max squish points boost!" },
    21: { points: 700, reward: "SHIRTLESS STREAMS", description: "The ultimate reward reached!" }
};

// ---------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------

export function getCurrentLevel(currentPoints) {
    let achievedLevel = 0;
    for (let i = 0; i <= 21; i++) {
        if (currentPoints >= squishPassLevels[i].points) {
            achievedLevel = i;
        } else {
            break;
        }
    }
    return achievedLevel;
}

export async function generateBoardImage(currentPoints, outputPath = 'output.png') {
    const currentLevel = getCurrentLevel(currentPoints);
    const overlayImage = `sp ${currentLevel}.png`;
    
    try {
        if (!fs.existsSync(overlayImage)) {
            console.warn(`Overlay image ${overlayImage} not found. Skipping composite.`);
            return;
        }

        // Process the overlay to make it 50% see-through
        const transparentOverlay = await sharp(overlayImage)
            .ensureAlpha()
            .evaluate({
                apply: 'multiply',
                parameters: [1, 1, 1, 0.5] 
            })
            .toBuffer();

        // Composite the images using the new transparent buffer
        await sharp('background.png') 
            .composite([
                { 
                    input: 'hex_board.png',
                    blend: 'over' 
                },
                { 
                    input: transparentOverlay, 
                    blend: 'over'
                }
            ])
            .toFile(outputPath);
            
        console.log(`Successfully generated board for Level ${currentLevel} (${currentPoints} pts) at ${outputPath}`);
    } catch (error) {
        console.error("Error generating board image with Sharp:", error);
    }
}
