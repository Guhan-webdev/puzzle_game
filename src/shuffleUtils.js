import Phaser from "phaser";

/**
 * Shuffles the puzzle by performing random valid moves.
 * This ensures the puzzle remains solvable.
 * @param {Array} tiles - Array of container objects (puzzle pieces).
 * @param {Object} gridSize - { rows, cols }
 * @param {number} shuffleAmount - Number of random moves to perform.
 */
export function shufflePuzzle(tiles, gridSize, shuffleAmount = 100) {
    // Find the empty tile
    let emptyTile = tiles.find(t => t.getData('isEmpty'));
    if (!emptyTile) {
        console.error("Shuffle failed: No empty tile found.");
        return;
    }

    let previousTile = null;

    for (let i = 0; i < shuffleAmount; i++) {
        const emptyPos = emptyTile.getData('currentPosition');

        // Find all valid neighbors (Up, Down, Left, Right)
        const neighbors = tiles.filter(tile => {
            if (tile.getData('isEmpty')) return false;

            const pos = tile.getData('currentPosition');
            const isRowNeighbor = (pos.r === emptyPos.r && Math.abs(pos.c - emptyPos.c) === 1);
            const isColNeighbor = (pos.c === emptyPos.c && Math.abs(pos.r - emptyPos.r) === 1);

            return isRowNeighbor || isColNeighbor;
        });

        // Filter out the tile we just moved to avoid immediate backtracking (makes shuffle more effective)
        const validNeighbors = neighbors.filter(t => t !== previousTile);

        // Fallback to all neighbors if stuck (shouldn't happen often in grid, but good safety)
        const candidates = validNeighbors.length > 0 ? validNeighbors : neighbors;

        if (candidates.length === 0) break;

        // Pick a random neighbor
        const randomTile = candidates[Math.floor(Math.random() * candidates.length)];

        // Swap positions logically and visually
        swapTileImmediate(randomTile, emptyTile);
        previousTile = randomTile;
    }
}

function swapTileImmediate(tile, emptyTile) {
    const tilePos = tile.getData('currentPosition');
    const emptyPos = emptyTile.getData('currentPosition');

    // Visual Swap (Instant, no tween)
    const tileX = tile.x;
    const tileY = tile.y;

    tile.setPosition(emptyTile.x, emptyTile.y);
    emptyTile.setPosition(tileX, tileY);

    // Data Swap
    tile.setData('currentPosition', { r: emptyPos.r, c: emptyPos.c });
    emptyTile.setData('currentPosition', { r: tilePos.r, c: tilePos.c });
}
