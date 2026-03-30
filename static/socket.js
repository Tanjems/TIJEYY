const socket = io(window.location.origin);   // Best for Render (HTTPS + dynamic port)

let myRoom = null;
let mySide = null;
let gameState = {};

socket.on('room_created', (d) => { 
    myRoom = d.room; 
    document.getElementById('room-code-display').textContent = d.room; 
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('waiting-screen').style.display = 'flex';
});

socket.on('joined', (d) => { 
    myRoom = d.room; 
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('waiting-screen').style.display = 'flex';
});

socket.on('player_assigned', (d) => { 
    mySide = d.side; 
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
    gameState = state;

    // Your custom logic (kept but improved)
    const ballVx = state.ball_vx ?? 0;
    const ballVy = state.ball_vy ?? 0;

    if (ballVx === 0 && ballVy === 0 && document.getElementById('countdown-screen').style.display !== 'flex') {
        // Optional "Ready?" message between points
        const countdownEl = document.getElementById('countdown-number');
        if (countdownEl) countdownEl.textContent = 'Ready?';
        document.getElementById('countdown-screen').style.display = 'flex';
    }
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
