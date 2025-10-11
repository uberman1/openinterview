
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os, secrets, string
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from dotenv import load_dotenv
from addons.auth_ext import router as auth_ext_router
from addons.notify_ext import router as notify_ext_router
from addons.security_ext import router as security_ext_router
from addons.stripe_ext_live import router as stripe_ext_live_router

load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL","sqlite:///./app.db")
STRIPE_MODE = os.getenv("STRIPE_MODE","mock")
BASE_URL = os.getenv("BASE_URL","http://127.0.0.1:8000")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    stripe_customer_id = Column(String, nullable=True)
    subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, nullable=True)
    subscription_plan = Column(String, nullable=True)
    last4 = Column(String, nullable=True)
    profiles = relationship("Profile", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    headline = Column(String)
    bio = Column(Text)
    avatar_url = Column(String)
    is_published = Column(Boolean, default=False)
    public_slug = Column(String, unique=True, index=True)
    user = relationship("User", back_populates="profiles")
    slots = relationship("Slot", back_populates="profile")

class Slot(Base):
    __tablename__ = "slots"
    id = Column(Integer, primary_key=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    date = Column(String)  # ISO date
    time = Column(String)  # HH:MM
    timezone = Column(String)
    status = Column(String)  # open, booked, closed
    profile = relationship("Profile", back_populates="slots")

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(Integer, primary_key=True)
    filename = Column(String)
    mime = Column(String)
    size = Column(Integer)
    owner_user_id = Column(Integer, nullable=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="OpenInterview MVP API", version="0.1.0")
app.include_router(auth_ext_router)
app.include_router(notify_ext_router)
app.include_router(security_ext_router)
app.include_router(stripe_ext_live_router)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "dev-secret-key"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResetRequest(BaseModel):
    email: str

class ApplyReset(BaseModel):
    token: str
    new_password: str

class ProfileIn(BaseModel):
    user_id: int
    name: str
    headline: Optional[str] = ""
    bio: Optional[str] = ""
    avatar_url: Optional[str] = ""
    is_published: bool = False
    public_slug: Optional[str] = None

class ProfileOut(ProfileIn):
    id: int

class SlotIn(BaseModel):
    profile_id: int
    date: str
    time: str
    timezone: str
    status: str = "open"

class UploadIn(BaseModel):
    filename: str
    mime: str
    size: int

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def slugify(name: str) -> str:
    s = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")
    return s or "profile"

@app.get("/health")
def health():
    return {"status":"ok"}

@app.post("/api/auth/reset")
def request_reset(payload: ResetRequest):
    return {"ok": True, "message": "Reset email sent (simulated)"}

@app.post("/api/auth/apply-reset")
def apply_reset(payload: ApplyReset):
    if len(payload.token) < 4:
        raise HTTPException(status_code=400, detail="Invalid token")
    return {"ok": True, "message":"Password updated (simulated)"}

@app.post("/api/stripe/checkout")
def stripe_checkout(user_id: int, plan: str = "pro"):
    if STRIPE_MODE == "mock":
        return {"url": f"{BASE_URL}/subscription/success.html?plan={plan}"}
    return {"url": f"{BASE_URL}/subscription/success.html?plan={plan}"}

@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    body = await request.json()
    user_id = body.get("user_id", 1)
    last4 = body.get("last4", "4242")
    plan = body.get("plan", "pro")
    status = body.get("status", "active")
    db = next(get_db())
    user = db.query(User).filter(User.id==user_id).first()
    if not user:
        user = User(id=user_id, email=f"user{user_id}@example.com")
        db.add(user)
    user.subscription_plan = plan
    user.subscription_status = status
    user.last4 = last4[:4] if last4 else None
    db.commit()
    return {"received": True}

@app.get("/api/stripe/portal")
def stripe_portal(user_id: int = 1):
    return {"url": f"{BASE_URL}/subscription_test.html"}

@app.post("/api/profile", response_model=ProfileOut)
def upsert_profile(p: ProfileIn):
    db = next(get_db())
    slug = p.public_slug or slugify(p.name)
    existing = db.query(Profile).filter(Profile.user_id==p.user_id, Profile.public_slug==slug).first()
    if existing:
        existing.name = p.name
        existing.headline = p.headline or ""
        existing.bio = p.bio or ""
        existing.avatar_url = p.avatar_url or ""
        existing.is_published = p.is_published
        db.commit()
        return ProfileOut(id=existing.id, **p.model_dump())
    obj = Profile(user_id=p.user_id, name=p.name, headline=p.headline or "", bio=p.bio or "",
                  avatar_url=p.avatar_url or "", is_published=p.is_published, public_slug=slug)
    db.add(obj); db.commit(); db.refresh(obj)
    return ProfileOut(id=obj.id, **p.model_dump())

@app.get("/api/profile/{slug}")
def get_profile(slug: str):
    db = next(get_db())
    prof = db.query(Profile).filter(Profile.public_slug==slug).first()
    if not prof or (not prof.is_published):
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "id": prof.id,
        "name": prof.name,
        "headline": prof.headline,
        "bio": prof.bio,
        "avatar_url": prof.avatar_url,
        "public_slug": prof.public_slug,
    }

@app.get("/api/availability/{profile_id}")
def list_slots(profile_id: int):
    db = next(get_db())
    slots = db.query(Slot).filter(Slot.profile_id==profile_id).all()
    return [{
        "id": s.id, "date": s.date, "time": s.time, "timezone": s.timezone, "status": s.status
    } for s in slots]

@app.post("/api/availability")
def upsert_slots(items: List[SlotIn]):
    db = next(get_db())
    out = []
    for it in items:
        s = Slot(profile_id=it.profile_id, date=it.date, time=it.time, timezone=it.timezone, status=it.status)
        db.add(s); db.commit(); db.refresh(s)
        out.append({"id": s.id, "date": s.date, "time": s.time, "timezone": s.timezone, "status": s.status})
    return out

@app.post("/api/uploads")
def create_upload(u: UploadIn):
    db = next(get_db())
    rec = Upload(filename=u.filename, mime=u.mime, size=u.size)
    db.add(rec); db.commit(); db.refresh(rec)
    return {
        "id": rec.id,
        "upload_url": f"{BASE_URL}/uploads/mock/{rec.id}",
        "filename": rec.filename, "mime": rec.mime, "size": rec.size
    }

@app.get("/api/uploads/{upload_id}")
def get_upload(upload_id: int):
    db = next(get_db())
    rec = db.query(Upload).filter(Upload.id==upload_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Not Found")
    return {"id": rec.id, "filename": rec.filename, "mime": rec.mime, "size": rec.size}

app.mount("/public", StaticFiles(directory="../public"), name="public")
