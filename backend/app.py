import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO, emit, join_room
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from routes.auth import auth_bp
from routes.jobs import jobs_bp
from routes.chat import chat_bp

from database import db
from models import User, Job, Application, Message

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)

# Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'super-secret-key-change-in-production')

if os.environ.get('RENDER'):
    db_path = '/var/data/pineapple.db'
else:
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), '../database/pineapple.db')

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*")

with app.app_context():
    db.create_all()

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(jobs_bp, url_prefix='/api')
app.register_blueprint(chat_bp, url_prefix='/api')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path.startswith('api/') or path.startswith('css/') or path.startswith('js/'):
        return {"error": "Not Found"}, 404
    return app.send_static_file('index.html')

# SocketIO Events
@socketio.on('join')
def on_join(data):
    user_id = data.get('user_id')
    if user_id:
        room = f"user_{user_id}"
        join_room(room)

@socketio.on('send_message')
def handle_send_message(data):
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    content = data.get('content')

    if sender_id and receiver_id and content:
        # Save to database
        msg = Message(sender_id=sender_id, receiver_id=receiver_id, content=content)
        db.session.add(msg)
        db.session.commit()

        message_data = {
            "id": msg.id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "content": content,
            "created_at": msg.created_at.isoformat()
        }

        # Emit to receiver
        room = f"user_{receiver_id}"
        emit('receive_message', message_data, room=room)
        
        # Emit to sender as well (for multi-device sync)
        emit('receive_message', message_data, room=f"user_{sender_id}")

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
