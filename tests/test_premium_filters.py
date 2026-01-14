"""
Test Suite for Premium Filter Pack Feature
Tests all 10 cinematic camera filters:
- Premium Pack: luxury, night, pastel, film, editorial
- Wedding Pack: romance, royal, pure, candle, memory
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# All 10 filter types to test
PREMIUM_FILTERS = ['luxury', 'night', 'pastel', 'film', 'editorial']
WEDDING_FILTERS = ['romance', 'royal', 'pure', 'candle', 'memory']
ALL_FILTERS = PREMIUM_FILTERS + WEDDING_FILTERS


class TestPremiumFiltersBackend:
    """Backend API tests for Premium Filter Pack feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and cleanup"""
        self.session = requests.Session()
        self.session.cookies.set('session_token', 'test_session_filter_1768412170817')
        self.created_events = []
        yield
        # Cleanup created events
        for event_id in self.created_events:
            try:
                self.session.delete(f"{BASE_URL}/api/events/{event_id}")
            except:
                pass
    
    def test_api_connectivity(self):
        """Test API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"API not accessible: {response.text}"
        data = response.json()
        assert 'user_id' in data
        print(f"✓ API accessible, user: {data.get('name')}")
    
    # Premium Filter Pack Tests
    @pytest.mark.parametrize("filter_type", PREMIUM_FILTERS)
    def test_create_event_with_premium_filter(self, filter_type):
        """Test creating event with each premium filter type"""
        event_data = {
            "name": f"TEST_Premium_{filter_type}_{datetime.now().timestamp()}",
            "date": "2025-01-15",
            "filter_type": filter_type,
            "max_photos": 5,
            "flipbook_style": "memory_archive"
        }
        
        response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200, f"Failed to create event with {filter_type}: {response.text}"
        
        data = response.json()
        self.created_events.append(data['event_id'])
        
        # Verify filter_type is saved correctly
        assert data['filter_type'] == filter_type, f"Expected filter_type {filter_type}, got {data['filter_type']}"
        assert 'event_id' in data
        assert 'share_url' in data
        print(f"✓ Created event with premium filter: {filter_type}")
        
        # Verify GET returns correct filter_type
        get_response = self.session.get(f"{BASE_URL}/api/events/{data['event_id']}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data['filter_type'] == filter_type, f"GET returned wrong filter_type: {get_data['filter_type']}"
        print(f"✓ GET verified filter_type: {filter_type}")
    
    # Wedding Filter Pack Tests
    @pytest.mark.parametrize("filter_type", WEDDING_FILTERS)
    def test_create_event_with_wedding_filter(self, filter_type):
        """Test creating event with each wedding filter type"""
        event_data = {
            "name": f"TEST_Wedding_{filter_type}_{datetime.now().timestamp()}",
            "date": "2025-02-14",
            "filter_type": filter_type,
            "max_photos": 10,
            "flipbook_style": "minimalist_story"
        }
        
        response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200, f"Failed to create event with {filter_type}: {response.text}"
        
        data = response.json()
        self.created_events.append(data['event_id'])
        
        # Verify filter_type is saved correctly
        assert data['filter_type'] == filter_type, f"Expected filter_type {filter_type}, got {data['filter_type']}"
        print(f"✓ Created event with wedding filter: {filter_type}")
        
        # Verify GET returns correct filter_type
        get_response = self.session.get(f"{BASE_URL}/api/events/{data['event_id']}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data['filter_type'] == filter_type
        print(f"✓ GET verified filter_type: {filter_type}")
    
    def test_guest_access_returns_filter_type(self):
        """Test that guest API returns filter_type for camera preview"""
        # Create event with specific filter
        event_data = {
            "name": f"TEST_GuestFilter_{datetime.now().timestamp()}",
            "date": "2025-01-20",
            "filter_type": "romance",
            "max_photos": 5
        }
        
        response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        data = response.json()
        self.created_events.append(data['event_id'])
        share_url = data['share_url']
        
        # Access as guest (no auth)
        guest_session = requests.Session()
        guest_response = guest_session.get(f"{BASE_URL}/api/guest/{share_url}")
        assert guest_response.status_code == 200, f"Guest access failed: {guest_response.text}"
        
        guest_data = guest_response.json()
        assert 'filter_type' in guest_data, "Guest response missing filter_type"
        assert guest_data['filter_type'] == 'romance', f"Wrong filter_type: {guest_data['filter_type']}"
        print(f"✓ Guest API returns filter_type: {guest_data['filter_type']}")
    
    def test_list_events_includes_filter_type(self):
        """Test that list events API includes filter_type for all events"""
        # Create events with different filters
        filters_to_create = ['luxury', 'night', 'romance']
        
        for filter_type in filters_to_create:
            event_data = {
                "name": f"TEST_List_{filter_type}_{datetime.now().timestamp()}",
                "date": "2025-01-25",
                "filter_type": filter_type,
                "max_photos": 5
            }
            response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
            assert response.status_code == 200
            self.created_events.append(response.json()['event_id'])
        
        # List all events
        list_response = self.session.get(f"{BASE_URL}/api/events")
        assert list_response.status_code == 200
        events = list_response.json()
        
        # Verify all events have filter_type
        for event in events:
            assert 'filter_type' in event, f"Event {event.get('event_id')} missing filter_type"
        
        print(f"✓ List events returns filter_type for all {len(events)} events")
    
    def test_default_filter_type(self):
        """Test default filter_type when not specified"""
        event_data = {
            "name": f"TEST_DefaultFilter_{datetime.now().timestamp()}",
            "date": "2025-01-30"
            # filter_type not specified
        }
        
        response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        data = response.json()
        self.created_events.append(data['event_id'])
        
        # Check default filter_type (should be 'warm' based on server.py)
        assert 'filter_type' in data
        print(f"✓ Default filter_type: {data['filter_type']}")
    
    def test_invalid_filter_type_accepted(self):
        """Test that API accepts any filter_type string (no validation)"""
        event_data = {
            "name": f"TEST_InvalidFilter_{datetime.now().timestamp()}",
            "date": "2025-01-30",
            "filter_type": "invalid_filter_xyz"
        }
        
        response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        # API should accept any string (validation is on frontend)
        assert response.status_code == 200
        data = response.json()
        self.created_events.append(data['event_id'])
        assert data['filter_type'] == 'invalid_filter_xyz'
        print("✓ API accepts any filter_type string (frontend validates)")


class TestGuestCameraFilterIntegration:
    """Test guest camera filter integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.cookies.set('session_token', 'test_session_filter_1768412170817')
        self.created_events = []
        yield
        for event_id in self.created_events:
            try:
                self.session.delete(f"{BASE_URL}/api/events/{event_id}")
            except:
                pass
    
    @pytest.mark.parametrize("filter_type", ALL_FILTERS)
    def test_guest_camera_receives_filter(self, filter_type):
        """Test guest camera endpoint returns correct filter for all 10 filters"""
        # Create event
        event_data = {
            "name": f"TEST_GuestCam_{filter_type}_{datetime.now().timestamp()}",
            "date": "2025-03-01",
            "filter_type": filter_type,
            "max_photos": 3
        }
        
        response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        data = response.json()
        self.created_events.append(data['event_id'])
        share_url = data['share_url']
        
        # Guest access
        guest_session = requests.Session()
        guest_response = guest_session.get(f"{BASE_URL}/api/guest/{share_url}")
        assert guest_response.status_code == 200
        
        guest_data = guest_response.json()
        assert guest_data['filter_type'] == filter_type
        assert guest_data['name'] == event_data['name']
        print(f"✓ Guest camera receives filter: {filter_type}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
