from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Message, User
from database import db
from sqlalchemy import or_, and_

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/messages/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_messages(other_user_id):
    current_user_id = int(get_jwt_identity())
    messages = Message.query.filter(
        or_(
            and_(Message.sender_id == current_user_id, Message.receiver_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.receiver_id == current_user_id)
        )
    ).order_by(Message.created_at.asc()).all()
    
    result = []
    for m in messages:
        result.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        })
    return jsonify(result), 200

@chat_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    current_user_id = int(get_jwt_identity())
    
    # Get all distinct users this user has messaged with
    messages = Message.query.filter(
        or_(Message.sender_id == current_user_id, Message.receiver_id == current_user_id)
    ).all()
    
    other_user_ids = set()
    for m in messages:
        if m.sender_id != current_user_id:
            other_user_ids.add(m.sender_id)
        if m.receiver_id != current_user_id:
            other_user_ids.add(m.receiver_id)
            
    users = User.query.filter(User.id.in_(other_user_ids)).all()
    result = [{"id": u.id, "name": u.name, "role": u.role} for u in users]
    
    return jsonify(result), 200
