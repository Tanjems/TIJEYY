let canvas, ctx;
let keys = {};
let touchDirection = 0;

function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
    document.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

    canvas.addEventListener('touchstart', e => { 
        e.preventDefault(); 
        const y = e.touches[0].clientY - canvas.getBoundingClientRect().top; 
        touchDirection = y < 300 ? -1 : 1; 
    }, {passive:false});

    canvas.addEventListener('touchmove', e => { 
        e.preventDefault(); 
        const y = e.touches[0].clientY - canvas.getBoundingClientRect().top; 
        touchDirection = y < 300 ? -1 : 1; 
    }, {passive:false});

    canvas.addEventListener('touchend', () => touchDirection = 0);

    gameLoop();
}

function gameLoop() {
    updateOwnPaddle();
    updateBallLocally();     // ← handles movement + paddle bounce
    drawGame();
    requestAnimationFrame(gameLoop);
}

function updateOwnPaddle() {
    if (!mySide || !myRoom || !gameState) return;
    const key = mySide === 'left' ? 'paddle1_y' : 'paddle2_y';
    let y = gameState[key] || 250;
    const speed = 7;

    if (mySide === 'left') {
        if (keys['w']) y -= speed;
        if (keys['s']) y += speed;
    } else {
        if (keys['arrowup']) y -= speed;
        if (keys['arrowdown']) y += speed;
    }
    y += touchDirection * speed;
    y = Math.max(0, Math.min(500, y));

    if (Math.abs(y - (gameState[key] || 250)) > 0.5) {
        gameState[key] = y;
        socket.emit('update_paddle', {room: myRoom, y: Math.round(y)});
    }
}

// === NEW: Local ball movement + paddle collision ===
function updateBallLocally() {
    if (!gameState || typeof gameState.ball_vx === 'undefined') return;
    
    // ←←← ADD THIS LINE (stops local movement after scoring)
    if (gameState.waitingForReady) return;

    gameState.ball_x += gameState.ball_vx;
    gameState.ball_y += gameState.ball_vy;

    // Wall bounce
    if (gameState.ball_y <= 10 || gameState.ball_y >= 590) {
        gameState.ball_vy *= -1;
    }

    // Paddle collision - Left
    if (gameState.ball_x <= 30 && 
        gameState.paddle1_y <= gameState.ball_y && 
        gameState.ball_y <= gameState.paddle1_y + 100) {
        gameState.ball_vx *= -1;
        let hit = (gameState.ball_y - gameState.paddle1_y) / 100 - 0.5;
        gameState.ball_vy = hit * 8;
    }

    // Paddle collision - Right
    if (gameState.ball_x >= 770 && 
        gameState.paddle2_y <= gameState.ball_y && 
        gameState.ball_y <= gameState.paddle2_y + 100) {
        gameState.ball_vx *= -1;
        let hit = (gameState.ball_y - gameState.paddle2_y) / 100 - 0.5;
        gameState.ball_vy = hit * 8;
    }
}
function drawGame() {
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);

    // Dashed center line
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([15,15]);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(400,0); ctx.lineTo(400,600); ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(15, gameState.paddle1_y || 250, 12, 100);
    ctx.fillRect(773, gameState.paddle2_y || 250, 12, 100);

    // Ball
    ctx.beginPath();
    ctx.arc(gameState.ball_x || 400, gameState.ball_y || 300, 12, 0, Math.PI*2);
    ctx.fill();

    // Scores
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.score1 || 0, 200, 80);
    ctx.fillText(gameState.score2 || 0, 600, 80);

    // Paused text
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', 400, 300);
    }
}
