import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid

class EventPhotoAPITester:
    def __init__(self, base_url="https://snapshare-156.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token:
            test_headers['Cookie'] = f'session_token={self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def setup_test_user(self):
        """Create test user and session in MongoDB"""
        print("\n🔧 Setting up test user...")
        
        # Generate test data
        timestamp = int(datetime.now().timestamp())
        self.user_id = f"test_user_{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        test_email = f"test.user.{timestamp}@example.com"
        
        # MongoDB commands to create test user and session
        mongo_commands = f"""
        use('test_database');
        db.users.insertOne({{
            user_id: '{self.user_id}',
            email: '{test_email}',
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
        
        import subprocess
        try:
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print(f"✅ Test user created: {self.user_id}")
                print(f"✅ Session token: {self.session_token}")
                return True
            else:
                print(f"❌ Failed to create test user: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ MongoDB setup error: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        print("\n🧹 Cleaning up test data...")
        
        mongo_commands = f"""
        use('test_database');
        db.users.deleteMany({{user_id: /^test_user_/}});
        db.user_sessions.deleteMany({{session_token: /^test_session_/}});
        db.events.deleteMany({{host_id: /^test_user_/}});
        db.photos.deleteMany({{device_id: /^test_device_/}});
        """
        
        import subprocess
        try:
            subprocess.run(['mongosh', '--eval', mongo_commands], timeout=10)
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {str(e)}")

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Test /api/auth/me with valid session
        success, user_data = self.run_test(
            "Get current user",
            "GET",
            "api/auth/me",
            200
        )
        
        if success and user_data:
            print(f"   User: {user_data.get('name')} ({user_data.get('email')})")
        
        return success

    def test_event_management(self):
        """Test event CRUD operations"""
        print("\n📅 Testing Event Management...")
        
        # Test create event
        event_data = {
            "name": "Test Event",
            "date": "2024-12-31",
            "logo_url": "https://via.placeholder.com/100",
            "filter_type": "warm",
            "max_photos": 5
        }
        
        success, event_response = self.run_test(
            "Create event",
            "POST",
            "api/events",
            200,
            data=event_data
        )
        
        if not success:
            return False
        
        event_id = event_response.get('event_id')
        share_url = event_response.get('share_url')
        
        if event_id:
            print(f"   Event ID: {event_id}")
            print(f"   Share URL: {share_url}")
        
        # Test list events
        success, events = self.run_test(
            "List events",
            "GET",
            "api/events",
            200
        )
        
        # Test get specific event
        if event_id:
            success, event_details = self.run_test(
                "Get event details",
                "GET",
                f"api/events/{event_id}",
                200
            )
        
        # Test get event photos (should be empty initially)
        if event_id:
            success, photos = self.run_test(
                "Get event photos",
                "GET",
                f"api/events/{event_id}/photos",
                200
            )
        
        # Store for guest testing
        self.test_event_id = event_id
        self.test_share_url = share_url
        
        return True

    def test_guest_endpoints(self):
        """Test guest camera endpoints"""
        print("\n📸 Testing Guest Camera Endpoints...")
        
        if not hasattr(self, 'test_share_url') or not self.test_share_url:
            print("❌ No test event available for guest testing")
            return False
        
        # Test get guest event
        success, guest_event = self.run_test(
            "Get guest event",
            "GET",
            f"api/guest/{self.test_share_url}",
            200
        )
        
        # Test device limit check
        test_device_id = f"test_device_{int(datetime.now().timestamp())}"
        success, limit_data = self.run_test(
            "Check device limit",
            "GET",
            f"api/guest/{self.test_share_url}/limit?device_id={test_device_id}",
            200
        )
        
        if success and limit_data:
            print(f"   Device limit: {limit_data.get('used')}/{limit_data.get('max')}")
        
        # Test presigned URL generation (will likely fail due to missing R2 config)
        presigned_data = {
            "event_id": self.test_event_id,
            "device_id": test_device_id,
            "filename": "test_photo.jpg",
            "content_type": "image/jpeg"
        }
        
        success, presigned_response = self.run_test(
            "Get presigned URL",
            "POST",
            f"api/guest/{self.test_share_url}/presigned-url",
            200,
            data=presigned_data
        )
        
        if not success:
            print("   ⚠️ Expected failure - R2 credentials not configured")
        
        # Test track upload (mock data)
        upload_data = {
            "device_id": test_device_id,
            "filename": "test_photo.jpg",
            "s3_key": f"events/{self.test_event_id}/photos/{test_device_id}/test_photo.jpg"
        }
        
        success, track_response = self.run_test(
            "Track photo upload",
            "POST",
            f"api/guest/{self.test_share_url}/track-upload",
            200,
            data=upload_data
        )
        
        return True

    def test_event_deletion(self):
        """Test event deletion"""
        print("\n🗑️ Testing Event Deletion...")
        
        if not hasattr(self, 'test_event_id') or not self.test_event_id:
            print("❌ No test event available for deletion testing")
            return False
        
        success, delete_response = self.run_test(
            "Delete event",
            "DELETE",
            f"api/events/{self.test_event_id}",
            200
        )
        
        return success

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Event Photo API Test Suite")
        print(f"📍 Testing: {self.base_url}")
        
        # Setup
        if not self.setup_test_user():
            print("❌ Failed to setup test environment")
            return 1
        
        try:
            # Run tests
            self.test_auth_flow()
            self.test_event_management()
            self.test_guest_endpoints()
            self.test_event_deletion()
            
        finally:
            # Cleanup
            self.cleanup_test_data()
        
        # Results
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['details']}")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = EventPhotoAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())