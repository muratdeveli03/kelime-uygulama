#!/usr/bin/env python3
"""
Backend API Testing for 5 Kutu Yöntemi Vocabulary Learning System
Tests all endpoints with proper error handling and comprehensive coverage
"""

import requests
import sys
import json
from datetime import datetime
import os

class VocabAPITester:
    def __init__(self, base_url="https://vocab-kutu.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def test_student_auth_valid(self):
        """Test valid student authentication"""
        try:
            data = {"code": "9011"}
            response = requests.post(f"{self.api_url}/auth/student", data=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("student", {}).get("name") == "Ali ARIKAN":
                    self.log_test("Student Auth (Valid Code)", True)
                    return result["student"]
                else:
                    self.log_test("Student Auth (Valid Code)", False, "Invalid response structure")
            else:
                self.log_test("Student Auth (Valid Code)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Student Auth (Valid Code)", False, str(e))
        return None

    def test_student_auth_invalid(self):
        """Test invalid student authentication"""
        try:
            data = {"code": "9999"}
            response = requests.post(f"{self.api_url}/auth/student", data=data)
            
            if response.status_code == 404:
                self.log_test("Student Auth (Invalid Code)", True)
            else:
                self.log_test("Student Auth (Invalid Code)", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("Student Auth (Invalid Code)", False, str(e))

    def test_admin_auth_valid(self):
        """Test valid admin authentication"""
        try:
            data = {"password": "sefer1295"}
            response = requests.post(f"{self.api_url}/auth/admin", json=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    self.log_test("Admin Auth (Valid Password)", True)
                    return True
                else:
                    self.log_test("Admin Auth (Valid Password)", False, "Invalid response")
            else:
                self.log_test("Admin Auth (Valid Password)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Admin Auth (Valid Password)", False, str(e))
        return False

    def test_admin_auth_invalid(self):
        """Test invalid admin authentication"""
        try:
            data = {"password": "wrongpassword"}
            response = requests.post(f"{self.api_url}/auth/admin", json=data)
            
            if response.status_code == 401:
                self.log_test("Admin Auth (Invalid Password)", True)
            else:
                self.log_test("Admin Auth (Invalid Password)", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("Admin Auth (Invalid Password)", False, str(e))

    def test_upload_students(self):
        """Test student CSV upload"""
        try:
            with open('/app/test_students.csv', 'rb') as f:
                files = {'file': ('test_students.csv', f, 'text/csv')}
                response = requests.post(f"{self.api_url}/admin/upload-students", files=files)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    added = result.get("students_added", 0)
                    updated = result.get("students_updated", 0)
                    self.log_test("Upload Students CSV", True, f"Added: {added}, Updated: {updated}")
                    return True
                else:
                    self.log_test("Upload Students CSV", False, "Upload failed")
            else:
                self.log_test("Upload Students CSV", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Upload Students CSV", False, str(e))
        return False

    def test_upload_words(self):
        """Test words CSV upload"""
        try:
            with open('/app/test_words.csv', 'rb') as f:
                files = {'file': ('test_words.csv', f, 'text/csv')}
                response = requests.post(f"{self.api_url}/admin/upload-words", files=files)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    added = result.get("words_added", 0)
                    self.log_test("Upload Words CSV", True, f"Added: {added} words")
                    return True
                else:
                    self.log_test("Upload Words CSV", False, "Upload failed")
            else:
                self.log_test("Upload Words CSV", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Upload Words CSV", False, str(e))
        return False

    def test_student_stats(self, student_code="9011"):
        """Test student statistics endpoint"""
        try:
            response = requests.get(f"{self.api_url}/student/{student_code}/stats")
            
            if response.status_code == 200:
                result = response.json()
                required_fields = ["total_words", "box_distribution", "words_studied_today", "next_study_words"]
                
                if all(field in result for field in required_fields):
                    self.log_test("Student Stats", True, f"Total words: {result['total_words']}")
                    return result
                else:
                    self.log_test("Student Stats", False, "Missing required fields")
            else:
                self.log_test("Student Stats", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Student Stats", False, str(e))
        return None

    def test_get_next_word(self, student_code="9011"):
        """Test getting next word for study"""
        try:
            response = requests.get(f"{self.api_url}/study/{student_code}/next-word")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("completed"):
                    self.log_test("Get Next Word", True, "Study completed for today")
                    return None
                elif "word_id" in result and "english" in result:
                    self.log_test("Get Next Word", True, f"Word: {result['english']}")
                    return result
                else:
                    self.log_test("Get Next Word", False, "Invalid response structure")
            else:
                self.log_test("Get Next Word", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Next Word", False, str(e))
        return None

    def test_submit_answer(self, student_code="9011", word_id=None, answer="merhaba"):
        """Test submitting an answer"""
        if not word_id:
            # Get a word first
            word_data = self.test_get_next_word(student_code)
            if not word_data:
                self.log_test("Submit Answer", False, "No word available to test")
                return None
            word_id = word_data["word_id"]

        try:
            data = {
                "student_code": student_code,
                "word_id": word_id,
                "answer": answer,
                "is_correct": False  # Backend determines this
            }
            response = requests.post(f"{self.api_url}/study/answer", json=data)
            
            if response.status_code == 200:
                result = response.json()
                required_fields = ["word_id", "english", "is_correct", "correct_answers", "new_box", "message"]
                
                if all(field in result for field in required_fields):
                    correct = "✅" if result["is_correct"] else "❌"
                    self.log_test("Submit Answer", True, f"{correct} Answer: {answer} -> Box {result['new_box']}")
                    return result
                else:
                    self.log_test("Submit Answer", False, "Missing required fields")
            else:
                self.log_test("Submit Answer", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Submit Answer", False, str(e))
        return None

    def test_student_words(self, student_code="9011"):
        """Test getting all student words"""
        try:
            response = requests.get(f"{self.api_url}/student/{student_code}/words")
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list):
                    self.log_test("Student Words List", True, f"Found {len(result)} words")
                    return result
                else:
                    self.log_test("Student Words List", False, "Response is not a list")
            else:
                self.log_test("Student Words List", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Student Words List", False, str(e))
        return None

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting Backend API Tests for 5 Kutu Yöntemi")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📝 Authentication Tests:")
        student = self.test_student_auth_valid()
        self.test_student_auth_invalid()
        self.test_admin_auth_valid()
        self.test_admin_auth_invalid()
        
        # Admin Upload Tests
        print("\n📤 Admin Upload Tests:")
        self.test_upload_students()
        self.test_upload_words()
        
        # Student Data Tests
        print("\n📊 Student Data Tests:")
        stats = self.test_student_stats()
        words = self.test_student_words()
        
        # Study Flow Tests
        print("\n🎓 Study Flow Tests:")
        next_word = self.test_get_next_word()
        if next_word:
            # Test correct answer
            self.test_submit_answer(answer="merhaba")
            # Test incorrect answer
            self.test_submit_answer(answer="wrong")
        
        # Print Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            failed_tests = [t for t in self.test_results if not t["success"]]
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['details']}")
            return False

def main():
    """Main test execution"""
    tester = VocabAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())