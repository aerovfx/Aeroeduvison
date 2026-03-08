"""
Locust Load Testing Script for AeroeduVision

Installation:
    pip install locust

Usage:
    locust -f load-testing/locust-script.py --host=http://localhost:3000
    
    # Web UI: http://localhost:8089
    # Set users: 100-1000
    # Set ramp up: 60-300 seconds
    
    # Headless mode:
    locust -f load-testing/locust-script.py --host=http://localhost:3000 \
        --users 500 --spawn-rate 50 --run-time 10m --headless
"""

from locust import HttpUser, task, between, events
from locust.runners import MasterRunner, WorkerRunner
import random
import json
import time

# =============================================================================
# Test Data
# =============================================================================

TEST_USERS = [
    {"email": "student1@test.com", "password": "Test1234!", "role": "student"},
    {"email": "student2@test.com", "password": "Test1234!", "role": "student"},
    {"email": "teacher1@test.com", "password": "Test1234!", "role": "teacher"},
    {"email": "admin1@test.com", "password": "Test1234!", "role": "admin"},
]

AI_TOPICS = [
    {"topic": "Phương trình bậc hai", "subject": "Toán học", "grade": "10"},
    {"topic": "Định luật Newton", "subject": "Vật lý", "grade": "10"},
    {"topic": "Phản ứng hóa học", "subject": "Hóa học", "grade": "11"},
    {"topic": "Quang hợp", "subject": "Sinh học", "grade": "11"},
    {"topic": "Chiến tranh thế giới thứ hai", "subject": "Lịch sử", "grade": "12"},
]

# =============================================================================
# User Behavior Classes
# =============================================================================


class StudentUser(HttpUser):
    """Simulates student user behavior"""
    
    wait_time = between(2, 5)
    weight = 5  # 5x more common than teacher
    
    def on_start(self):
        """Login on start"""
        self.user = random.choice([u for u in TEST_USERS if u["role"] == "student"])
        self.token = self.login()
    
    def login(self):
        """Login and return token"""
        response = self.client.post(
            "/api/auth/login",
            json={"email": self.user["email"], "password": self.user["password"]}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("nextStep", "").replace("Token: ", "")
        return None
    
    @task(10)
    def view_dashboard(self):
        """View student dashboard"""
        self.client.get("/")
    
    @task(5)
    def browse_courses(self):
        """Browse available courses"""
        self.client.get("/api/courses")
    
    @task(3)
    def submit_assignment(self):
        """Submit an assignment for grading"""
        assignment_id = f"assignment-{random.randint(1, 10)}"
        
        response = self.client.post(
            "/api/grading/submit",
            json={
                "assignment_id": assignment_id,
                "submission": f"Bài làm của học sinh {random.randint(1, 100)}",
                "subject": "Toán học",
            },
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "score" in data.get("data", {})
    
    @task(2)
    def view_grades(self):
        """View grades"""
        self.client.get(
            f"/api/grading/{random.randint(1, 100)}",
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
    
    @task(1)
    def ai_help(self):
        """Ask AI for help"""
        topic = random.choice(AI_TOPICS)
        
        response = self.client.post(
            "/api/ai-chat",
            json={
                "message": f"Giải thích về {topic['topic']}",
                "type": "help",
            },
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
        
        assert response.status_code == 200


class TeacherUser(HttpUser):
    """Simulates teacher user behavior"""
    
    wait_time = between(3, 8)
    weight = 2  # 2x less common than student
    
    def on_start(self):
        """Login on start"""
        self.user = random.choice([u for u in TEST_USERS if u["role"] == "teacher"])
        self.token = self.login()
    
    def login(self):
        """Login and return token"""
        response = self.client.post(
            "/api/auth/login",
            json={"email": self.user["email"], "password": self.user["password"]}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("nextStep", "").replace("Token: ", "")
        return None
    
    @task(10)
    def view_teacher_dashboard(self):
        """View teacher dashboard"""
        self.client.get("/teacher/dashboard")
    
    @task(8)
    def view_students(self):
        """View student list"""
        response = self.client.get(
            "/api/teacher/students",
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "students" in data
    
    @task(5)
    def generate_content(self):
        """Generate AI content"""
        topic = random.choice(AI_TOPICS)
        
        response = self.client.post(
            "/api/ai-content/generate",
            json={
                "type": "lesson",
                "topic": topic["topic"],
                "subject": topic["subject"],
                "grade": topic["grade"],
                "difficulty": random.choice(["easy", "medium", "hard"]),
            },
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
        
        assert response.status_code == 200
    
    @task(3)
    def grade_submissions(self):
        """Grade student submissions"""
        response = self.client.patch(
            f"/api/grading/{random.randint(1, 100)}",
            json={
                "score": random.uniform(5, 10),
                "feedback": "Good work!",
            },
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )
    
    @task(2)
    def create_assignment(self):
        """Create new assignment"""
        self.client.post(
            "/api/assignments",
            json={
                "title": f"Bài tập {random.randint(1, 100)}",
                "description": "Mô tả bài tập",
                "courseId": f"course-{random.randint(1, 10)}",
            },
            headers={"Authorization": f"Bearer {self.token}"} if self.token else {}
        )


class APIUser(HttpUser):
    """Simulates API-only usage (mobile apps, integrations)"""
    
    wait_time = between(1, 3)
    weight = 1
    
    @task(10)
    def vector_similarity(self):
        """Test vector similarity API"""
        response = self.client.post(
            "/api/vector-similarity",
            json={
                "student_answer": "Đảng CSVN ra đời năm 1930",
                "model_answer": "Đảng CSVN thành lập ngày 3/2/1930",
                "use_cache": True,
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "similarity" in data
    
    @task(5)
    def health_check(self):
        """Health check endpoint"""
        response = self.client.get("/health")
        assert response.status_code == 200
    
    @task(3)
    def ai_generate_lesson(self):
        """Generate lesson via AI"""
        topic = random.choice(AI_TOPICS)
        
        response = self.client.post(
            "/api/ai-generate-lesson",
            json={
                "title": topic["topic"],
                "subject": topic["subject"],
                "difficulty": "medium",
                "duration": 45,
            }
        )
        
        assert response.status_code == 200


# =============================================================================
# Event Handlers
# =============================================================================

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, 
               context, exception, start_time, url, **kwargs):
    """Log slow requests"""
    if response_time > 2000:  # > 2 seconds
        print(f"⚠️  Slow request: {name} took {response_time}ms")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Test start handler"""
    print("🚀 Load test starting...")
    print(f"Target: {environment.host}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Test stop handler"""
    print("✅ Load test completed!")
    
    # Print summary
    stats = environment.stats
    print(f"\n📊 Summary:")
    print(f"  Total Requests: {stats.total.num_requests}")
    print(f"  Failures: {stats.total.num_failures}")
    print(f"  Failure Rate: {stats.total.fail_ratio:.2%}")
    print(f"  Avg Response Time: {stats.total.avg_response_time:.0f}ms")
    print(f"  Requests/sec: {stats.total.current_rps:.1f}")


# =============================================================================
# Distributed Testing (Master/Worker)
# =============================================================================

if isinstance(__import__("locust").runners, MasterRunner):
    @events.init.add_listener
    def on_locust_init(environment, **kwargs):
        print("🎯 Running as Master node for distributed testing")


if isinstance(__import__("locust").runners, WorkerRunner):
    @events.init.add_listener
    def on_locust_init(environment, **kwargs):
        print("👷 Running as Worker node")
