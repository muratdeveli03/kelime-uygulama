from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv
import io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    class_level: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentCreate(BaseModel):
    code: str
    name: str
    class_level: str

class Word(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_level: str
    english: str
    turkish_meanings: List[str]  # Multiple meanings separated by semicolon in input
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WordCreate(BaseModel):
    class_level: str
    english: str
    turkish: str  # Will be split by semicolon

class Progress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_code: str
    word_id: str
    box_number: int = 1  # Boxes 1-5
    last_studied_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudySession(BaseModel):
    student_code: str
    word_id: str
    answer: str
    is_correct: bool

class StudyResponse(BaseModel):
    word_id: str
    english: str
    is_correct: bool
    correct_answers: List[str]
    new_box: int
    message: str

class StudentStats(BaseModel):
    total_words: int
    box_distribution: Dict[str, int]  # box_1, box_2, etc.
    words_studied_today: int
    next_study_words: int

class AdminLogin(BaseModel):
    password: str

# Admin password hash (sefer1295)
ADMIN_PASSWORD_HASH = hashlib.sha256("sefer1295".encode()).hexdigest()

# Helper Functions
def is_midnight_passed(last_date: Optional[datetime]) -> bool:
    """Check if midnight has passed since last study date"""
    if not last_date:
        return True
    
    now = datetime.now(timezone.utc)
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_midnight = last_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    return today_midnight > last_midnight

async def get_student_words_for_study(student_code: str):
    """Get words for student to study today, starting from highest box"""
    student = await db.students.find_one({"code": student_code})
    if not student:
        return []
    
    # Get all words for student's class
    class_words = await db.words.find({"class_level": student["class_level"]}).to_list(None)
    
    words_to_study = []
    
    for word in class_words:
        # Check if student has progress for this word
        progress = await db.progress.find_one({
            "student_code": student_code,
            "word_id": word["id"]
        })
        
        if not progress:
            # Create new progress entry for Box 1
            new_progress = Progress(
                student_code=student_code,
                word_id=word["id"],
                box_number=1,
                last_studied_date=None
            )
            await db.progress.insert_one(new_progress.dict())
            words_to_study.append({
                "word": word,
                "box": 1,
                "can_study": True
            })
        else:
            # Check if can study today (midnight rule)
            can_study_today = is_midnight_passed(progress.get("last_studied_date"))
            
            # Don't study words in box 5 unless it's a new day and they haven't been studied
            if progress["box_number"] == 5:
                if can_study_today and not progress.get("last_studied_date"):
                    words_to_study.append({
                        "word": word,
                        "box": progress["box_number"],
                        "can_study": True
                    })
            else:
                if can_study_today:
                    words_to_study.append({
                        "word": word,
                        "box": progress["box_number"],
                        "can_study": True
                    })
    
    # Sort by box number (highest first, but not box 5)
    available_words = [w for w in words_to_study if w["can_study"] and w["box"] < 5]
    box5_words = [w for w in words_to_study if w["can_study"] and w["box"] == 5]
    
    # Sort available words by box (descending)
    available_words.sort(key=lambda x: x["box"], reverse=True)
    
    return available_words + box5_words

# API Endpoints

# Student Authentication
@api_router.post("/auth/student")
async def student_login(code: str = Form(...)):
    student = await db.students.find_one({"code": code})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "success": True,
        "student": {
            "code": student["code"],
            "name": student["name"],
            "class_level": student["class_level"]
        }
    }

# Admin Authentication
@api_router.post("/auth/admin")
async def admin_login(credentials: AdminLogin):
    password_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    if password_hash != ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    
    return {"success": True, "message": "Admin authenticated successfully"}

# Get next word to study
@api_router.get("/study/{student_code}/next-word")
async def get_next_word(student_code: str):
    words_to_study = await get_student_words_for_study(student_code)
    
    if not words_to_study:
        return {
            "completed": True,
            "message": "Bugünlük çalışma tamamlandı! 🎉 Yarın tekrar gel!"
        }
    
    next_word = words_to_study[0]
    return {
        "completed": False,
        "word_id": next_word["word"]["id"],
        "english": next_word["word"]["english"],
        "current_box": next_word["box"],
        "remaining_words": len(words_to_study)
    }

