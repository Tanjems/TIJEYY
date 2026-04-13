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
    updateBallLocally();
    drawGame();
    requestAnimationFrame(gameLoop);
}

function updateOwnPaddle() {
    if (!mySide || !myRoom || !gameState) return;

    const key = mySide === 'left' ? 'paddle1_y' : 'paddle2_y';
    let y = gameState[key] || 250;
    const speed = 8;

    if (mySide === 'left') {
        if (keys['w']) y -= speed;
        if (keys['s']) y += speed;
    } else {
        if (keys['arrowup']) y -= speed;
        if (keys['arrowdown']) y += speed;
    }
    y += touchDirection * speed;

    y = Math.max(0, Math.min(500, y));   // strong clamp

    gameState[key] = y;                   // always update locally first

    socket.emit('update_paddle', {room: myRoom, y: Math.round(y)});
}

function updateBallLocally() {
    if (!gameState || typeof gameState.ball_vx === 'undefined') return;
    
    // ←←← STOP local movement when paused or waiting for ready
    if (gameState.waitingForReady || gameState.paused) return;

    gameState.ball_x += gameState.ball_vx;
    gameState.ball_y += gameState.ball_vy;

    if (gameState.ball_y <= 10 || gameState.ball_y >= 590) {
        gameState.ball_vy *= -1;
    }

    // Paddle collision - Left
    if (gameState.ball_vx < 0 && 
        gameState.ball_x <= 30 && 
        gameState.ball_x >= 15 && 
        gameState.paddle1_y <= gameState.ball_y && 
        gameState.ball_y <= gameState.paddle1_y + 100) {
        gameState.ball_vx *= -1;
        let hit = (gameState.ball_y - gameState.paddle1_y) / 100 - 0.5;
        gameState.ball_vy = hit * 8;
    }

    // Paddle collision - Right
    if (gameState.ball_vx > 0 && 
        gameState.ball_x >= 770 && 
        gameState.ball_x <= 785 && 
        gameState.paddle2_y <= gameState.ball_y && 
        gameState.ball_y <= gameState.paddle2_y + 100) {
        gameState.ball_vx *= -1;
        let hit = (gameState.ball_y - gameState.paddle2_y) / 100 - 0.5;
        gameState.ball_vy = hit * 8;
    }
}

function drawGame() {
    if (!ctx) return;
    
    // Green table background
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, 800, 600);

    // Black table border
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, 780, 580);
    
    // White net in the middle
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(400, 10);
    ctx.lineTo(400, 590);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles - Real table tennis style (round head + handle)
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 8;

    // Left paddle (Player 1 - Red)
    const p1y = gameState.paddle1_y || 250;
    ctx.fillStyle = '#ff4444';                    // red paddle
    ctx.beginPath();
    ctx.arc(40, p1y + 50, 28, 0, Math.PI * 2);   // round paddle head
    ctx.fill();
    ctx.stroke();
    // handle
    ctx.fillStyle = '#111';
    ctx.fillRect(18, p1y + 45, 12, 12);

    // Right paddle (Player 2 - Blue)
    const p2y = gameState.paddle2_y || 250;
    ctx.fillStyle = '#4488ff';                    // blue paddle
    ctx.beginPath();
    ctx.arc(760, p2y + 50, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // handle
    ctx.fillStyle = '#111';
    ctx.fillRect(770, p2y + 45, 12, 12);

    // Ball (white with black outline + shadow)
    const bx = gameState.ball_x || 400;
    const by = gameState.ball_y || 300;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(bx + 4, by + 6, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // ball
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bx, by, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Scores
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(gameState.score1 || 0, 200, 80);
    ctx.fillText(gameState.score2 || 0, 600, 80);

    // === PLAYER LABELS + (YOU) only on your side ===
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';

    // PLAYER 1 label
    ctx.fillStyle = (mySide === 'left') ? '#0ff' : '#fff';
    ctx.fillText('PLAYER 1', 200, 120);

    // PLAYER 2 label
    ctx.fillStyle = (mySide === 'right') ? '#0ff' : '#fff';
    ctx.fillText('PLAYER 2', 600, 120);

    // (YOU) only appears on YOUR side
    ctx.font = 'bold 18px Arial';
    if (mySide === 'left') {
        ctx.fillStyle = '#0ff';
        ctx.fillText('(YOU)', 200, 150);
    } 
    else if (mySide === 'right') {
        ctx.fillStyle = '#0ff';
        ctx.fillText('(YOU)', 600, 150);
    }

    // Paused text
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 70px Arial';
        ctx.fillText('PAUSED', 400, 300);
    }
}
