// import Phaser from "phaser";

export default class PuzzleController {
    constructor(scene, tiles, gridSize, tileWidth, tileHeight, debugConfig) {
        this.scene = scene;
        this.tiles = tiles;
        this.gridSize = gridSize;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.debugConfig = debugConfig || { showDebug: false, showGlow: true, hitAreaOffset: { x: 0, y: 0 } };

        this.emptyTile = this.tiles.find(t => t.getData('isEmpty'));
        this.emptyPos = { ...this.emptyTile.getData('currentPosition') };

        // Flag to distinguish between a drag and a click
        this.isDragging = false;

        // Flag to track game state
        this.isGameWon = false;

        this.attachInput();
    }

    attachInput() {
        this.tiles.forEach(tile => {
            // Reset interaction to ensure no cached state
            tile.removeInteractive();

            // Explicitly define Hit Area using Config
            const { x, y } = this.debugConfig.hitAreaOffset;
            tile.setInteractive(
                new Phaser.Geom.Rectangle(x, y, this.tileWidth, this.tileHeight),
                Phaser.Geom.Rectangle.Contains
            );
            // Enable Debug to visualize the Hit Area (Green/Blue Box)
            if (this.debugConfig.showDebug) {
                this.scene.input.enableDebug(tile);
            }
            this.scene.input.dragDistanceThreshold = 16;
            this.scene.input.setDraggable(tile);

            tile.on('dragstart', (pointer, dragX, dragY) => this.onDragStart(tile, pointer));
            tile.on('drag', (pointer, dragX, dragY) => this.onDrag(tile, pointer, dragX, dragY));
            tile.on('dragend', () => this.onDragEnd(tile));

            // Add Pointer Up for "Tap to Click" behavior, and Glow effects
            tile.on('pointerover', () => {
                if (this.isDragging) return;
                if (tile.getData('isEmpty')) return;
                this.setTileHighlight(tile, true);
            });

            tile.on('pointerout', () => {
                this.setTileHighlight(tile, false);
            });

            tile.on('pointerdown', () => {
                if (tile.getData('isEmpty')) return;
                tile.first.setTint(0xaaaaaa);
            });

            tile.on('pointerup', () => {
                tile.first.clearTint(); // Clear tint on release
                // Check if we are still over to decide if we keep highlight?
                // Creating a "click" usually resets state, let's reset to be safe.
                this.setTileHighlight(tile, false);
                this.onTileClick(tile);
            });
        });
    }

    setTileHighlight(tile, isHighlighted) {
        // tile.list[0] is Sprite, tile.list[1] is Graphics (Border)
        const border = tile.list[1];
        if (!border) return;

        border.clear();

        if (isHighlighted) {
            if (this.debugConfig.showGlow) {
                border.lineStyle(4, 0xffff00, 1); // Yellow Glow, Thicker
            } else {
                border.lineStyle(2, 0xffffff, 1); // Stay default if glow is off
            }
            border.strokeRect(0, 0, this.tileWidth, this.tileHeight);
        } else {
            border.lineStyle(2, 0xffffff, 1); // Default White, Thinner
            border.strokeRect(0, 0, this.tileWidth, this.tileHeight);
            tile.first.clearTint();
        }
    }

    onDragStart(tile, pointer) {
        if (tile.getData('isEmpty')) return;

        const currentPos = tile.getData('currentPosition');
        const isNeighbor = this.checkAdjacency(currentPos, this.emptyPos);

        if (!isNeighbor) {
            this.activeDrag = null;
            return;
        }

        this.isDragging = true;

        this.activeDrag = {
            startX: tile.x,
            startY: tile.y,
            axis: (currentPos.r === this.emptyPos.r) ? 'x' : 'y',
            minX: Math.min(tile.x, this.emptyTile.x),
            maxX: Math.max(tile.x, this.emptyTile.x),
            minY: Math.min(tile.y, this.emptyTile.y),
            maxY: Math.max(tile.y, this.emptyTile.y),
            pointerStartX: pointer.x,
            pointerStartY: pointer.y
        };
    }

    onDrag(tile, pointer, dragX, dragY) {
        if (!this.activeDrag) return;

        const { startX, startY, pointerStartX, pointerStartY, axis, minX, maxX, minY, maxY } = this.activeDrag;

        const dx = pointer.x - pointerStartX;
        const dy = pointer.y - pointerStartY;

        // Reverted to simple 1:1 movement based on the axis.
        // This ensures the tile stays exactly under the finger (projected).
        if (axis === 'x') {
            tile.x = Phaser.Math.Clamp(startX + dx, minX, maxX);
            tile.y = startY;
        } else {
            tile.x = startX;
            tile.y = Phaser.Math.Clamp(startY + dy, minY, maxY);
        }

        // --- Update Debug Text ---
        const dist = (axis === 'x') ? Math.abs(tile.x - startX) : Math.abs(tile.y - startY);
        const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);

