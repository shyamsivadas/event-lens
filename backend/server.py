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
    share_url: str
    created_at: datetime

class EventCreate(BaseModel):
    name: str
    date: str
    logo_url: Optional[str] = None
    filter_type: str = "warm"
    max_photos: int = 5

class Photo(BaseModel):
    photo_id: str
    event_id: str
    device_id: str
    filename: str
    s3_key: str
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
            
            photos_per_page = 4
            margin = 20
            spacing = 10
            
            cols = 2
            rows = 2
            img_width = (page_width - 2 * margin - spacing) / cols
            img_height = (page_height - 2 * margin - spacing) / rows
            
            for idx, photo in enumerate(photos):
                if idx > 0 and idx % photos_per_page == 0:
                    c.showPage()
                
                position = idx % photos_per_page
                col = position % cols
                row = position // cols
                
                x = margin + col * (img_width + spacing)
                y = page_height - margin - (row + 1) * img_height - row * spacing
                
                try:
                    response = r2_client.get_object(
                        Bucket=bucket_name,
                        Key=photo['s3_key']
                    )
                    image_data = response['Body'].read()
                    
                    img = Image.open(io.BytesIO(image_data))
                    
                    # Convert to RGB if needed (for JPEG compatibility)
                    if img.mode in ('RGBA', 'LA', 'P'):
                        img = img.convert('RGB')
                    
                    img_ratio = img.width / img.height
                    box_ratio = img_width / img_height
                    
                    # Save to temporary file for ReportLab
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_img:
                        img.save(temp_img.name, 'JPEG', quality=85)
                        temp_img_path = temp_img.name
                    
                    if img_ratio > box_ratio:
                        new_width = img_width
                        new_height = img_width / img_ratio
                        y_offset = (img_height - new_height) / 2
                        c.drawImage(temp_img_path, x, y + y_offset, 
                                   width=new_width, height=new_height, 
                                   preserveAspectRatio=True, mask='auto')
                    else:
                        new_height = img_height
                        new_width = img_height * img_ratio
                        x_offset = (img_width - new_width) / 2
                        c.drawImage(temp_img_path, x + x_offset, y, 
                                   width=new_width, height=new_height, 
                                   preserveAspectRatio=True, mask='auto')
                    
                    # Clean up temp file
                    os.unlink(temp_img_path)
                    
                except Exception as e:
                    logger.error(f"Failed to add photo to PDF: {e}")
                    continue
            
            c.save()
        
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
                    'prev_next': True,
                    'title': event_doc['name'],
                    'subtitle': f"Event Date: {event_doc['date']}",
                    'page_effect': 'magazine',
                    'show_info': True,
                    'show_logo': True,
                    'show_thumbnail': True,
                    'show_share': True,
                    'show_download': True,
                    'show_fullscreen': True,
                    'show_zoom': True,
                    'background_color': '#000000',
                    'text_color': '#ffffff',
                    'autoplay': False,
                    'autoplay_interval': 5
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