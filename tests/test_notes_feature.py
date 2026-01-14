"""
Test suite for Photo Notes Feature
Tests the ability to add notes/thoughts with photos in SnapShare app
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_SHARE_URL = None
TEST_EVENT_ID = None
TEST_SESSION_TOKEN = None
TEST_DEVICE_ID = "test_device_notes_123"


@pytest.fixture(scope="module")
def setup_test_data():
    """Setup test event and user for notes testing"""
    import subprocess
    import re
    
    # Create test user and event via mongosh
    result = subprocess.run([
        'mongosh', '--quiet', '--eval', '''
        use('test_database');
        var userId = 'test-user-notes-pytest-' + Date.now();
        var sessionToken = 'test_session_notes_pytest_' + Date.now();
        var eventId = 'evt_notes_pytest_' + Date.now();
        var shareUrl = 'notes_pytest_' + Date.now().toString(36);
        
        db.users.insertOne({
          user_id: userId,
          email: 'test.notes.pytest.' + Date.now() + '@example.com',
          name: 'Notes Pytest User',
          picture: null,
          created_at: new Date()
        });
        
        db.user_sessions.insertOne({
          user_id: userId,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        });
        
        db.events.insertOne({
          event_id: eventId,
          host_id: userId,
          name: 'Notes Pytest Event',
          date: '2025-01-15',
          logo_url: null,
          filter_type: 'warm',
          max_photos: 10,
          flipbook_style: 'memory_archive',
          share_url: shareUrl,
          created_at: new Date()
        });
        
        print('SESSION_TOKEN=' + sessionToken);
        print('EVENT_ID=' + eventId);
        print('SHARE_URL=' + shareUrl);
        print('USER_ID=' + userId);
        '''
    ], capture_output=True, text=True)
    
    output = result.stdout
    
    # Parse output
    session_token = re.search(r'SESSION_TOKEN=(\S+)', output)
    event_id = re.search(r'EVENT_ID=(\S+)', output)
    share_url = re.search(r'SHARE_URL=(\S+)', output)
    user_id = re.search(r'USER_ID=(\S+)', output)
    
    data = {
        'session_token': session_token.group(1) if session_token else None,
        'event_id': event_id.group(1) if event_id else None,
        'share_url': share_url.group(1) if share_url else None,
        'user_id': user_id.group(1) if user_id else None
    }
    
    yield data
    
    # Cleanup after tests
    subprocess.run([
        'mongosh', '--quiet', '--eval', f'''
        use('test_database');
        db.users.deleteMany({{user_id: /test-user-notes-pytest/}});
        db.user_sessions.deleteMany({{session_token: /test_session_notes_pytest/}});
        db.events.deleteMany({{event_id: /evt_notes_pytest/}});
        db.photos.deleteMany({{event_id: /evt_notes_pytest/}});
        '''
    ])


class TestGuestEventEndpoint:
    """Test guest event endpoint returns event data"""
    
    def test_get_guest_event(self, setup_test_data):
        """Test GET /api/guest/{share_url} returns event data"""
        share_url = setup_test_data['share_url']
        response = requests.get(f"{BASE_URL}/api/guest/{share_url}")
        
        assert response.status_code == 200
        data = response.json()
        assert 'event_id' in data
        assert 'name' in data
        assert data['name'] == 'Notes Pytest Event'
        print(f"✓ Guest event endpoint returns event data correctly")


class TestTrackUploadWithNote:
    """Test track-upload endpoint accepts note field"""
    
    def test_track_upload_with_note(self, setup_test_data):
        """Test POST /api/guest/{share_url}/track-upload accepts note field"""
        share_url = setup_test_data['share_url']
        
        photo_data = {
            "device_id": TEST_DEVICE_ID,
            "filename": "test_photo_with_note.jpg",
            "s3_key": f"events/{setup_test_data['event_id']}/photos/{TEST_DEVICE_ID}/test_photo_with_note.jpg",
            "note": "This is a test note for the photo!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest/{share_url}/track-upload",
            json=photo_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        print(f"✓ Track upload with note accepted successfully")
    
    def test_track_upload_without_note(self, setup_test_data):
        """Test POST /api/guest/{share_url}/track-upload works without note"""
        share_url = setup_test_data['share_url']
        
        photo_data = {
            "device_id": TEST_DEVICE_ID,
            "filename": "test_photo_no_note.jpg",
            "s3_key": f"events/{setup_test_data['event_id']}/photos/{TEST_DEVICE_ID}/test_photo_no_note.jpg"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest/{share_url}/track-upload",
            json=photo_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        print(f"✓ Track upload without note accepted successfully")
    
    def test_track_upload_with_empty_note(self, setup_test_data):
        """Test POST /api/guest/{share_url}/track-upload accepts empty note"""
        share_url = setup_test_data['share_url']
        
        photo_data = {
            "device_id": TEST_DEVICE_ID,
            "filename": "test_photo_empty_note.jpg",
            "s3_key": f"events/{setup_test_data['event_id']}/photos/{TEST_DEVICE_ID}/test_photo_empty_note.jpg",
            "note": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest/{share_url}/track-upload",
            json=photo_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        print(f"✓ Track upload with empty note accepted successfully")
    
    def test_track_upload_with_long_note(self, setup_test_data):
        """Test POST /api/guest/{share_url}/track-upload accepts 280 char note"""
        share_url = setup_test_data['share_url']
        
        long_note = "A" * 280  # Max length note
        
        photo_data = {
            "device_id": TEST_DEVICE_ID,
            "filename": "test_photo_long_note.jpg",
            "s3_key": f"events/{setup_test_data['event_id']}/photos/{TEST_DEVICE_ID}/test_photo_long_note.jpg",
            "note": long_note
        }
        
        response = requests.post(
            f"{BASE_URL}/api/guest/{share_url}/track-upload",
            json=photo_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        print(f"✓ Track upload with 280 char note accepted successfully")


class TestGetEventPhotosWithNotes:
    """Test get_event_photos returns photos with note field"""
    
    def test_get_photos_returns_note_field(self, setup_test_data):
        """Test GET /api/events/{event_id}/photos returns photos with note field"""
        session_token = setup_test_data['session_token']
        event_id = setup_test_data['event_id']
        share_url = setup_test_data['share_url']
        
        # First, create a photo with a note
        test_note = "Test note for verification"
        photo_data = {
            "device_id": "verify_device_123",
            "filename": "verify_note_photo.jpg",
            "s3_key": f"events/{event_id}/photos/verify_device_123/verify_note_photo.jpg",
            "note": test_note
        }
        
        upload_response = requests.post(
            f"{BASE_URL}/api/guest/{share_url}/track-upload",
            json=photo_data
        )
        assert upload_response.status_code == 200
        
        # Now get photos with auth
        response = requests.get(
            f"{BASE_URL}/api/events/{event_id}/photos",
            cookies={"session_token": session_token}
        )
        
        assert response.status_code == 200
        photos = response.json()
        assert isinstance(photos, list)
        assert len(photos) > 0
        
        # Find the photo we just created
        verify_photo = next((p for p in photos if p.get('filename') == 'verify_note_photo.jpg'), None)
        assert verify_photo is not None, "Created photo not found in response"
        assert 'note' in verify_photo, "Note field missing from photo response"
        assert verify_photo['note'] == test_note, f"Note mismatch: expected '{test_note}', got '{verify_photo.get('note')}'"
        
        print(f"✓ Get photos returns note field correctly")
        print(f"  Photo note: {verify_photo['note']}")


class TestPhotoModelHasNoteField:
    """Verify Photo model stores note field in MongoDB"""
    
    def test_photo_document_has_note(self, setup_test_data):
        """Verify photo document in MongoDB has note field"""
        import subprocess
        
        event_id = setup_test_data['event_id']
        
        # Query MongoDB directly
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use('test_database');
            var photo = db.photos.findOne({{event_id: /evt_notes_pytest/, note: {{$exists: true, $ne: ""}}}});
            if (photo) {{
                print('FOUND_NOTE=' + photo.note);
                print('PHOTO_ID=' + photo.photo_id);
            }} else {{
                print('NO_PHOTO_WITH_NOTE');
            }}
            '''
        ], capture_output=True, text=True)
        
        output = result.stdout
        assert 'FOUND_NOTE=' in output, "No photo with note found in MongoDB"
        print(f"✓ Photo document in MongoDB has note field")
        print(f"  {output.strip()}")


class TestDeviceLimitEndpoint:
    """Test device limit endpoint still works"""
    
    def test_check_device_limit(self, setup_test_data):
        """Test GET /api/guest/{share_url}/limit returns correct counts"""
        share_url = setup_test_data['share_url']
        
        response = requests.get(
            f"{BASE_URL}/api/guest/{share_url}/limit",
            params={"device_id": "new_device_123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'used' in data
        assert 'max' in data
        assert 'remaining' in data
        assert data['max'] == 10  # Our test event has max_photos=10
        print(f"✓ Device limit endpoint works correctly")
        print(f"  Used: {data['used']}, Max: {data['max']}, Remaining: {data['remaining']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
