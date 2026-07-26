import uuid
import re
import json
import urllib.parse
import urllib.request
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Venue, Event
from app.schemas import VenueCreate, VenueResponse
from app.auth import get_current_user, require_admin, require_karyakar_or_admin

router = APIRouter(prefix="/api/venues", tags=["Venues"])

class ResolveLocationRequest(BaseModel):
    input_text: str

def parse_coords_from_text(text: str):
    # Check for !3d(lat)!4d(lng) first (Exact Place Pin in Google Maps)
    pin_match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', text)
    if pin_match:
        return float(pin_match.group(1)), float(pin_match.group(2)), "Exact Google Maps Pin"

    # Check for @lat,lng
    at_match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', text)
    if at_match:
        return float(at_match.group(1)), float(at_match.group(2)), "Google Maps Viewport"

    # Check for q=lat,lng or query=lat,lng or ll=lat,lng
    q_match = re.search(r'(?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)', text)
    if q_match:
        return float(q_match.group(1)), float(q_match.group(2)), "Query Coordinates"

    # Check for raw numbers "19.2037, 72.8439"
    raw_match = re.search(r'(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)', text)
    if raw_match:
        return float(raw_match.group(1)), float(raw_match.group(2)), "Raw Coordinates"

    return None

@router.post("/resolve-location")
def resolve_location(req: ResolveLocationRequest):
    inp = req.input_text.strip()
    if not inp:
        raise HTTPException(status_code=400, detail="Input text cannot be empty")

    # 1. Direct regex match on input
    parsed = parse_coords_from_text(inp)
    if parsed:
        return {
            "latitude": parsed[0],
            "longitude": parsed[1],
            "source": parsed[2]
        }

    # 2. If short URL or full URL (e.g. maps.app.goo.gl / goo.gl/maps / google.com/maps), expand redirect
    if "http" in inp or "goo.gl" in inp or "maps" in inp:
        url = inp if inp.startswith("http") else f"https://{inp}"
        try:
            req_obj = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req_obj, timeout=8) as resp:
                final_url = resp.geturl()
                parsed_final = parse_coords_from_text(final_url)
                if parsed_final:
                    place_name = None
                    name_match = re.search(r'/maps/place/([^/@]+)', final_url)
                    if name_match:
                        place_name = urllib.parse.unquote_plus(name_match.group(1))

                    return {
                        "latitude": parsed_final[0],
                        "longitude": parsed_final[1],
                        "place_name": place_name,
                        "source": f"Resolved Short Link ({parsed_final[2]})"
                    }
        except Exception as e:
            print("Short URL expand error:", e)

    # 3. Fallback: Search place name via Nominatim OpenStreetMap API
    try:
        query_url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(inp)}&format=json&limit=1"
        req_osm = urllib.request.Request(query_url, headers={'User-Agent': 'SabhaAttendanceApp/1.0'})
        with urllib.request.urlopen(req_osm, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                return {
                    "latitude": float(data[0]["lat"]),
                    "longitude": float(data[0]["lon"]),
                    "place_name": data[0].get("display_name"),
                    "source": "OpenStreetMap Search"
                }
    except Exception as err:
        print("OSM Search error:", err)

    raise HTTPException(status_code=404, detail="Could not extract coordinates from link or location query. Try pasting exact Google Maps share link.")

@router.get("", response_model=List[VenueResponse])
def get_venues(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Venue).order_by(Venue.name.asc()).all()

@router.post("", response_model=VenueResponse)
def create_venue(
    req: VenueCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    qr_ref = f"venue_{uuid.uuid4().hex[:12]}"
    venue = Venue(
        name=req.name,
        address=req.address,
        latitude=req.latitude,
        longitude=req.longitude,
        radius_meters=req.radius_meters,
        qr_code_reference=qr_ref
    )
    db.add(venue)
    db.commit()
    db.refresh(venue)
    return venue

@router.get("/{venue_id}", response_model=VenueResponse)
def get_venue(
    venue_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue

@router.put("/{venue_id}", response_model=VenueResponse)
def update_venue(
    venue_id: int,
    req: VenueCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    venue.name = req.name
    venue.address = req.address
    venue.latitude = req.latitude
    venue.longitude = req.longitude
    venue.radius_meters = req.radius_meters
    
    db.commit()
    db.refresh(venue)
    return venue

@router.delete("/{venue_id}")
def delete_venue(
    venue_id: int,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    linked_events = db.query(Event).filter(Event.venue_id == venue_id).count()
    if linked_events > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete venue '{venue.name}' because it is linked to {linked_events} event(s)."
        )
    
    db.delete(venue)
    db.commit()
    return {"message": f"Venue '{venue.name}' deleted successfully."}