# Submit answer
@api_router.post("/study/answer")
async def submit_answer(session: StudySession):
    # Get the word
    word = await db.words.find_one({"id": session.word_id})
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    # Check if answer is correct (exact match, case insensitive)
    turkish_meanings = word["turkish_meanings"]
    user_answer = session.answer.strip().lower()
    is_correct = any(meaning.strip().lower() == user_answer for meaning in turkish_meanings)
    
    # Get current progress
    progress = await db.progress.find_one({
        "student_code": session.student_code,
        "word_id": session.word_id
    })
    
    current_box = progress["box_number"] if progress else 1
    new_box = current_box
    
    # Update box based on answer
    if is_correct and current_box < 5:
        new_box = current_box + 1
        message = f"Doğru! Kelime {new_box}. kutuya geçti! 📦✨"
    elif is_correct and current_box == 5:
        new_box = 5
        message = "Mükemmel! Kelime son kutuda kalıyor! 🏆"
    else:
        message = f"Yanlış! Kelime {current_box}. kutuda kaldı. 📝"
    
    # Update progress
    await db.progress.update_one(
        {"student_code": session.student_code, "word_id": session.word_id},
        {
            "$set": {
                "box_number": new_box,
                "last_studied_date": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return StudyResponse(
        word_id=session.word_id,
        english=word["english"],
        is_correct=is_correct,
        correct_answers=turkish_meanings,
        new_box=new_box,
        message=message
    )

# Get student statistics
@api_router.get("/student/{student_code}/stats")
async def get_student_stats(student_code: str):
    student = await db.students.find_one({"code": student_code})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all words for student's class
    total_words = await db.words.count_documents({"class_level": student["class_level"]})
    
    # Get progress distribution
    progress_pipeline = [
        {"$match": {"student_code": student_code}},
        {"$group": {"_id": "$box_number", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    box_stats = await db.progress.aggregate(progress_pipeline).to_list(None)
    box_distribution = {f"box_{i}": 0 for i in range(1, 6)}
    
    for stat in box_stats:
        box_distribution[f"box_{stat['_id']}"] = stat["count"]
    
    # Words studied today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    words_studied_today = await db.progress.count_documents({
        "student_code": student_code,
        "last_studied_date": {"$gte": today_start}
    })
    
    # Next study words count
    words_to_study = await get_student_words_for_study(student_code)
    next_study_words = len(words_to_study)
    
    return StudentStats(
        total_words=total_words,
        box_distribution=box_distribution,
        words_studied_today=words_studied_today,
        next_study_words=next_study_words
    )

# Get all words with their box status for a student
@api_router.get("/student/{student_code}/words")
async def get_student_words(student_code: str):
    student = await db.students.find_one({"code": student_code})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all words for student's class
    class_words = await db.words.find({"class_level": student["class_level"]}).to_list(None)
    
    result = []
    for word in class_words:
        progress = await db.progress.find_one({
            "student_code": student_code,
            "word_id": word["id"]
        })
        
        result.append({
            "id": word["id"],
            "english": word["english"],
            "turkish_meanings": word["turkish_meanings"],
            "box": progress["box_number"] if progress else 1,
            "last_studied": progress.get("last_studied_date") if progress else None
        })
    
    # Sort by box number
    result.sort(key=lambda x: x["box"])
    return result

# Admin endpoints
@api_router.post("/admin/upload-students")
async def upload_students(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV format")
    
    content = await file.read()
    csv_content = io.StringIO(content.decode('utf-8'))
    csv_reader = csv.reader(csv_content)
    
    students_added = 0
    students_updated = 0
    
    for row in csv_reader:
        if len(row) != 3:
            continue
        
        code, name, class_level = [field.strip() for field in row]
        
        # Check if student exists
        existing = await db.students.find_one({"code": code})
        
        if existing:
            # Update existing student
            await db.students.update_one(
                {"code": code},
                {"$set": {"name": name, "class_level": class_level}}
            )
            students_updated += 1
        else:
            # Add new student
            student = Student(code=code, name=name, class_level=class_level)
            await db.students.insert_one(student.dict())
            students_added += 1
    
    return {
        "success": True,
        "students_added": students_added,
        "students_updated": students_updated
    }

@api_router.post("/admin/upload-words")
async def upload_words(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV format")
    
    content = await file.read()
    csv_content = io.StringIO(content.decode('utf-8'))
    csv_reader = csv.reader(csv_content)
    
    words_added = 0
    
    for row in csv_reader:
        if len(row) != 3:
            continue
        
        class_level, english, turkish = [field.strip() for field in row]
        
        # Split Turkish meanings by semicolon
        turkish_meanings = [meaning.strip() for meaning in turkish.split(';')]
        
        # Check if word already exists for this class
        existing = await db.words.find_one({
            "class_level": class_level,
            "english": english.lower()
        })
        
        if not existing:
            word = Word(
                class_level=class_level,
                english=english,
                turkish_meanings=turkish_meanings
            )
            await db.words.insert_one(word.dict())
            words_added += 1
    
    return {
        "success": True,
        "words_added": words_added
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()