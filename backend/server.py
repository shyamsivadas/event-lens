from fastapi import FastAPI, APIRouter, HTTPException, Response, Cookie, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import httpx
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from PIL import Image
import io
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class Event(BaseModel):
    event_id: str
    host_id: str
    name: str
    date: str
    logo_url: Optional[str] = None
    filter_type: str = "warm"
    max_photos: int = 5
    flipbook_style: str = "memory_archive"
    share_url: str
    created_at: datetime

class EventCreate(BaseModel):
    name: str
    date: str
    logo_url: Optional[str] = None
    filter_type: str = "warm"
    max_photos: int = 5
    flipbook_style: str = "memory_archive"  # memory_archive, typography_collage, minimalist_story

class Photo(BaseModel):
    photo_id: str
    event_id: str
    device_id: str
    filename: str
    s3_key: str
    note: Optional[str] = None
    uploaded_at: datetime

class PresignedURLRequest(BaseModel):
    event_id: str
    device_id: str
    filename: str
    content_type: str

def get_r2_client():
    r2_account_id = os.getenv('R2_ACCOUNT_ID')
    r2_access_key = os.getenv('R2_ACCESS_KEY_ID')
    r2_secret_key = os.getenv('R2_SECRET_ACCESS_KEY')
    
    if not all([r2_account_id, r2_access_key, r2_secret_key]):
        return None
    
    return boto3.client(
        's3',
        endpoint_url=f'https://{r2_account_id}.r2.cloudflarestorage.com',
        aws_access_key_id=r2_access_key,
        aws_secret_access_key=r2_secret_key,
        config=Config(signature_version='s3v4')
    )

async def get_current_user(session_token: Optional[str] = Cookie(None)):
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

@api_router.post("/auth/session")
async def process_session(session_id: str):
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid session")
            
            data = response.json()
            
            user_doc = await db.users.find_one(
                {"email": data["email"]},
                {"_id": 0}
            )
            
            if not user_doc:
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                user_doc = {
                    "user_id": user_id,
                    "email": data["email"],
                    "name": data["name"],
                    "picture": data.get("picture"),
                    "created_at": datetime.now(timezone.utc)
                }
                await db.users.insert_one(user_doc)
            else:
                user_id = user_doc["user_id"]
            
            session_token = data["session_token"]
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.insert_one({
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc)
            })
            
            response_data = JSONResponse(content={
                "user_id": user_id,
                "email": user_doc["email"],
                "name": user_doc["name"],
                "picture": user_doc.get("picture")
            })
            
            response_data.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
                secure=True,
                samesite="none",
                max_age=7*24*60*60,
                path="/"
            )
            
            return response_data
    
    except Exception as e:
        logger.error(f"Session processing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process session")

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response