        if (this.scene.debugText) {
            this.scene.debugText.setText(
                `Angle: ${angleDeg} deg\n` +
                `Axis: ${axis.toUpperCase()}\n` +
                `Dist: ${Math.round(dist)}\n` +
                `State: Dragging (1:1)`
            );
        }
    }

    onDragEnd(tile) {
        if (!this.activeDrag) return;

        // Slight delay to reset dragging flag so 'pointerup' doesn't trigger erroneously
        setTimeout(() => { this.isDragging = false; }, 50);

        const { startX, startY, axis } = this.activeDrag;
        const dist = Phaser.Math.Distance.Between(startX, startY, tile.x, tile.y);

        // IMPROVEMENT 1: Lower threshold (20% instead of 50%)
        // This makes it feel much more responsive / easier to flick
        const threshold = (axis === 'x' ? this.tileWidth : this.tileHeight) * 0.2;

        if (dist > threshold) {
            this.swapTile(tile);
        } else {
            this.snapBack(tile, startX, startY);
        }

        this.activeDrag = null;
        // this.scene.debugText.setText('Drag Info: None');
        this.setTileHighlight(tile, false); // Reset visual state
    }

    // IMPROVEMENT 2: Handle Click/Tap
    onTileClick(tile) {
        // If we were just dragging, ignore this click event
        if (this.isDragging) return;
        if (tile.getData('isEmpty')) return;

        const currentPos = tile.getData('currentPosition');
        const isNeighbor = this.checkAdjacency(currentPos, this.emptyPos);

        // If it's a neighbor and we just clicked it, move it instantly
        if (isNeighbor) {
            // Save start pos for the swap logic
            this.activeDrag = { startX: tile.x, startY: tile.y };
            this.swapTile(tile);
            this.activeDrag = null;
        }
    }

    checkAdjacency(pos1, pos2) {
        return (
            (Math.abs(pos1.r - pos2.r) === 1 && pos1.c === pos2.c) ||
            (Math.abs(pos1.c - pos2.c) === 1 && pos1.r === pos2.r)
        );
    }

    snapBack(tile, x, y) {
        this.scene.tweens.add({
            targets: tile,
            x: x,
            y: y,
            duration: 100, // Faster snap back
            ease: 'Power2'
        });
    }

    swapTile(tile) {
        const tilePos = tile.getData('currentPosition');
        const gapPos = { ...this.emptyPos };

        // Animate to the empty slot
        this.scene.tweens.add({
            targets: tile,
            x: this.emptyTile.x,
            y: this.emptyTile.y,
            duration: 150,
            ease: 'Cubic.Out' // Smoother ease
        });

        // Teleport empty slot to old tile position
        this.emptyTile.setPosition(this.activeDrag.startX, this.activeDrag.startY);

        // Update data
        tile.setData('currentPosition', { r: gapPos.r, c: gapPos.c });
        this.emptyTile.setData('currentPosition', { r: tilePos.r, c: tilePos.c });

        // Update state
        this.emptyPos = { r: tilePos.r, c: tilePos.c };

        this.checkWin();
    }

    checkWin() {
        if (this.isGameWon) return;

        let isCorrect = true;

        for (const tile of this.tiles) {
            const current = tile.getData('currentPosition');
            const correct = tile.getData('correctPosition');

            if (current.r !== correct.r || current.c !== correct.c) {
                isCorrect = false;
                break;
            }
        }

        if (isCorrect) {
            this.handleWin();
        }
    }

    handleWin() {
        this.isGameWon = true;

        // 1. Freeze Game: Disable Input
        this.tiles.forEach(tile => tile.disableInteractive());

        // 2. Show Win Text
        const { width, height } = this.scene.scale;

        // Overlay for better text contrast
        this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(200);

        const fontSize = Math.min(width * 0.15, 80); // 15% of width or max 80px
        this.scene.add.text(width / 2, height / 2, 'YOU WIN!', {
            fontSize: `${fontSize}px`,
            fontFamily: 'Arial',
            color: '#00ff00',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(201);

        if (this.scene.bgMusic) {
            this.scene.bgMusic.stop();
        }

        console.log("Puzzle Solved!");
    }
}