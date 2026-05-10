from app import app
from database import db
from models import User, Job
from werkzeug.security import generate_password_hash

def seed_db():
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()

        # Add test user
        test_user = User(
            email="test1@example.com",
            password_hash=generate_password_hash("Password123"),
            name="Test Candidate",
            role="Candidate"
        )
        hirer = User(
            email="hirer@example.com",
            password_hash=generate_password_hash("password123"),
            name="Test Hirer",
            role="Hirer"
        )
        db.session.add(test_user)
        db.session.add(hirer)
        db.session.commit()

        # Add mock jobs
        mock_jobs = [
            Job(title="Senior Frontend Developer", company="TechNova", location="Remote", salary="$120k - $150k", job_type="Full-time", tags="React,Tailwind,GSAP", description="Looking for a wizard.", hirer_id=hirer.id),
            Job(title="Backend Engineer (Python)", company="Pineapple Inc.", location="New York, NY", salary="$130k - $160k", job_type="Hybrid", tags="Python,Flask,PostgreSQL", description="Build scalable APIs.", hirer_id=hirer.id),
            Job(title="UI/UX Designer", company="CreativeMinds", location="San Francisco, CA", salary="$90k - $120k", job_type="Contract", tags="Figma,Three.js,Design", description="Craft beautiful UI.", hirer_id=hirer.id)
        ]
        db.session.add_all(mock_jobs)
        db.session.commit()
        print("Database seeded successfully!")

if __name__ == '__main__':
    seed_db()
