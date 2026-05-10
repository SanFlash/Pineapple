from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from models import User
from database import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.id), additional_claims={"email": email, "role": user.role})
        return jsonify(access_token=access_token, user={"id": user.id, "email": email, "name": user.name, "role": user.role}), 200

    return jsonify({"msg": "Bad email or password"}), 401

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', 'New User')
    role = data.get('role', 'Candidate')

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "User already exists"}), 400

    new_user = User(
        email=email,
        password_hash=generate_password_hash(password),
        name=name,
        role=role
    )
    db.session.add(new_user)
    db.session.commit()

    access_token = create_access_token(identity=str(new_user.id), additional_claims={"email": email, "role": role})
    return jsonify(access_token=access_token, user={"id": new_user.id, "email": email, "name": name, "role": role}), 201
