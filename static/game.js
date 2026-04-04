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
    y = Math.max(0, Math.min(500, y));

    if (Math.abs(y - (gameState[key] || 250)) > 0.1) {
        gameState[key] = y;
        socket.emit('update_paddle', {room: myRoom, y: Math.round(y)});
    }
}

function updateBallLocally() {
    if (!gameState || typeof gameState.ball_vx === 'undefined') return;
    
    if (gameState.waitingForReady) return;

    gameState.ball_x += gameState.ball_vx;
    gameState.ball_y += gameState.ball_vy;

    if (gameState.ball_y <= 10 || gameState.ball_y >= 590) {
        gameState.ball_vy *= -1;
    }

    // Paddle collision - Left (only when approaching + inside paddle)
    if (gameState.ball_vx < 0 && 
        gameState.ball_x <= 30 && 
        gameState.ball_x >= 15 && 
        gameState.paddle1_y <= gameState.ball_y && 
        gameState.ball_y <= gameState.paddle1_y + 100) {
        gameState.ball_vx *= -1;
        let hit = (gameState.ball_y - gameState.paddle1_y) / 100 - 0.5;
        gameState.ball_vy = hit * 8;
    }

    // Paddle collision - Right (only when approaching + inside paddle)
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
    ctx.fillStyle = '#fff';
    ctx.fillText(gameState.score1 || 0, 200, 80);
    ctx.fillText(gameState.score2 || 0, 600, 80);

    // === VERTICAL PLAYER LABELS ON THE SIDES ===
    ctx.save();
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // PLAYER 1 - Left side (vertical)
    ctx.fillStyle = (mySide === 'left') ? '#0ff' : '#fff';
    ctx.translate(28, 300);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('PLAYER 1', 0, 0);
    ctx.restore();

    // PLAYER 2 - Right side (vertical)
    ctx.save();
    ctx.fillStyle = (mySide === 'right') ? '#0ff' : '#fff';
    ctx.translate(772, 300);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('PLAYER 2', 0, 0);
    ctx.restore();

    // (YOU) indicator for your side
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    if (mySide === 'left') {
        ctx.fillStyle = '#0ff';
        ctx.fillText('(YOU)', 28, 340);
    } else if (mySide === 'right') {
        ctx.fillStyle = '#0ff';
        ctx.fillText('(YOU)', 772, 340);
    }

    // Paused text
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', 400, 300);
    }
}
