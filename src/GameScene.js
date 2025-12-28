import PuzzleController from "./puzzleController.js";
import { shufflePuzzle } from "./shuffleUtils.js";
import bgMusicPath from "./assets/water-chapter-reflections-beneath-368530.mp3";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.gridSize = { rows: 4, cols: 2 };
        this.width_of_image = 360;
        this.height_of_image = 700;
        this.tiles = [];
        this.debugText = null;
    }
    preload() {
        const the_image = 'https://images.pexels.com/photos/20794372/pexels-photo-20794372/free-photo-of-small-birdhouse-hanging-from-a-tree.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
        this.load.image('high-res-puzzle', the_image);
        this.load.audio('bg-music', bgMusicPath);
    }
    create() {
        // --- Play Background Music ---
        this.bgMusic = this.sound.add('bg-music', { loop: true, volume: 0.5 });
        this.bgMusic.play();

        const tileWidth = this.width_of_image / this.gridSize.cols;
        const tileHeight = this.height_of_image / this.gridSize.rows;

        // --- UI Sync ---
        // Set the hidden reference image to match the game image
        const refImg = document.getElementById('ref-image');
        if (refImg) {
            refImg.src = 'https://images.pexels.com/photos/20794372/pexels-photo-20794372/free-photo-of-small-birdhouse-hanging-from-a-tree.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
        }

        const tempimage = this.make.image({ key: 'high-res-puzzle' }).setOrigin(0, 0);
        tempimage.setDisplaySize(this.width_of_image, this.height_of_image);

        const puzzleRt = this.make.renderTexture({ x: 0, y: 0, width: this.width_of_image, height: this.height_of_image });

        puzzleRt.draw(tempimage, 0, 0);
        puzzleRt.saveTexture('puzzle');

        tempimage.destroy();
        puzzleRt.destroy();
        this.textures.remove('high-res-puzzle');

        let frameIndex = 0;
        const puzzleTexture = this.textures.get('puzzle');

        for (let row = 0; row < this.gridSize.rows; row++) {
            for (let col = 0; col < this.gridSize.cols; col++) {

                const x = col * tileWidth;
                const y = row * tileHeight;

                puzzleTexture.add(frameIndex, 0, x, y, tileWidth, tileHeight);

                const container = this.add.container(x, y);
                const tileSprite = this.add.sprite(0, 0, 'puzzle', frameIndex).setOrigin(0, 0);

                const border = this.add.graphics();
                border.lineStyle(2, 0xffffff, 1);
                border.strokeRect(0, 0, tileWidth, tileHeight);

                container.add([tileSprite, border]);
                container.setSize(tileWidth, tileHeight);

                // --- FIX: Set Data on Container, not Sprite ---
                container.setData('correctPosition', { r: row, c: col });
                container.setData('currentPosition', { r: row, c: col });
                container.setData('index', frameIndex);

                if (row === this.gridSize.rows - 1 && col === this.gridSize.cols - 1) {
                    container.setVisible(false);
                    container.setData('isEmpty', true);
                }
                else {
                    container.setData('isEmpty', false);
                }

                this.tiles.push(container);
                frameIndex++;
            }
        }

        // --- Initialize the Controller ---
        const debugConfig = this.registry.get('debugConfig');
        this.puzzleController = new PuzzleController(
            this,
            this.tiles,
            this.gridSize,
            tileWidth,
            tileHeight,
            debugConfig
        );

        if (debugConfig && debugConfig.showDebugText) {
            this.debugText = this.add.text(10, 10, 'Drag Info: None', {
                fontSize: '20px',
                fill: '#00ff00',
                backgroundColor: '#000000aa'
            });
            this.debugText.setDepth(100);
        }

        // Shuffle the puzzle at the start
        shufflePuzzle(this.tiles, this.gridSize, 150);

        // Re-sync the controller's internal state after external shuffling
        this.puzzleController.emptyPos = this.tiles.find(t => t.getData('isEmpty')).getData('currentPosition');
    }
}