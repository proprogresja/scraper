// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Game settings
const GAME_SPEED = 5;
const OBSTACLE_FREQUENCY = 0.02; // Probability of spawning an obstacle each frame
const GRAVITY = 0.5;
const JUMP_FORCE = 12;

// Game state
let score = 0;
let isGameOver = false;
let obstacles = [];

// Player object
const player = {
    x: 100,
    y: canvas.height - 100,
    width: 40,
    height: 40,
    color: '#3498db',
    velocityY: 0,
    isJumping: false,
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },
    
    update() {
        // Apply gravity
        this.velocityY += GRAVITY;
        this.y += this.velocityY;
        
        // Floor collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }
    },
    
    jump() {
        if (!this.isJumping) {
            this.velocityY = -JUMP_FORCE;
            this.isJumping = true;
        }
    }
};

// Obstacle class
class Obstacle {
    constructor() {
        this.width = 30 + Math.random() * 30;
        this.height = 30 + Math.random() * 70;
        this.x = canvas.width;
        this.y = canvas.height - this.height;
        this.color = '#e74c3c';
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    update() {
        this.x -= GAME_SPEED;
    }
}

// Game functions
function spawnObstacle() {
    if (Math.random() < OBSTACLE_FREQUENCY) {
        obstacles.push(new Obstacle());
    }
}

function checkCollisions() {
    for (let obstacle of obstacles) {
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            gameOver();
        }
    }
}

function updateObstacles() {
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
    
    obstacles.forEach(obstacle => {
        obstacle.update();
        obstacle.draw();
    });
}

function updateScore() {
    score++;
    scoreElement.textContent = `Score: ${score}`;
}

function gameOver() {
    isGameOver = true;
    
    // Display game over message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText('Press Space to Restart', canvas.width / 2, canvas.height / 2 + 90);
}

function resetGame() {
    score = 0;
    isGameOver = false;
    obstacles = [];
    player.y = canvas.height - 100;
    player.velocityY = 0;
    player.isJumping = false;
    scoreElement.textContent = `Score: ${score}`;
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!isGameOver) {
        // Update game objects
        player.update();
        spawnObstacle();
        updateObstacles();
        checkCollisions();
        updateScore();
        
        // Draw player
        player.draw();
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (isGameOver) {
            resetGame();
        } else {
            player.jump();
        }
    }
});

// Touch support for mobile
canvas.addEventListener('touchstart', () => {
    if (isGameOver) {
        resetGame();
    } else {
        player.jump();
    }
});

// Start the game
gameLoop(); 