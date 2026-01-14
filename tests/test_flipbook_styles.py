"""
Test suite for Flipbook Style Feature
Tests the 3 selectable gallery styles: Memory Archive, Typography Collage, Minimalist Story
"""
import pytest
import requests
import subprocess
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://snapshare-157.preview.emergentagent.com')


class TestFlipbookStyleFeature:
    """Tests for flipbook style selection and PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup_test_user(self):
        """Create test user and session before each test class"""
        timestamp = int(datetime.now().timestamp() * 1000)
        self.user_id = f"test_user_{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        self.test_email = f"test.user.{timestamp}@example.com"
        
        # Create test user in MongoDB
        mongo_commands = f"""
        use('test_database');
        db.users.insertOne({{
            user_id: '{self.user_id}',
            email: '{self.test_email}',
            name: 'Test User',
            picture: 'https://via.placeholder.com/150',
            created_at: new Date()
        }});
        db.user_sessions.insertOne({{
            user_id: '{self.user_id}',
            session_token: '{self.session_token}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        """
        
        result = subprocess.run(
            ['mongosh', '--eval', mongo_commands],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        yield
        
        # Cleanup after tests
        cleanup_commands = f"""
        use('test_database');
        db.users.deleteOne({{user_id: '{self.user_id}'}});
        db.user_sessions.deleteOne({{session_token: '{self.session_token}'}});
        db.events.deleteMany({{host_id: '{self.user_id}'}});
        db.photos.deleteMany({{device_id: /^test_device_/}});
        """
        subprocess.run(['mongosh', '--eval', cleanup_commands], timeout=10)
    
    def get_headers(self):
        """Get headers with session cookie"""
        return {
            'Content-Type': 'application/json',
            'Cookie': f'session_token={self.session_token}'
        }
    
    # ==================== Event Creation with Flipbook Style ====================
    
    def test_create_event_with_memory_archive_style(self):
        """Test creating event with memory_archive flipbook style"""
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_Memory Archive Event",
                "date": "2025-01-15",
                "filter_type": "warm",
                "max_photos": 5,
                "flipbook_style": "memory_archive"
            },
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_id" in data
        assert data["name"] == "TEST_Memory Archive Event"
        assert data["flipbook_style"] == "memory_archive"
    
    def test_create_event_with_typography_collage_style(self):
        """Test creating event with typography_collage flipbook style"""
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_Typography Collage Event",
                "date": "2025-01-16",
                "filter_type": "party",
                "max_photos": 5,
                "flipbook_style": "typography_collage"
            },
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_id" in data
        assert data["name"] == "TEST_Typography Collage Event"
        assert data["flipbook_style"] == "typography_collage"
    
    def test_create_event_with_minimalist_story_style(self):
        """Test creating event with minimalist_story flipbook style"""
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_Minimalist Story Event",
                "date": "2025-01-17",
                "filter_type": "wedding",
                "max_photos": 5,
                "flipbook_style": "minimalist_story"
            },
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_id" in data
        assert data["name"] == "TEST_Minimalist Story Event"
        assert data["flipbook_style"] == "minimalist_story"
    
    def test_create_event_default_flipbook_style(self):
        """Test that default flipbook style is memory_archive when not specified"""
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_Default Style Event",
                "date": "2025-01-18",
                "filter_type": "warm",
                "max_photos": 5
                # flipbook_style not specified
            },
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["flipbook_style"] == "memory_archive", "Default flipbook_style should be memory_archive"
    
    # ==================== Event Retrieval with Flipbook Style ====================
    
    def test_get_event_returns_flipbook_style(self):
        """Test that GET /api/events/{event_id} returns flipbook_style"""
        # First create an event
        create_response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_Get Style Event",
                "date": "2025-01-19",
                "flipbook_style": "typography_collage"
            },
            headers=self.get_headers()
        )
        
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Now get the event
        get_response = requests.get(
            f"{BASE_URL}/api/events/{event_id}",
            headers=self.get_headers()
        )
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["flipbook_style"] == "typography_collage"
    
    def test_list_events_returns_flipbook_style(self):
        """Test that GET /api/events returns flipbook_style for each event"""
        # Create events with different styles
        styles = ["memory_archive", "typography_collage", "minimalist_story"]
        
        for style in styles:
            requests.post(
                f"{BASE_URL}/api/events",
                json={
                    "name": f"TEST_List Event {style}",
                    "date": "2025-01-20",
                    "flipbook_style": style
                },
                headers=self.get_headers()
            )
        
        # List all events
        list_response = requests.get(
            f"{BASE_URL}/api/events",
            headers=self.get_headers()
        )
        
        assert list_response.status_code == 200
        events = list_response.json()
        
        # Check that all events have flipbook_style
        for event in events:
            assert "flipbook_style" in event, f"Event {event.get('event_id')} missing flipbook_style"
    
    # ==================== Flipbook Creation Endpoint ====================
    
    def test_create_flipbook_no_photos_returns_400(self):
        """Test that create-flipbook returns 400 when no photos exist"""
        # Create an event
        create_response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_No Photos Event",
                "date": "2025-01-21",
                "flipbook_style": "memory_archive"
            },
            headers=self.get_headers()
        )
        
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Try to create flipbook without photos
        flipbook_response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/create-flipbook",
            headers=self.get_headers()
        )
        
        assert flipbook_response.status_code == 400, f"Expected 400, got {flipbook_response.status_code}"
        assert "No photos" in flipbook_response.json().get("detail", "")
    
    def test_create_flipbook_nonexistent_event_returns_404(self):
        """Test that create-flipbook returns 404 for non-existent event"""
        flipbook_response = requests.post(
            f"{BASE_URL}/api/events/nonexistent_event_id/create-flipbook",
            headers=self.get_headers()
        )
        
        assert flipbook_response.status_code == 404