@api_router.post("/events")
async def create_event(event_data: EventCreate, current_user: User = Depends(get_current_user)):
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    share_url = hashlib.md5(f"{event_id}{current_user.user_id}".encode()).hexdigest()[:8]
    
    event_doc = {
        "event_id": event_id,
        "host_id": current_user.user_id,
        "name": event_data.name,
        "date": event_data.date,
        "logo_url": event_data.logo_url,
        "filter_type": event_data.filter_type,
        "max_photos": event_data.max_photos,
        "flipbook_style": event_data.flipbook_style,
        "share_url": share_url,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.events.insert_one(event_doc)
    return Event(**event_doc)

@api_router.get("/events")
async def list_events(current_user: User = Depends(get_current_user)):
    events = await db.events.find(
        {"host_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str, current_user: User = Depends(get_current_user)):
    event_doc = await db.events.find_one(
        {"event_id": event_id, "host_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return event_doc

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: User = Depends(get_current_user)):
    result = await db.events.delete_one({"event_id": event_id, "host_id": current_user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted"}

@api_router.get("/events/{event_id}/photos")
async def get_event_photos(event_id: str, current_user: User = Depends(get_current_user)):
    event_doc = await db.events.find_one(
        {"event_id": event_id, "host_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    photos = await db.photos.find(
        {"event_id": event_id},
        {"_id": 0}
    ).to_list(10000)
    
    r2_client = get_r2_client()
    if r2_client:
        bucket_name = os.getenv('R2_BUCKET_NAME', 'event-photos')
        for photo in photos:
            try:
                presigned_url = r2_client.generate_presigned_url(
                    ClientMethod='get_object',
                    Params={
                        'Bucket': bucket_name,
                        'Key': photo['s3_key']
                    },
                    ExpiresIn=3600
                )
                photo['download_url'] = presigned_url
            except Exception as e:
                logger.error(f"Failed to generate download URL: {e}")
                photo['download_url'] = None
    
    return photos

@api_router.get("/guest/{share_url}")
async def get_guest_event(share_url: str):
    event_doc = await db.events.find_one(
        {"share_url": share_url},
        {"_id": 0}
    )
    
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return event_doc

@api_router.get("/guest/{share_url}/limit")
async def check_device_limit(share_url: str, device_id: str):
    event_doc = await db.events.find_one(
        {"share_url": share_url},
        {"_id": 0, "event_id": 1, "max_photos": 1}
    )
    
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    photo_count = await db.photos.count_documents({
        "event_id": event_doc["event_id"],
        "device_id": device_id
    })
    
    return {
        "used": photo_count,
        "max": event_doc["max_photos"],
        "remaining": event_doc["max_photos"] - photo_count
    }

@api_router.post("/guest/{share_url}/presigned-url")
async def get_guest_presigned_url(share_url: str, request: PresignedURLRequest):
    event_doc = await db.events.find_one(
        {"share_url": share_url},
        {"_id": 0}
    )
    
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    photo_count = await db.photos.count_documents({
        "event_id": event_doc["event_id"],
        "device_id": request.device_id
    })
    
    if photo_count >= event_doc["max_photos"]:
        raise HTTPException(status_code=403, detail="Photo limit reached")
    
    r2_client = get_r2_client()
    bucket_name = os.getenv('R2_BUCKET_NAME', 'event-photos')
    
    if not r2_client:
        raise HTTPException(status_code=500, detail="Storage not configured")
    
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    object_key = f"events/{event_doc['event_id']}/photos/{request.device_id}/{timestamp}-{request.filename}"
    
    try:
        presigned_url = r2_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket_name,
                'Key': object_key,
                'ContentType': request.content_type
            },
            ExpiresIn=600
        )
        
        return {
            "url": presigned_url,
            "object_key": object_key,
            "expires_in": 600
        }
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")

@api_router.post("/guest/{share_url}/track-upload")
async def track_upload(share_url: str, photo_data: dict):
    event_doc = await db.events.find_one(
        {"share_url": share_url},
        {"_id": 0, "event_id": 1}
    )
    
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    photo_doc = {
        "photo_id": f"pht_{uuid.uuid4().hex[:12]}",
        "event_id": event_doc["event_id"],
        "device_id": photo_data["device_id"],
        "filename": photo_data["filename"],
        "s3_key": photo_data["s3_key"],
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    await db.photos.insert_one(photo_doc)
    return {"success": True}

from reportlab.lib.colors import HexColor, black, white

def fetch_and_prepare_image(r2_client, bucket_name, s3_key):
    """Helper to fetch image from R2 and prepare it for PDF"""
    response = r2_client.get_object(Bucket=bucket_name, Key=s3_key)
    image_data = response['Body'].read()
    img = Image.open(io.BytesIO(image_data))
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGB')
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(temp_file.name, 'JPEG', quality=95)
    return img, temp_file.name

def generate_memory_archive_pdf(c, photos, event_doc, page_width, page_height, r2_client, bucket_name):
    """Style 1: Memory Archive - Documentary style with scattered grid layout"""
    margin = 40
    
    # Title Page - Dark cinematic style
    c.setFillColor(HexColor('#0a0a0a'))
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    
    # Decorative top line
    c.setStrokeColor(HexColor('#6366f1'))
    c.setLineWidth(3)
    c.line(margin, page_height / 2 + 100, page_width - margin, page_height / 2 + 100)
    
    # Title
    c.setFont("Helvetica-Bold", 52)
    c.setFillColor(white)
    title_text = event_doc['name']
    title_width = c.stringWidth(title_text, "Helvetica-Bold", 52)
    c.drawString((page_width - title_width) / 2, page_height / 2 + 30, title_text)
    
    # Subtitle
    c.setFont("Helvetica", 18)
    c.setFillColor(HexColor('#a78bfa'))
    subtitle_text = "MEMORY ARCHIVE"
    subtitle_width = c.stringWidth(subtitle_text, "Helvetica", 18)
    c.drawString((page_width - subtitle_width) / 2, page_height / 2 - 10, subtitle_text)
    
    # Date
    c.setFont("Helvetica", 14)
    c.setFillColor(HexColor('#9ca3af'))
    date_text = event_doc['date']
    date_width = c.stringWidth(date_text, "Helvetica", 14)
    c.drawString((page_width - date_width) / 2, page_height / 2 - 40, date_text)
    
    # Photo count badge
    c.setFont("Helvetica-Bold", 12)
    photo_count_text = f"{len(photos)} MOMENTS CAPTURED"
    count_width = c.stringWidth(photo_count_text, "Helvetica-Bold", 12)
    badge_x = (page_width - count_width) / 2 - 15
    badge_y = page_height / 2 - 80
    c.setFillColor(HexColor('#6366f1'))
    c.roundRect(badge_x, badge_y, count_width + 30, 26, 13, fill=1, stroke=0)
    c.setFillColor(white)
    c.drawString(badge_x + 15, badge_y + 7, photo_count_text)
    
    # Decorative bottom line
    c.setStrokeColor(HexColor('#6366f1'))
    c.line(margin, page_height / 2 - 130, page_width - margin, page_height / 2 - 130)
    c.showPage()
    
    # Photo pages - Scattered grid layout (2-3 photos per spread)
    photos_per_page = 2
    for i in range(0, len(photos), photos_per_page):
        page_photos = photos[i:i + photos_per_page]
        
        # Dark background
        c.setFillColor(HexColor('#111111'))
        c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
        
        for idx, photo in enumerate(page_photos):
            try:
                img, temp_path = fetch_and_prepare_image(r2_client, bucket_name, photo['s3_key'])
                
                # Calculate scattered positions
                if len(page_photos) == 1:
                    img_w = page_width * 0.7
                    img_h = page_height * 0.75
                    x = (page_width - img_w) / 2
                    y = (page_height - img_h) / 2
                else:
                    img_w = page_width * 0.45
                    img_h = page_height * 0.65
                    if idx == 0:
                        x = margin + 20
                        y = page_height - img_h - margin - 30
                    else:
                        x = page_width - img_w - margin - 20
                        y = margin + 50
                
                # Maintain aspect ratio
                img_ratio = img.width / img.height
                box_ratio = img_w / img_h
                if img_ratio > box_ratio:
                    display_w = img_w
                    display_h = img_w / img_ratio
                else:
                    display_h = img_h
                    display_w = img_h * img_ratio
                
                # Draw polaroid-style frame
                frame_padding = 8
                c.setFillColor(white)
                c.rect(x - frame_padding, y - frame_padding - 25, 
                       display_w + frame_padding * 2, display_h + frame_padding * 2 + 25, fill=1, stroke=0)
                
                c.drawImage(temp_path, x, y, width=display_w, height=display_h, preserveAspectRatio=True)
                
                # Photo number
                c.setFont("Helvetica", 9)
                c.setFillColor(HexColor('#666666'))
                c.drawString(x, y - 18, f"#{i + idx + 1}")
                
                os.unlink(temp_path)
            except Exception as e:
                logger.error(f"Memory Archive - Failed to add photo: {e}")
                continue
        
        # Page indicator
        c.setFont("Helvetica", 9)
        c.setFillColor(HexColor('#666666'))
        page_num = f"{(i // photos_per_page) + 1}"
        c.drawString(page_width - margin - 20, margin / 2, page_num)
        c.showPage()
    
    # Closing page
    c.setFillColor(HexColor('#0a0a0a'))
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(white)
    end_text = "THE END"
    end_width = c.stringWidth(end_text, "Helvetica-Bold", 36)
    c.drawString((page_width - end_width) / 2, page_height / 2 + 10, end_text)
    c.setFont("Helvetica", 14)
    c.setFillColor(HexColor('#9ca3af'))
    thanks_text = f"Thank you for being part of {event_doc['name']}"
    thanks_width = c.stringWidth(thanks_text, "Helvetica", 14)
    c.drawString((page_width - thanks_width) / 2, page_height / 2 - 25, thanks_text)
    c.showPage()


def generate_typography_collage_pdf(c, photos, event_doc, page_width, page_height, r2_client, bucket_name):
    """Style 2: Typography Collage - Bold text overlay with artistic arrangement"""
    margin = 30
    
    # Title Page - Vibrant yellow/gold theme
    c.setFillColor(HexColor('#f59e0b'))
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    
    # Large bold title
    c.setFont("Helvetica-Bold", 72)
    c.setFillColor(HexColor('#000000'))
    title_text = event_doc['name'].upper()
    title_width = c.stringWidth(title_text, "Helvetica-Bold", 72)
    if title_width > page_width - 80:
        c.setFont("Helvetica-Bold", 48)
        title_width = c.stringWidth(title_text, "Helvetica-Bold", 48)
    c.drawString((page_width - title_width) / 2, page_height / 2 + 40, title_text)
    
    # Decorative text elements
    c.setFont("Helvetica-Bold", 120)
    c.setFillColor(HexColor('#00000015'))
    c.drawString(-30, page_height - 120, "MOMENTS")
    c.drawString(page_width - 350, 30, "CAPTURED")
    
    # Date badge
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(HexColor('#000000'))
    date_text = event_doc['date']
    c.drawString((page_width - c.stringWidth(date_text, "Helvetica-Bold", 16)) / 2, page_height / 2 - 20, date_text)
    
    # Photo count
    c.setFont("Helvetica", 14)
    count_text = f"{len(photos)} photos"
    c.drawString((page_width - c.stringWidth(count_text, "Helvetica", 14)) / 2, page_height / 2 - 50, count_text)
    c.showPage()
    
    # Photo pages - Grid collage with text overlays
    photos_per_page = 4
    for i in range(0, len(photos), photos_per_page):
        page_photos = photos[i:i + photos_per_page]
        
        # Alternating background colors
        bg_colors = ['#fbbf24', '#f97316', '#ef4444', '#8b5cf6']
        bg_color = bg_colors[(i // photos_per_page) % len(bg_colors)]
        c.setFillColor(HexColor(bg_color))
        c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
        
        # Grid positions for up to 4 photos
        positions = [
            (margin, page_height / 2 + 20, (page_width - margin * 3) / 2, (page_height - margin * 3) / 2 - 20),
            (page_width / 2 + margin / 2, page_height / 2 + 20, (page_width - margin * 3) / 2, (page_height - margin * 3) / 2 - 20),
            (margin, margin + 30, (page_width - margin * 3) / 2, (page_height - margin * 3) / 2 - 20),
            (page_width / 2 + margin / 2, margin + 30, (page_width - margin * 3) / 2, (page_height - margin * 3) / 2 - 20),
        ]
        
        for idx, photo in enumerate(page_photos):
            if idx >= len(positions):
                break
            try:
                img, temp_path = fetch_and_prepare_image(r2_client, bucket_name, photo['s3_key'])
                x, y, w, h = positions[idx]
                
                # Aspect ratio calculation
                img_ratio = img.width / img.height
                box_ratio = w / h
                if img_ratio > box_ratio:
                    display_w = w
                    display_h = w / img_ratio
                    y = y + (h - display_h) / 2
                else:
                    display_h = h
                    display_w = h * img_ratio
                    x = x + (w - display_w) / 2
                
                # White border effect
                border = 4
                c.setFillColor(white)
                c.rect(x - border, y - border, display_w + border * 2, display_h + border * 2, fill=1, stroke=0)
                
                c.drawImage(temp_path, x, y, width=display_w, height=display_h, preserveAspectRatio=True)
                os.unlink(temp_path)
            except Exception as e:
                logger.error(f"Typography Collage - Failed to add photo: {e}")
                continue
        
        # Bold typography overlay
        c.setFont("Helvetica-Bold", 100)
        c.setFillColor(HexColor('#00000020'))
        overlay_texts = ["LOVE", "JOY", "LIFE", "FUN", "EPIC", "WOW"]
        overlay_text = overlay_texts[(i // photos_per_page) % len(overlay_texts)]
        c.drawString(margin, page_height - 90, overlay_text)
        
        # Page number
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(HexColor('#000000'))
        c.drawString(page_width - margin - 30, margin / 2, f"{(i // photos_per_page) + 1}")
        c.showPage()
    
    # Closing page
    c.setFillColor(HexColor('#000000'))
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 64)
    c.setFillColor(HexColor('#f59e0b'))
    end_text = "FIN."
    end_width = c.stringWidth(end_text, "Helvetica-Bold", 64)
    c.drawString((page_width - end_width) / 2, page_height / 2 + 20, end_text)
    c.setFont("Helvetica", 16)
    c.setFillColor(white)
    thanks_text = event_doc['name']
    thanks_width = c.stringWidth(thanks_text, "Helvetica", 16)
    c.drawString((page_width - thanks_width) / 2, page_height / 2 - 30, thanks_text)
    c.showPage()


def generate_minimalist_story_pdf(c, photos, event_doc, page_width, page_height, r2_client, bucket_name):
    """Style 3: Minimalist Story - Clean Instagram-style with organized layout"""
    margin = 50
    
    # Title Page - Clean white with accent
    c.setFillColor(white)
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    
    # Thin accent line at top
    c.setStrokeColor(HexColor('#000000'))
    c.setLineWidth(1)
    c.line(margin, page_height - margin, page_width - margin, page_height - margin)
    
    # Clean title
    c.setFont("Helvetica", 42)
    c.setFillColor(HexColor('#1a1a1a'))
    title_text = event_doc['name']
    title_width = c.stringWidth(title_text, "Helvetica", 42)
    c.drawString((page_width - title_width) / 2, page_height / 2 + 30, title_text)
    
    # Minimal date
    c.setFont("Helvetica", 14)
    c.setFillColor(HexColor('#666666'))
    date_text = event_doc['date']
    date_width = c.stringWidth(date_text, "Helvetica", 14)
    c.drawString((page_width - date_width) / 2, page_height / 2 - 10, date_text)
    
    # Story dots (like Instagram stories)
    dot_y = page_height / 2 - 50
    dot_spacing = 12
    total_dots = min(len(photos), 10)
    start_x = (page_width - (total_dots * dot_spacing)) / 2
    for d in range(total_dots):
        c.setFillColor(HexColor('#e5e7eb'))
        c.circle(start_x + d * dot_spacing, dot_y, 3, fill=1, stroke=0)
    
    # Accent line at bottom
    c.line(margin, margin, page_width - margin, margin)
    
    # Photo count in corner
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor('#999999'))
    c.drawString(margin, margin - 15, f"{len(photos)} moments")
    c.showPage()
    
    # Photo pages - One large photo per page, Instagram story style
    for idx, photo in enumerate(photos):
        # White background
        c.setFillColor(white)
        c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
        
        try:
            img, temp_path = fetch_and_prepare_image(r2_client, bucket_name, photo['s3_key'])
            
            # Large centered image with generous margins
            img_margin = 60
            max_w = page_width - img_margin * 2
            max_h = page_height - img_margin * 2 - 40  # Space for progress bar
            
            img_ratio = img.width / img.height
            box_ratio = max_w / max_h
            
            if img_ratio > box_ratio:
                display_w = max_w
                display_h = max_w / img_ratio
            else:
                display_h = max_h
                display_w = max_h * img_ratio
            
            x = (page_width - display_w) / 2
            y = (page_height - display_h) / 2 + 10
            
            c.drawImage(temp_path, x, y, width=display_w, height=display_h, preserveAspectRatio=True)
            
            # Progress bar at top (Instagram stories style)
            bar_y = page_height - 30
            bar_height = 3
            total_width = page_width - margin * 2
            segment_width = (total_width - (len(photos) - 1) * 4) / len(photos)
            
            for bar_idx in range(len(photos)):
                bar_x = margin + bar_idx * (segment_width + 4)
                if bar_idx <= idx:
                    c.setFillColor(HexColor('#1a1a1a'))
                else:
                    c.setFillColor(HexColor('#e5e7eb'))
                c.roundRect(bar_x, bar_y, segment_width, bar_height, 1.5, fill=1, stroke=0)
            
            # Minimal page counter
            c.setFont("Helvetica", 10)
            c.setFillColor(HexColor('#999999'))
            counter_text = f"{idx + 1} / {len(photos)}"
            counter_width = c.stringWidth(counter_text, "Helvetica", 10)
            c.drawString((page_width - counter_width) / 2, 25, counter_text)
            
            os.unlink(temp_path)
        except Exception as e:
            logger.error(f"Minimalist Story - Failed to add photo: {e}")
        
        c.showPage()
    
    # Closing page - Simple and clean
    c.setFillColor(white)
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    
    c.setFont("Helvetica", 28)
    c.setFillColor(HexColor('#1a1a1a'))
    end_text = "The End"
    end_width = c.stringWidth(end_text, "Helvetica", 28)
    c.drawString((page_width - end_width) / 2, page_height / 2 + 20, end_text)
    
    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor('#999999'))
    thanks_text = f"Thanks for viewing {event_doc['name']}"
    thanks_width = c.stringWidth(thanks_text, "Helvetica", 12)
    c.drawString((page_width - thanks_width) / 2, page_height / 2 - 15, thanks_text)
    
    # Final dot
    c.setFillColor(HexColor('#1a1a1a'))
    c.circle(page_width / 2, page_height / 2 - 50, 4, fill=1, stroke=0)
    c.showPage()


@api_router.post("/events/{event_id}/create-flipbook")
async def create_flipbook(event_id: str, current_user: User = Depends(get_current_user)):
    event_doc = await db.events.find_one(
        {"event_id": event_id, "host_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not event_doc:
        raise HTTPException(status_code=404, detail="Event not found")
    
    photos = await db.photos.find(
        {"event_id": event_id},
        {"_id": 0}
    ).to_list(10000)
    
    if len(photos) == 0:
        raise HTTPException(status_code=400, detail="No photos to create flipbook")
    
    try:
        r2_client = get_r2_client()
        bucket_name = os.getenv('R2_BUCKET_NAME', 'event-photos')
        heyzine_api_key = os.getenv('HEYZINE_API_KEY')
        heyzine_client_id = os.getenv('HEYZINE_CLIENT_ID')
        
        if not heyzine_api_key or not heyzine_client_id:
            raise HTTPException(status_code=500, detail="Heyzine API credentials not configured")
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_file:
            pdf_path = pdf_file.name
            
            c = canvas.Canvas(pdf_path, pagesize=landscape(A4))
            page_width, page_height = landscape(A4)
            
            flipbook_style = event_doc.get('flipbook_style', 'memory_archive')
            
            if flipbook_style == 'typography_collage':
                # Style 2: Typography Collage with bold text overlay
                generate_typography_collage_pdf(c, photos, event_doc, page_width, page_height, r2_client, bucket_name)
            elif flipbook_style == 'minimalist_story':
                # Style 3: Minimalist Instagram Story style
                generate_minimalist_story_pdf(c, photos, event_doc, page_width, page_height, r2_client, bucket_name)
            else:
                # Style 1: Memory Archive (default)
                generate_memory_archive_pdf(c, photos, event_doc, page_width, page_height, r2_client, bucket_name)
            
            c.save()
            
            logger.info(f"PDF generated with style: {flipbook_style}")
        
        with open(pdf_path, 'rb') as pdf:
            pdf_content = pdf.read()
        
        r2_pdf_key = f"events/{event_id}/flipbook_{int(datetime.now(timezone.utc).timestamp())}.pdf"
        r2_client.put_object(
            Bucket=bucket_name,
            Key=r2_pdf_key,
            Body=pdf_content,
            ContentType='application/pdf'
        )
        
        r2_public_url = os.getenv('R2_PUBLIC_URL')
        pdf_url = f"{r2_public_url}/{r2_pdf_key}"
        
        logger.info(f"PDF uploaded to: {pdf_url}")
        
        async with httpx.AsyncClient() as client:
            heyzine_response = await client.post(
                'https://heyzine.com/api1/rest',
                json={
                    'pdf': pdf_url,
                    'client_id': heyzine_client_id,
                    'template': 'dce36e099f71f95449f722bfc227cb4bdd1b30f0.pdf',
                    'title': event_doc['name'],
                    'subtitle': f"Event Date: {event_doc['date']}"
                },
                headers={
                    'Authorization': f'Bearer {heyzine_api_key}',
                    'Content-Type': 'application/json'
                },
                timeout=60.0
            )
        
        if heyzine_response.status_code == 200:
            flipbook_data = heyzine_response.json()
            logger.info(f"Heyzine response: {flipbook_data}")
            flipbook_url = flipbook_data.get('url') or flipbook_data.get('link')
            
            if not flipbook_url:
                logger.error(f"No URL in Heyzine response: {flipbook_data}")
                raise HTTPException(status_code=500, detail="Heyzine did not return a flipbook URL")
            
            await db.events.update_one(
                {"event_id": event_id},
                {"$set": {"flipbook_url": flipbook_url, "flipbook_created_at": datetime.now(timezone.utc)}}
            )
            
            os.unlink(pdf_path)
            
            return {
                "success": True,
                "flipbook_url": flipbook_url,
                "message": "Flipbook created successfully"
            }
        else:
            logger.error(f"Heyzine API error: Status {heyzine_response.status_code}, Response: {heyzine_response.text}")
            raise HTTPException(status_code=500, detail=f"Failed to create flipbook: {heyzine_response.text}")
    
    except Exception as e:
        logger.error(f"Flipbook creation error: {e}")
        if 'pdf_path' in locals() and os.path.exists(pdf_path):
            os.unlink(pdf_path)
        raise HTTPException(status_code=500, detail=f"Failed to create flipbook: {str(e)}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()