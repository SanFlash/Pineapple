from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Job, Application, User
from database import db

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('/jobs', methods=['GET'])
def get_jobs():
    search = request.args.get('search', '').lower()
    
    if search:
        jobs = Job.query.filter(
            Job.title.ilike(f'%{search}%') | Job.company.ilike(f'%{search}%')
        ).all()
    else:
        jobs = Job.query.all()
        
    result = []
    for job in jobs:
        result.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salary": job.salary,
            "type": job.job_type,
            "tags": job.tags.split(',') if job.tags else [],
            "description": job.description,
            "hirer_id": job.hirer_id
        })
    return jsonify(result), 200

@jobs_bp.route('/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = Job.query.get(job_id)
    if job:
        return jsonify({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salary": job.salary,
            "type": job.job_type,
            "tags": job.tags.split(',') if job.tags else [],
            "description": job.description,
            "hirer_id": job.hirer_id
        }), 200
    return jsonify({"msg": "Job not found"}), 404

@jobs_bp.route('/jobs', methods=['POST'])
@jwt_required()
def create_job():
    user_id = int(get_jwt_identity())
    role = get_jwt().get('role')
    if role != 'Hirer':
        return jsonify({"msg": "Unauthorized. Only Hirers can create jobs."}), 403
    
    data = request.json
    new_job = Job(
        title=data.get('title'),
        company=data.get('company'),
        location=data.get('location'),
        salary=data.get('salary'),
        job_type=data.get('type'),
        tags=','.join(data.get('tags', [])),
        description=data.get('description'),
        hirer_id=user_id
    )
    db.session.add(new_job)
    db.session.commit()
    
    return jsonify({"msg": "Job created", "id": new_job.id}), 201

@jobs_bp.route('/jobs/<int:job_id>/apply', methods=['POST'])
@jwt_required()
def apply_job(job_id):
    user_id = int(get_jwt_identity())
    role = get_jwt().get('role')
    if role != 'Candidate':
        return jsonify({"msg": "Only candidates can apply to jobs"}), 403

    # Check if already applied
    existing = Application.query.filter_by(job_id=job_id, candidate_id=user_id).first()
    if existing:
        return jsonify({"msg": "Already applied"}), 400

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"msg": "Job not found"}), 404

    app = Application(job_id=job_id, candidate_id=user_id)
    db.session.add(app)
    db.session.commit()

    return jsonify({"msg": "Application submitted successfully"}), 201

@jobs_bp.route('/applications', methods=['GET'])
@jwt_required()
def get_applications():
    user_id = int(get_jwt_identity())
    role = get_jwt().get('role')

    if role == 'Candidate':
        # Get jobs the candidate applied to
        apps = Application.query.filter_by(candidate_id=user_id).all()
        result = []
        for a in apps:
            job = Job.query.get(a.job_id)
            result.append({
                "application_id": a.id,
                "job_id": job.id,
                "title": job.title,
                "company": job.company,
                "status": a.status,
                "applied_at": a.created_at
            })
        return jsonify(result), 200

    elif role == 'Hirer':
        # Get applications for jobs created by the hirer
        jobs = Job.query.filter_by(hirer_id=user_id).all()
        job_ids = [j.id for j in jobs]
        apps = Application.query.filter(Application.job_id.in_(job_ids)).all()
        
        result = []
        for a in apps:
            job = Job.query.get(a.job_id)
            candidate = User.query.get(a.candidate_id)
            result.append({
                "application_id": a.id,
                "job_id": job.id,
                "title": job.title,
                "candidate_name": candidate.name,
                "candidate_email": candidate.email,
                "status": a.status,
                "applied_at": a.created_at
            })
        return jsonify(result), 200

    return jsonify({"msg": "Unauthorized"}), 403