class TestFlipbookStyleValidation:
    """Tests for flipbook style validation"""
    
    @pytest.fixture(autouse=True)
    def setup_test_user(self):
        """Create test user and session"""
        timestamp = int(datetime.now().timestamp() * 1000)
        self.user_id = f"test_user_val_{timestamp}"
        self.session_token = f"test_session_val_{timestamp}"
        
        mongo_commands = f"""
        use('test_database');
        db.users.insertOne({{
            user_id: '{self.user_id}',
            email: 'test.val.{timestamp}@example.com',
            name: 'Test User',
            created_at: new Date()
        }});
        db.user_sessions.insertOne({{
            user_id: '{self.user_id}',
            session_token: '{self.session_token}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        }});
        """
        
        subprocess.run(['mongosh', '--eval', mongo_commands], timeout=10)
        
        yield
        
        cleanup_commands = f"""
        use('test_database');
        db.users.deleteOne({{user_id: '{self.user_id}'}});
        db.user_sessions.deleteOne({{session_token: '{self.session_token}'}});
        db.events.deleteMany({{host_id: '{self.user_id}'}});
        """
        subprocess.run(['mongosh', '--eval', cleanup_commands], timeout=10)
    
    def get_headers(self):
        return {
            'Content-Type': 'application/json',
            'Cookie': f'session_token={self.session_token}'
        }
    
    def test_all_three_styles_are_accepted(self):
        """Test that all three flipbook styles are accepted by the API"""
        valid_styles = ["memory_archive", "typography_collage", "minimalist_story"]
        
        for style in valid_styles:
            response = requests.post(
                f"{BASE_URL}/api/events",
                json={
                    "name": f"TEST_Style Validation {style}",
                    "date": "2025-01-22",
                    "flipbook_style": style
                },
                headers=self.get_headers()
            )
            
            assert response.status_code == 200, f"Style '{style}' should be accepted, got {response.status_code}"
            assert response.json()["flipbook_style"] == style


class TestAuthenticationRequired:
    """Tests for authentication requirements"""
    
    def test_create_event_requires_auth(self):
        """Test that creating event requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_Unauth Event",
                "date": "2025-01-23",
                "flipbook_style": "memory_archive"
            },
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 401
    
    def test_create_flipbook_requires_auth(self):
        """Test that creating flipbook requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/events/some_event_id/create-flipbook",
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
