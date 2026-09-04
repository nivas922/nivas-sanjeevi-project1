# LearnAI Platform: REST API Specification (Postman Style)

Base URL: `http://localhost:5000/api` (also accessible at root `/`)

---

## 1. Authentication Endpoints

### 1.1 Google OAuth Sign In / Sign Up
- **Method**: `POST`
- **Endpoint**: `/auth/google`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Alex Johnson",
  "email": "alex.johnson@university.edu",
  "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=alex",
  "department": "Computer Science & Engineering (CSE)"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_79c880ae-57f",
    "name": "Alex Johnson",
    "email": "alex.johnson@university.edu",
    "login_method": "google",
    "role": "Computer Science & Engineering (CSE)",
    "preferred_language": "en"
  },
  "isNewUser": true
}
```

### 1.2 Send Mobile OTP
- **Method**: `POST`
- **Endpoint**: `/auth/mobile/send-otp`
- **Rate Limit**: 10 requests / 10 minutes
- **Request Body**:
```json
{
  "mobile": "9876543210"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "status": "success",
  "message": "OTP sent successfully to mobile number.",
  "data": {
    "mobile": "9876543210",
    "expiresInSeconds": 300,
    "devOtp": "669554"
  }
}
```

### 1.3 Verify Mobile OTP & Login
- **Method**: `POST`
- **Endpoint**: `/auth/mobile/verify-otp`
- **Request Body**:
```json
{
  "mobile": "9876543210",
  "otp": "669554",
  "department": "Information Technology (IT)"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_a462c046-28b",
    "name": "Student (3210)",
    "mobile": "9876543210",
    "login_method": "mobile",
    "role": "Information Technology (IT)",
    "preferred_language": "en"
  }
}
```

---

## 2. Textbook & Learning Material Endpoints

### 2.1 Upload Textbook
- **Method**: `POST`
- **Endpoint**: `/upload-book`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Data**:
  - `file`: `<binary file>` (PDF, DOC, DOCX, TXT, Max 50MB)
  - `title`: "Computer Networks: Principles & Protocols"
  - `subject`: "Computer Networks"
- **Response (201 Created)**:
```json
{
  "success": true,
  "status": "success",
  "book_id": "86023c10-6a4e-4930-a97e-87ccece44591",
  "book": {
    "id": "86023c10-6a4e-4930-a97e-87ccece44591",
    "title": "Computer Networks: Principles & Protocols",
    "subject": "Computer Networks",
    "file_url": "/uploads/1788503512279.pdf"
  }
}
```

### 2.2 Multilingual AI Summarization
- **Method**: `POST`
- **Endpoint**: `/summarize`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "book_id": "86023c10-6a4e-4930-a97e-87ccece44591",
  "target_language": "ta"
}
```
*(Note: If `target_language` is omitted, defaults to the user's `preferred_language` from their profile).*
- **Response (200 OK)**:
```json
{
  "success": true,
  "status": "success",
  "summary_id": "sum-1788503512300",
  "language": "ta",
  "summary": {
    "id": "sum-1788503512300",
    "summary_text": "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் (TCP) என்பது...",
    "keyConcepts": ["இணைப்பு சார்ந்த நெறிமுறை", "நம்பகமான தரவுப் பரிமாற்றம்"],
    "definitions": [{"term": "மூன்று வழி கைகுலுக்கல்", "meaning": "SYN, SYN-ACK..."}],
    "audioUrl": "/uploads/tts-1788503512303.mp3"
  }
}
```

### 2.3 Text-To-Speech (TTS)
- **Method**: `POST`
- **Endpoint**: `/text-to-speech`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "text": "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் ஒரு இணைப்பு சார்ந்த நெறிமுறை.",
  "language": "ta"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "status": "success",
  "audioUrl": "/uploads/tts-1788503512330.mp3",
  "language": "ta-IN",
  "voiceModel": "ta-IN-Standard-A"
}
```

---

## 3. Adaptive Quiz Endpoints

### 3.1 Generate Adaptive Quiz
- **Method**: `POST`
- **Endpoint**: `/generate-quiz`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "book_id": "86023c10-6a4e-4930-a97e-87ccece44591",
  "num_questions": 5,
  "language": "ta"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "status": "success",
  "quiz_id": "fa5baa32-76ed-40a6-96a3-a89c321db47f",
  "quiz": {
    "totalQuestions": 5,
    "questions": [
      {
        "id": "q-1",
        "question": "What is the primary role of system architecture boundaries?",
        "options": ["Enforce modularity", "Increase latency", "Prevent compilation", "None"],
        "difficulty": "Intermediate"
      }
    ]
  }
}
```

### 3.2 Submit Quiz
- **Method**: `POST`
- **Endpoint**: `/submit-quiz`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "quiz_id": "fa5baa32-76ed-40a6-96a3-a89c321db47f",
  "answers": {
    "q-1": 0,
    "q-2": 1,
    "q-3": 0,
    "q-4": 1,
    "q-5": 2
  }
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "status": "success",
  "score": 4,
  "totalQuestions": 5,
  "percentage": 80,
  "performanceLevel": "Strong",
  "recommendedTopic": "Advanced System Applications",
  "recommendationDifficulty": "Advanced"
}
```

---

## 4. Analytics, Profile & Adaptive Recommendations

### 4.1 Get User Progress
- **Method**: `GET`
- **Endpoint**: `/progress/:user_id`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "stats": {
    "booksStudied": 1,
    "summariesGenerated": 1,
    "quizzesCompleted": 1,
    "averageScore": 80
  },
  "subjectProgress": [
    {
      "subject": "Computer Networks",
      "books_studied_count": 1,
      "summaries_count": 1,
      "quizzes_taken": 1,
      "average_score": 80
    }
  ]
}
```

### 4.2 Get Recent Learning Activity
- **Method**: `GET`
- **Endpoint**: `/activity/:user_id`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "activities": [
    {
      "id": "act-1",
      "activity_type": "quiz",
      "title": "Completed Quiz (4/5 - 80%)",
      "timestamp": "2026-09-04T12:01:48.000Z"
    }
  ]
}
```

### 4.3 Update Profile
- **Method**: `PUT`
- **Endpoint**: `/profile`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "role": "Information Technology (IT)",
  "preferred_language": "ta"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "user": {
    "role": "Information Technology (IT)",
    "preferred_language": "ta"
  }
}
```

### 4.4 Get Adaptive Learning Recommendations
- **Method**: `GET`
- **Endpoint**: `/recommendations/:user_id`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "recommendations": [
    {
      "id": "rec-1",
      "topic": "Computer Networks - Mastery Applications",
      "reason": "Great score of 80%! System unlocked advanced learning challenges.",
      "recommendedDifficulty": "Advanced",
      "actionType": "quiz",
      "urgency": "Low"
    }
  ]
}
```
