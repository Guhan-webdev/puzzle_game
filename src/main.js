import GameScene from "./GameScene.js";
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 360,
        height: 700,
    },
    parent: 'gameCanvas',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: [GameScene]
};
const game = new Phaser.Game(config);

// --- Debug Configuration ---
const debugConfig = {
    showDebug: false,          // Toggle visual hit areas (green boxes)
    showDebugText: false,      // Toggle debug text overlay
    showGlow: false,            // Toggle tile hover glow effect
    hitAreaOffset: { x: 90, y: 90 } // Offset for the interactive rectangle
};

game.registry.set('debugConfig', debugConfig);

// --- UI Logic ---

// Start Screen
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const inGameUI = document.getElementById('in-game-ui');

startBtn.addEventListener('click', () => {
    // Hide Start Screen with Fade
    startScreen.style.opacity = '0';
    setTimeout(() => {
        startScreen.style.display = 'none';
        // Show In-Game UI
        inGameUI.style.display = 'block';
        inGameUI.classList.remove('hidden'); // Ensure it's visible
    }, 500);
});

// Reference Button (Hold to Peek)
const refBtn = document.getElementById('ref-btn');
const refImage = document.getElementById('ref-image');

const showRef = (e) => {
    e.preventDefault(); // Prevent accidental touches/clicks passing through
    refImage.classList.remove('hidden');
};
const hideRef = (e) => {
    e.preventDefault();
    refImage.classList.add('hidden');
};
refBtn.addEventListener('mousedown', showRef);
refBtn.addEventListener('mouseup', hideRef);
refBtn.addEventListener('mouseleave', hideRef);
refBtn.addEventListener('touchstart', showRef, { passive: false });
refBtn.addEventListener('touchend', hideRef, { passive: false });