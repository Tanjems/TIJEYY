function createGame() {
    // Instant UI feedback so it doesn't feel frozen
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('waiting-screen').style.display = 'flex';
    document.getElementById('room-code-display').textContent = "Creating room...";

    console.log("🔥 Create Game clicked - emitting to server");
    socket.emit('create_game');
}

function showJoinScreen() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('join-screen').style.display = 'flex';
}

function backFromWaiting() {
    if (myRoom) {
        socket.emit('leave_game', { room: myRoom });
    }
    myRoom = null;
    mySide = null;
    gameState = {};

    document.getElementById('waiting-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
}

function joinGame() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (code.length === 4) socket.emit('join_game', {room: code});
    else alert('4 characters please!');
}

function backToMenu() {
    document.getElementById('join-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
}

function playAgain() {
    if (myRoom) socket.emit('restart_game', {room: myRoom});
    document.getElementById('game-over-screen').style.display = 'none';
}

function exitToMenu() {
    if (myRoom) socket.emit('leave_game', {room: myRoom});
    location.reload();
}
