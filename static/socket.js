const socket = io(window.location.origin);

let myRoom = null;
let mySide = null;
let gameState = {};

socket.on('connect', () => {
    console.log("✅ Socket connected successfully");
});

socket.on('room_created', (d) => { 
    myRoom = d.room; 
    document.getElementById('room-code-display').textContent = d.room; 
    console.log("✅ Room created:", d.room);
});

socket.on('joined', (d) => { 
    myRoom = d.room; 
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('waiting-screen').style.display = 'flex';
});

socket.on('player_assigned', (d) => { 
    mySide = d.side; 
    
    // Show correct (YOU) outside the table
    if (mySide === 'left') {
        document.getElementById('you1').style.opacity = '1';
        document.getElementById('you2').style.opacity = '0';
    } else {
        document.getElementById('you1').style.opacity = '0';
        document.getElementById('you2').style.opacity = '1';
    }
});

socket.on('countdown', (d) => {
    const el = document.getElementById('countdown-number');
    el.textContent = d.number;
    document.getElementById('waiting-screen').style.display = 'none';
    document.getElementById('countdown-screen').style.display = 'flex';

    if (d.number === 'GO!') {
        setTimeout(() => {
            document.getElementById('countdown-screen').style.display = 'none';
            document.getElementById('game-screen').style.display = 'flex';
            initGame();
        }, 800);
    }
});

socket.on('game_update', (state) => {
    if (!state) return;

    // === FIX: Protect your own paddle from server snapping it back ===
    const myPaddleKey = mySide === 'left' ? 'paddle1_y' : 'paddle2_y';
    const myCurrentPaddleY = gameState[myPaddleKey];   // remember your local position

    // Apply everything the server sent (ball, opponent paddle, scores, etc.)
    Object.assign(gameState, state);

    // Restore YOUR paddle so it never gets snapped back
    if (myCurrentPaddleY !== undefined) {
        gameState[myPaddleKey] = myCurrentPaddleY;
    }

    // Optional: keep your debug log
    console.log("📡 GAME UPDATE - ball_vx:", state.ball_vx, "ball_vy:", state.ball_vy);
});

socket.on('game_over', (d) => {
    document.getElementById('winner-text').textContent = d.winner + ' WINS!';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'flex';
});

socket.on('opponent_left', () => { 
    alert('Opponent left the game!'); 
    location.reload(); 
});

socket.on('join_error', (d) => { 
    alert(d.message); 
});

socket.on('show_ready_buttons', () => {
    console.log("✅ SHOW READY BUTTONS received");
    document.getElementById('ready-overlay').style.display = 'flex';
});

socket.on('both_ready', () => {
    console.log("✅ BOTH READY - ball starts again");
    gameState.waitingForReady = false;         // ← allows local movement again
    document.getElementById('ready-overlay').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'block';
});
socket.on('point_scored', (state) => {
    console.log("✅ Point scored - resetting ball and showing Ready");
    Object.assign(gameState, state);
    gameState.waitingForReady = true;          // ← stops local movement
    document.getElementById('ready-overlay').style.display = 'flex';
    document.getElementById('pause-btn').style.display = 'none';
});

socket.on('game_paused', () => {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.textContent = "▶ RESUME";
});
