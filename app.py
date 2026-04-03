import random
import string
import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ping-pong-secret-key-2026'

# FIXED FOR RENDER.COM
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins='*')

rooms = {}

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

def reset_ball(state):
    state['ball_x'] = 400
    state['ball_y'] = 300
    state['ball_vx'] = 0
    state['ball_vy'] = 0

def start_ball(state):
    state['ball_vx'] = random.choice([-5, 5])
    state['ball_vy'] = random.randint(-3, 3)

def game_loop(room):
    if room not in rooms: return
    state = rooms[room]['game_state']
    print(f"[DEBUG] game_loop STARTED for room {room}")   # ← this proves loop is alive
    
    while rooms[room].get('running', False) and not rooms[room].get('paused', False):
        state['ball_x'] += state['ball_vx']
        state['ball_y'] += state['ball_vy']

        if state['ball_y'] <= 10 or state['ball_y'] >= 590:
            state['ball_vy'] *= -1

        # Paddle collision (same as before - proven safe)
        if (state['ball_vx'] < 0 and 
            state['ball_x'] <= 30 and state['ball_x'] >= 15 and
            state['paddle1_y'] <= state['ball_y'] <= state['paddle1_y'] + 100):
            state['ball_vx'] *= -1
            hit = (state['ball_y'] - state['paddle1_y']) / 100 - 0.5
            state['ball_vy'] = hit * 8

        if (state['ball_vx'] > 0 and 
            state['ball_x'] >= 770 and state['ball_x'] <= 785 and
            state['paddle2_y'] <= state['ball_y'] <= state['paddle2_y'] + 100):
            state['ball_vx'] *= -1
            hit = (state['ball_y'] - state['paddle2_y']) / 100 - 0.5
            state['ball_vy'] = hit * 8

        # === DEBUG PRINTS (only near scoring zone - no spam) ===
        if state['ball_x'] < 50 or state['ball_x'] > 750 or state['ball_x'] < 0 or state['ball_x'] > 800:
            print(f"[DEBUG {room}] ball_x={state['ball_x']:.1f} vx={state['ball_vx']:.1f} y={state['ball_y']:.1f} score={state['score1']}-{state['score2']} running={rooms[room]['running']}")

        if state['ball_x'] < 0:
            print(f"*** POINT SCORED for Player 2! New score {state['score1']}-{state['score2']+1} ***")
            state['score2'] += 1
            reset_ball(state)
            rooms[room]['ready_players'] = set()
            emit('point_scored', state, room=room)
            socketio.sleep(0.8)
            if state['score2'] >= 5:
                emit('game_over', {'winner': 'Player 2'}, room=room)
                rooms[room]['running'] = False
                break
        elif state['ball_x'] > 800:
            print(f"*** POINT SCORED for Player 1! New score {state['score1']+1}-{state['score2']} ***")
            state['score1'] += 1
            reset_ball(state)
            rooms[room]['ready_players'] = set()
            emit('point_scored', state, room=room)
            socketio.sleep(0.8)
            if state['score1'] >= 5:
                emit('game_over', {'winner': 'Player 1'}, room=room)
                rooms[room]['running'] = False
                break

        emit('game_update', state, room=room)
        socketio.sleep(0.0167)

# ====================== rest of your routes and socket events (unchanged) ======================
@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('create_game')
def handle_create_game():
    room = generate_room_code()
    sid = request.sid
    rooms[room] = {
        'players': {sid: {'side': 'left'}},
        'game_state': {'ball_x': 400, 'ball_y': 300, 'ball_vx': 0, 'ball_vy': 0,
                       'paddle1_y': 250, 'paddle2_y': 250, 'score1': 0, 'score2': 0},
        'running': False,
        'paused': False,
        'ready_players': set()
    }
    join_room(room)
    emit('room_created', {'room': room}, to=sid)
    emit('player_assigned', {'side': 'left'}, to=sid)

@socketio.on('join_game')
def handle_join_game(data):
    room = data.get('room')
    if room in rooms and len(rooms[room]['players']) < 2:
        sid = request.sid
        rooms[room]['players'][sid] = {'side': 'right'}
        join_room(room)
        emit('joined', {'room': room}, to=sid)
        emit('player_assigned', {'side': 'right'}, to=sid)
        if len(rooms[room]['players']) == 2:
            socketio.start_background_task(countdown_and_start, room)
    else:
        emit('join_error', {'message': 'Invalid or full room code'}, to=request.sid)

def countdown_and_start(room):
    for i in range(3, 0, -1):
        socketio.emit('countdown', {'number': str(i)}, room=room)
        socketio.sleep(1)
    socketio.emit('countdown', {'number': 'GO!'}, room=room)
    socketio.sleep(0.8)
    
    rooms[room]['running'] = True
    rooms[room]['ready_players'] = set()
    socketio.start_background_task(game_loop, room)
    socketio.emit('show_ready_buttons', room=room)

@socketio.on('player_ready')
def handle_player_ready(data):
    room = data.get('room')
    if room in rooms and rooms[room].get('running'):
        sid = request.sid
        rooms[room]['ready_players'].add(sid)
        if len(rooms[room]['ready_players']) == 2:
            start_ball(rooms[room]['game_state'])
            socketio.emit('game_update', rooms[room]['game_state'], room=room)
            socketio.emit('both_ready', room=room)

@socketio.on('pause_game')
def handle_pause_game(data):
    room = data.get('room')
    if room in rooms:
        rooms[room]['paused'] = True
        socketio.emit('game_paused', room=room)

@socketio.on('resume_game')
def handle_resume_game(data):
    room = data.get('room')
    if room in rooms:
        rooms[room]['paused'] = False

@socketio.on('update_paddle')
def handle_update_paddle(data):
    room = data.get('room')
    y = data.get('y')
    sid = request.sid
    if room in rooms and sid in rooms[room]['players']:
        side = rooms[room]['players'][sid]['side']
        key = 'paddle1_y' if side == 'left' else 'paddle2_y'
        rooms[room]['game_state'][key] = max(0, min(500, y))

@socketio.on('restart_game')
def handle_restart(data):
    room = data.get('room')
    if room in rooms:
        state = rooms[room]['game_state']
        state['score1'] = state['score2'] = 0
        reset_ball(state)
        rooms[room]['running'] = False
        rooms[room]['paused'] = False
        rooms[room]['ready_players'] = set()
        socketio.start_background_task(countdown_and_start, room)

@socketio.on('leave_game')
def handle_leave_game(data):
    room = data.get('room')
    sid = request.sid
    if room in rooms and sid in rooms[room].get('players', {}):
        leave_room(room)
        del rooms[room]['players'][sid]
        if len(rooms[room]['players']) == 0:
            del rooms[room]
        else:
            socketio.emit('opponent_left', {}, room=room)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    for room in list(rooms.keys()):
        if sid in rooms[room].get('players', {}):
            socketio.emit('opponent_left', {}, room=room)
            del rooms[room]['players'][sid]
            if not rooms[room]['players']:
                del rooms[room]
            break

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
