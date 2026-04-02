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
    
    // Safer update + logging so we can see what's happening
    console.log("📡 GAME UPDATE - ball_vx:", state.ball_vx, "ball_vy:", state.ball_vy, "ball_x:", state.ball_x);
    Object.assign(gameState, state);   // This keeps the same object reference
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
    console.log("✅ BOTH READY - ball should start moving now");
    document.getElementById('ready-overlay').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'block';
});

socket.on('point_scored', (state) => {
    console.log("✅ Point scored - showing ready again");
    Object.assign(gameState, state);
    document.getElementById('ready-overlay').style.display = 'flex';
    document.getElementById('pause-btn').style.display = 'none';
});

socket.on('game_paused', () => {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.textContent = "▶ RESUME";
});
