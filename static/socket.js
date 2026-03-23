const socket = io(window.location.origin, {
    transports: ["websocket"]
});

let myRoom = null;
let mySide = null;
let gameState = {};

socket.on('room_created', (d) => { myRoom = d.room; document.getElementById('room-code-display').textContent = d.room; document.getElementById('menu-screen').style.display='none'; document.getElementById('waiting-screen').style.display='flex'; });
socket.on('joined', (d) => { myRoom = d.room; document.getElementById('menu-screen').style.display='none'; document.getElementById('waiting-screen').style.display='flex'; });
socket.on('player_assigned', (d) => { mySide = d.side; });
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
    if (!state) return;  // safety check
    gameState = state;

    const ballVx = state.ball_vx ?? 0; // default 0 if undefined
    const ballVy = state.ball_vy ?? 0;

    if (ballVx === 0 && ballVy === 0) {
        const countdownEl = document.getElementById('countdown-number');
        if (countdownEl) countdownEl.textContent = 'Ready?';
        const countdownScreen = document.getElementById('countdown-screen');
        if (countdownScreen) countdownScreen.style.display = 'flex';
    } else {
        const countdownScreen = document.getElementById('countdown-screen');
        if (countdownScreen) countdownScreen.style.display = 'none';
    }
});
socket.on('game_over', (d) => {
    document.getElementById('winner-text').textContent = d.winner + ' WINS!';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'flex';
});
socket.on('opponent_joined', () => {
    document.getElementById('waiting-screen').style.display = 'none';
    document.getElementById('countdown-screen').style.display = 'flex';
});
socket.on('join_error', (d) => { alert(d.message); });
