# SYNAPSE — Team-Specific Product Requirements Document (PRD)

**Version:** 1.0  
**Product:** Synapse  
**Product Type:** Civic Grievance + Social Accountability Platform  
**Primary Users:** Citizens, Government Officers, Administrators  
**Core Platforms:** Web/Mobile-responsive application + WhatsApp bot  
**Core Concept:** X/Twitter-style civic social network combined with AI-powered grievance routing and government resolution tracking.

---

# 1. Product Vision

Synapse is a civic platform where citizens can:

- Create a verified account.
- Submit civic grievances through text, voice, photo, or video.
- Automatically identify grievance category, severity, and responsible department.
- Track grievances from submission to resolution.
- See all grievances on their profile, similar to posts on an X/Twitter profile.
- See a location-based public civic feed.
- Upvote, downvote, and comment on public grievances.
- Create a measurable community-accountability signal around important issues.
- Receive updates when government officers act on grievances.
- See evidence when a grievance is marked resolved.

The product combines the citizen layer, government workflow, and public accountability layer into one system.

---

# 2. Product Philosophy

Synapse has three connected layers:

```text
┌──────────────────────────────────────────────┐
│                CITIZEN LAYER                 │
│                                              │
│ Account → Profile → Grievance                │
│ → My Grievances → Status Tracking            │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│              GOVERNMENT LAYER                │
│                                              │
│ AI → Category → Ward → Department            │
│ → Officer → SLA → Resolution                 │
└──────────────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│            ACCOUNTABILITY LAYER               │
│                                              │
│ Public Feed → Votes → Comments               │
│ → Community Attention → Action               │
│ → Resolution → Public Update                 │
└──────────────────────────────────────────────┘
```

---

# 3. End-to-End Product Flow

```text
USER
  ↓
SIGN UP
  ↓
SMS OTP VERIFICATION
  ↓
ACCOUNT CREATED
  ↓
PROFILE
  ↓
REPORT GRIEVANCE
  ↓
TEXT / VOICE / PHOTO / VIDEO
  ↓
LOCATION
  ↓
AI PROCESSING
  ↓
CATEGORY + SEVERITY + IMPACT
  ↓
DUPLICATE DETECTION
  ↓
WARD DETECTION
  ↓
DEPARTMENT ROUTING
  ↓
OFFICER DASHBOARD
  ↓
ACKNOWLEDGED
  ↓
PUBLIC CIVIC FEED
  ↓
LOCATION-BASED VISIBILITY
  ↓
UPVOTE / DOWNVOTE / COMMENT
  ↓
COMMUNITY ACCOUNTABILITY SIGNAL
  ↓
OFFICER ACTION
  ↓
IN PROGRESS
  ↓
RESOLUTION EVIDENCE
  ↓
RESOLVED
  ↓
USER NOTIFICATION
  ↓
PROFILE STATUS UPDATED
```

---

# 4. User Roles

## 4.1 Citizen

A citizen can:

- Register.
- Verify mobile number.
- Login.
- Manage profile.
- Submit grievances.
- Upload text.
- Upload voice.
- Upload photos.
- Upload videos.
- Share location.
- View own grievances.
- Track grievance status.
- View public feed.
- Upvote.
- Downvote.
- Comment.
- Receive notifications.
- Dispute an incorrect resolution.
- View resolution evidence.

## 4.2 Government Officer

An officer can:

- Login to officer dashboard.
- View assigned grievances.
- View evidence.
- View citizen information permitted by policy.
- View location.
- Acknowledge grievance.
- Assign work.
- Update status.
- Upload resolution evidence.
- Resolve grievance.
- View community engagement.
- View SLA information.
- Handle disputed grievances.

## 4.3 Administrator

Admin can:

- Manage users.
- Manage officers.
- Manage departments.
- Manage wards.
- Manage grievance categories.
- Manage SLA configuration.
- Moderate public content.
- Review AI decisions.
- View analytics.
- Manage system configuration.
- Access audit logs.

---

# 5. Team Structure

Synapse development is divided into four responsibilities:

```text
┌──────────────────┐
│  FRONTEND TEAM   │
│                  │
│ UI + UX + Client │
│ API Integration  │
└────────┬─────────┘
         │
         │
┌────────▼─────────┐
│   BACKEND TEAM   │
│                  │
│ APIs + DB + Auth │
│ Business Logic   │
└────────┬─────────┘
         │
         │
┌────────▼─────────┐
│     AI TEAM      │
│                  │
│ NLP + CV + STT   │
│ Scoring + Match  │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────┐
│ FINAL INTEGRATION / MERGE      │
│                                │
│ Backend Team                   │
│ Connects Frontend + AI + DB    │
│ Performs E2E Testing           │
│ Deploys Complete Application   │
└────────────────────────────────┘
```

## Team Ownership

| Module | Primary Owner | Final Integration Owner |
|---|---|---|
| Frontend UI | Frontend Team | Backend Team |
| Backend APIs | Backend Team | Backend Team |
| Database | Backend Team | Backend Team |
| AI Models | AI Team | Backend Team |
| AI Service/API | AI Team | Backend Team |
| Authentication | Backend + Frontend | Backend Team |
| Public Feed | Frontend + Backend | Backend Team |
| Officer Dashboard | Frontend + Backend | Backend Team |
| Notifications | Backend | Backend Team |
| Deployment | Backend Team | Backend Team |
| End-to-End Testing | All Teams | Backend Team |
| Final Merge | All Teams | Backend Team |

---

# 6. BACKEND TEAM PRD

## 6.1 Backend Responsibilities

The backend team is responsible for:

- REST API development.
- Authentication.
- Authorization.
- User management.
- Grievance management.
- Database design.
- Department routing.
- Ward mapping.
- Officer assignment.
- Feed APIs.
- Voting APIs.
- Comment APIs.
- Notification APIs.
- Resolution workflow.
- SLA handling.
- Audit logs.
- Security.
- AI service integration.
- Frontend API integration.
- Final integration.
- End-to-end testing.
- Production deployment.

The backend is also the final integration layer that connects all teams.

---

# 7. Backend Architecture

Recommended structure:

```text
server/
│
├── controllers/
│   ├── auth/
│   ├── users/
│   ├── grievances/
│   ├── feed/
│   ├── posts/
│   ├── votes/
│   ├── comments/
│   ├── notifications/
│   └── officer/
│
├── models/
│   ├── User
│   ├── OTPVerification
│   ├── Grievance
│   ├── MasterIncident
│   ├── PublicPost
│   ├── Vote
│   ├── Comment
│   ├── Department
│   ├── Officer
│   ├── Ward
│   ├── Notification
│   ├── ResolutionEvidence
│   ├── AuditLog
│   └── SLAConfig
│
├── routes/
│   ├── auth
│   ├── users
│   ├── grievances
│   ├── feed
│   ├── posts
│   ├── votes
│   ├── comments
│   ├── notifications
│   ├── officer
│   └── map
│
├── middleware/
│   ├── auth
│   ├── role
│   ├── validation
│   ├── rateLimit
│   └── upload
│
├── services/
│   ├── otp
│   ├── routing
│   ├── notification
│   ├── scoring
│   ├── duplicate
│   ├── feedRanking
│   ├── ai
│   └── storage
│
└── utils/
```

---

# 8. Authentication

## 8.1 Registration

Frontend fields:

```text
Name
Username
Mobile Number
Email
Password
```

Backend requirements:

- Validate all fields.
- Ensure username uniqueness.
- Ensure mobile uniqueness.
- Ensure email uniqueness where required.
- Hash passwords.
- Generate OTP.
- Store OTP securely.
- Apply OTP expiration.
- Apply OTP attempt limits.
- Apply resend cooldown.
- Require phone verification before grievance submission.

## 8.2 Authentication APIs

```http
POST /api/auth/register
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## 8.3 User Lookup

Query-based:

```http
GET /api/users?username=riteshmanhar
GET /api/users?search=ritesh
GET /api/users/me
```

---

# 9. User APIs

```http
GET /api/users/me
GET /api/users?username=ritesh
GET /api/users?search=ritesh
PATCH /api/users/me
```

Profile should expose:

- Name.
- Username.
- Profile image.
- Total grievances.
- Resolved grievances.
- Pending grievances.
- In-progress grievances.
- Public profile information.

---

# 10. Grievance Backend

## 10.1 Submission API

```http
POST /api/grievances
```

Example request:

```json
{
  "text": "There is a large pothole near NIT gate.",
  "location": {
    "latitude": 21.25,
    "longitude": 81.63
  },
  "media": []
}
```

Files may be provided through multipart upload or object-storage URLs.

## 10.2 Grievance Data Model

```text
grievanceId
userId
text
voiceUrl
images[]
videos[]
location
category
subCategory
wardId
departmentId
officerId
severity
impactScore
aiConfidence
masterIncidentId
status
createdAt
updatedAt
```

Location should use GeoJSON:

```json
{
  "type": "Point",
  "coordinates": [
    81.63,
    21.25
  ]
}
```

---

# 11. Query-Based Grievance APIs

All READ operations should use query parameters.

```http
GET /api/grievances?mine=true
GET /api/grievances?mine=true&status=pending
GET /api/grievances?mine=true&status=in_progress
GET /api/grievances?mine=true&status=resolved
GET /api/grievances?mine=true&category=roads
GET /api/grievances?mine=true&page=1&limit=20
GET /api/grievances?department=road
GET /api/grievances?department=road&status=pending
GET /api/grievances?department=road&priority=critical
GET /api/grievances?department=road&ward=12
GET /api/grievances?department=road&sort=impact
GET /api/grievances?assignedTo=me
GET /api/grievances?search=pothole
GET /api/grievances?lat=21.25&lng=81.63&radius=5000
```

### API Rule

Use query parameters for:

- Filtering.
- Searching.
- Sorting.
- Pagination.
- Location.
- Status.
- Category.
- Department.
- Ward.
- Date.

Use request bodies for write operations.

---

# 12. Grievance Processing Pipeline

After submission:

```text
POST /api/grievances
       ↓
Validation
       ↓
Store Raw Grievance
       ↓
AI Processing
       ↓
Department Routing
       ↓
Officer Queue
```

Initial status:

```text
SUBMITTED
```

The backend should orchestrate the AI pipeline and persist AI output.

---

# 13. Department and Ward Routing

Pipeline:

```text
Grievance
   ↓
GPS
   ↓
Ward
   ↓
Department
   ↓
Officer
```

Example:

```text
Pothole
   ↓
Ward 12
   ↓
Road Department
   ↓
Ward 12 Road Officer
```

Initial categories:

- Road
- Water
- Sanitation
- Electrical
- Sewerage
- Traffic
- Public Safety
- Other

Example mapping:

| Category | Department |
|---|---|
| Pothole | Road |
| Garbage | Sanitation |
| Water leakage | Water |
| Streetlight | Electrical |
| Sewer overflow | Sewerage |
| Traffic signal | Traffic |

---

# 14. Officer APIs

```http
GET /api/grievances?assignedTo=me
GET /api/grievances?department=road&status=pending
GET /api/grievances?department=road&sort=impact
PATCH /api/grievances/:id/status
POST /api/grievances/:id/resolution
```

Officer dashboard should support:

- Assigned grievances.
- Pending cases.
- Critical cases.
- High-impact cases.
- In-progress cases.
- Resolved cases.
- Community engagement.
- SLA information.
- Evidence.
- Citizen dispute handling.

---

# 15. Government Status Lifecycle

Primary workflow:

```text
SUBMITTED
    ↓
AI_PROCESSED
    ↓
ASSIGNED
    ↓
ACKNOWLEDGED
    ↓
IN_PROGRESS
    ↓
RESOLUTION_SUBMITTED
    ↓
VERIFICATION
    ↓
RESOLVED
```

Alternative branch:

```text
ASSIGNED
   ↓
ACKNOWLEDGED
   ↓
IN_PROGRESS
   ↓
RESOLUTION_SUBMITTED
   ↓
VERIFICATION
   ├── APPROVED → RESOLVED
   └── DISPUTED → REOPENED
```

---

# 16. Resolution Evidence

Officer submits:

- Before photo.
- After photo.
- GPS.
- Timestamp.
- Resolution description.

Example:

```text
RESOLUTION

Before: [Photo]
After:  [Photo]

Location: Verified
Date: 30 Sep 2026
Status: RESOLVED
```

The backend stores resolution evidence and links it to the grievance.

---

# 17. Feed Backend

Primary endpoint:

```http
GET /api/feed
```

Supported parameters:

```text
type
lat
lng
radius
category
status
ward
sort
page
limit
cursor
```

Example:

```http
GET /api/feed?type=nearby&lat=21.2514&lng=81.6296&radius=5000&category=roads&sort=engagement&page=1&limit=20
```

Feed types:

```http
GET /api/feed?type=nearby
GET /api/feed?type=for_you
GET /api/feed?type=trending
GET /api/feed?category=roads
GET /api/feed?status=resolved
```

MongoDB geospatial indexes should support location-aware queries.

---

# 18. Feed Ranking

Feed should consider:

- Location relevance.
- Recency.
- Engagement.
- Impact.
- Personal relevance.

The exact internal ranking formula should not initially be exposed to users.

---

# 19. Voting APIs

```http
GET /api/votes?postId=123
POST /api/votes
DELETE /api/votes?postId=123
```

Create vote:

```json
{
  "postId": "POST123",
  "type": "upvote"
}
```

One user should have only one active vote per post.

Possible states:

```text
NONE
UPVOTE
DOWNVOTE
```

---

# 20. Comments APIs

```http
GET /api/comments?postId=POST123&page=1&limit=20
POST /api/comments
DELETE /api/comments?id=456
```

Create comment:

```json
{
  "postId": "POST123",
  "text": "This issue is also affecting our area."
}
```

---

# 21. Community Accountability

Community engagement should be stored separately from government priority.

Measurements may include:

- Impact.
- Safety.
- Severity.
- Affected people.
- Hazard.
- Upvotes.
- Comments.
- Unique reports.
- Recent activity.
- SLA time remaining.
- SLA time overdue.

Upvotes alone must not define government priority.

---

# 22. Notifications

APIs:

```http
GET /api/notifications?read=false
GET /api/notifications?type=grievance
GET /api/notifications?page=1&limit=20
```

Notification examples:

```text
Your grievance has been acknowledged.

Your grievance is now being worked on.

Your grievance has been marked resolved.
View resolution evidence →
```

Channels:

- In-app.
- SMS.
- WhatsApp.

---

# 23. GIS APIs

```http
GET /api/map/incidents?ward=12
GET /api/map/incidents?category=water
GET /api/map/incidents?status=pending
```

Officer map should support:

- Incident markers.
- Ward filters.
- Category filters.
- Status filters.
- Severity visualization.
- Chronic issue hotspots.

---

# 24. SLA System

Every department/category can have an SLA.

Example configuration:

```text
Critical → 4 hours
High     → 12 hours
Medium   → 24 hours
Low      → 72 hours
```

These are example configuration values and should remain configurable.

Dashboard can show:

```text
03:21:14 remaining
```

If overdue:

```text
SLA BREACHED
```

---

# 25. Database

Recommended MongoDB collections:

```text
users
otpVerifications
grievances
masterIncidents
publicPosts
votes
comments
departments
officers
wards
notifications
resolutionEvidence
auditLogs
slaConfigs
```

Relationship:

```text
USER
 │
 ├── GRIEVANCES
 │       │
 │       ↓
 │   MASTER INCIDENT
 │       │
 │       ↓
 │   PUBLIC POST
 │      / \
 │     /   \
 ↓    ↓     ↓
VOTES COMMENTS
 │
 ↓
COMMUNITY SIGNAL

NOTIFICATIONS
RESOLUTION EVIDENCE
AUDIT LOGS
```

---

# 26. Security

Implement:

- Password hashing.
- JWT authentication.
- Role-based authorization.
- OTP rate limiting.
- Login rate limiting.
- API rate limiting.
- File validation.
- File size limits.
- Input sanitization.
- PII protection.
- Audit logs.
- Secure media storage.
- HTTPS.
- Secure tokens.
- Permission checks.

Important risks:

- PII exposure.
- False duplicate merges.
- AI misclassification.
- Unauthorized officer access.
- Malicious uploads.
- Public-content abuse.

---

# 27. Privacy Model

## Private grievance data

May contain:

- Phone.
- Email.
- Original voice.
- Original media.
- User-specific information.

## Public incident data

Should contain only information intended for public visibility:

- Issue.
- Approximate/public location.
- Category.
- Evidence permitted for publication.
- Status.
- Department.
- Engagement.
- Resolution.

---

# 28. Audit Logs

Every important government action should generate an audit event.

Schema:

```json
{
  "actorId": "...",
  "actorRole": "officer",
  "action": "...",
  "grievanceId": "...",
  "previousStatus": "...",
  "newStatus": "...",
  "timestamp": "...",
  "metadata": {}
}
```

Examples:

- Officer acknowledged grievance.
- Officer changed status.
- Officer uploaded evidence.
- Admin reassigned grievance.
- AI merged reports.
- Admin reopened incident.

---

# 29. BACKEND MVP CHECKLIST

- [ ] Authentication.
- [ ] SMS OTP.
- [ ] Login.
- [ ] JWT.
- [ ] User profile.
- [ ] Grievance creation.
- [ ] Media upload.
- [ ] Location storage.
- [ ] AI service integration.
- [ ] Category persistence.
- [ ] Severity persistence.
- [ ] Impact score persistence.
- [ ] Department routing.
- [ ] Officer assignment.
- [ ] My Grievances APIs.
- [ ] Public Feed APIs.
- [ ] Voting APIs.
- [ ] Comment APIs.
- [ ] Officer APIs.
- [ ] Resolution APIs.
- [ ] Notification APIs.
- [ ] Audit logs.
- [ ] Security middleware.
- [ ] Final integration.
- [ ] Deployment.

---

# 30. FRONTEND TEAM PRD

## 30.1 Frontend Responsibilities

The frontend team is responsible for:

- Responsive web application.
- Citizen UI.
- Authentication screens.
- Citizen profile.
- Grievance submission.
- Grievance tracking.
- Public feed.
- Location-based feed.
- Voting.
- Comments.
- Notifications.
- Resolution evidence UI.
- Officer dashboard.
- Incident details.
- GIS map.
- API integration.
- Loading/error/empty states.

---

# 31. Frontend Architecture

```text
client/
│
├── src/
│
├── pages/
│   ├── auth/
│   │   ├── Login
│   │   ├── Register
│   │   └── VerifyOTP
│   │
│   ├── Home
│   ├── Feed
│   ├── Profile
│   ├── MyGrievances
│   ├── GrievanceDetails
│   ├── CreateGrievance
│   ├── Notifications
│   │
│   └── officer/
│       ├── Dashboard
│       ├── Grievances
│       ├── IncidentDetails
│       └── Map
│
├── components/
│   ├── auth/
│   ├── feed/
│   ├── grievance/
│   ├── profile/
│   ├── comments/
│   ├── voting/
│   └── officer/
│
├── services/
│   ├── authApi
│   ├── grievanceApi
│   ├── feedApi
│   ├── voteApi
│   └── notificationApi
│
├── hooks/
├── store/
└── utils/
```

---

# 32. Authentication UI

## Register

Fields:

```text
Name
Username
Mobile Number
Email
Password

[ Create Account ]
```

## OTP

```text
OTP Verification

OTP sent to:
+91 XXXXXXX123

[_] [_] [_] [_] [_] [_]

[ Verify ]

Resend OTP
```

UI requirements:

- OTP countdown.
- Error states.
- Invalid OTP state.
- Expired OTP state.
- Resend cooldown.
- Loading state.

---

# 33. Citizen Profile

Profile should follow the mental model of an X/Twitter profile.

Example:

```text
┌─────────────────────────────────────┐
│ PROFILE                             │
│                                     │
│ 👤                                  │
│ Ritesh Manhar                       │
│ @riteshmanhar                       │
│                                     │
│ 24 Grievances                       │
│ 18 Resolved                         │
│ 6 Pending                           │
│                                     │
│ [ Edit Profile ]                    │
└─────────────────────────────────────┘
```

Tabs:

```text
My Grievances
In Progress
Resolved
Pending
```

---

# 34. My Grievances

The user should see all grievances posted by them.

Example:

```text
MY GRIEVANCES

┌────────────────────────────────────┐
│ 🚨 Pothole near NIT Gate           │
│                                    │
│ Road Department                    │
│ 🟡 In Progress                     │
│                                    │
│ 👍 342   💬 46                     │
└────────────────────────────────────┘
```

Another:

```text
┌────────────────────────────────────┐
│ 💧 Water Leakage                   │
│                                    │
│ Water Department                   │
│ 🟢 Resolved                        │
│                                    │
│ Resolved: 30 Sep                   │
└────────────────────────────────────┘
```

---

# 35. Create Grievance

Primary CTA:

```text
🚨 Report an Issue
```

Submission interface supports:

### Text

```text
Describe the issue
[________________________]
```

### Voice

```text
🎤 Hold to Record

00:17

[ Stop ]
```

### Photo

```text
📷 Add Photo
```

### Video

```text
🎥 Add Video
```

### Location

```text
📍 Location

[ Use Current Location ]
```

The user should be able to manually adjust the location when GPS is inaccurate.

---

# 36. Grievance Details UI

Display:

- Grievance title.
- Description.
- Media.
- Location.
- Category.
- Severity.
- Impact.
- Status.
- Department.
- Officer action.
- Community engagement.
- Resolution evidence.
- Timeline.
- Dispute/reopen option.

---

# 37. Public Feed

The feed should have an X-like interaction model.

Example:

```text
Ritesh Manhar
@riteshmanhar

🚨 Large pothole near NIT Gate

📍 NIT Main Gate

Road & Infrastructure

Status: 🟡 Acknowledged

👍 342   👎 12   💬 46
```

Feed types:

- Nearby.
- For You.
- Trending.
- Category.
- Resolved.

---

# 38. Location-Based Feed

User GPS:

```text
GPS
 ↓
Latitude + Longitude
 ↓
Nearby Civic Incidents
 ↓
Ranking
 ↓
Feed
```

Frontend sends coordinates to backend.

Example:

```http
GET /api/feed?type=nearby&lat=21.25&lng=81.63&radius=5000
```

---

# 39. Feed Interaction

Each post supports:

```text
👍 Upvote
👎 Downvote
💬 Comment
```

Frontend should visually distinguish:

```text
NONE
UPVOTE
DOWNVOTE
```

---

# 40. Comments UI

Features:

- Comment list.
- Pagination.
- Add comment.
- Delete own comment.
- Loading state.
- Empty state.
- Error state.

---

# 41. Notifications UI

Notification center should display:

- Grievance acknowledged.
- Grievance in progress.
- Grievance resolved.
- Resolution evidence available.
- Grievance reopened.
- Other relevant system notifications.

Support:

```text
All
Unread
Grievances
```

---

# 42. Officer Dashboard

Dashboard example:

```text
MY DEPARTMENT

Critical       12
High           31
In Progress    47
Pending        82
Resolved       219
```

Officer should be able to:

- View assigned grievances.
- Filter.
- Sort.
- Search.
- Open incident.
- View evidence.
- Acknowledge.
- Start work.
- Submit resolution.
- View SLA.
- View community engagement.

---

# 43. Officer Incident View

Example:

```text
GRIEVANCE #GRV-10234

🚨 Large Pothole

📍 NIT Main Gate

Category: Road
Impact: 84/100
Reports: 86
Community Upvotes: 2,341

Status: Acknowledged

Evidence:
📷 Photo
🎤 Voice

SLA: 5 hours remaining

[ Start Work ]
```

---

# 44. Resolution UI

Officer submits:

```text
Before Photo
After Photo
GPS
Timestamp
Resolution Description

[ Submit Resolution ]
```

Citizen sees:

```text
RESOLUTION

Before: [Photo]
After: [Photo]

📍 Location verified
🕐 30 Sep 2026

Status: RESOLVED
```

---

# 45. Dispute UI

If the citizen believes the issue is not fixed:

```text
[ Issue Still Exists ]
```

Flow:

```text
Dispute Submitted
       ↓
Officer/Admin Review
       ↓
Reopen
```

---

# 46. GIS Map UI

Officer map should display:

```text
CITY MAP

🔴 Critical
🟠 High
🟡 Medium
🟢 Low
```

Filters:

- Ward.
- Category.
- Status.
- Severity.

---

# 47. Frontend API Integration Rules

All READ operations must use query-based backend APIs.

Examples:

```http
GET /api/grievances?mine=true
GET /api/grievances?mine=true&status=resolved
GET /api/feed?type=nearby
GET /api/feed?category=roads
GET /api/feed?status=resolved
GET /api/comments?postId=POST123
GET /api/notifications?read=false
```

Frontend must not duplicate backend business logic.

---

# 48. Frontend States

Every major screen should support:

- Loading.
- Success.
- Empty.
- Error.
- Unauthorized.
- Offline/network failure where appropriate.

---

# 49. FRONTEND MVP CHECKLIST

- [ ] Registration.
- [ ] OTP verification.
- [ ] Login.
- [ ] Profile.
- [ ] My Grievances.
- [ ] Create Grievance.
- [ ] Text submission.
- [ ] Photo upload.
- [ ] Location.
- [ ] Grievance Details.
- [ ] Public Feed.
- [ ] Nearby Feed.
- [ ] Upvote.
- [ ] Downvote.
- [ ] Comments.
- [ ] Notifications.
- [ ] Officer Dashboard.
- [ ] Incident Details.
- [ ] Resolution Evidence.
- [ ] Dispute/Reopen UI.
- [ ] GIS map.
- [ ] Responsive design.
- [ ] API integration.

---

# 50. AI TEAM PRD

## 50.1 AI Responsibilities

The AI team is responsible for understanding submitted grievance data.

AI responsibilities:

- Language detection.
- Text understanding.
- Category classification.
- Subcategory classification.
- Severity classification.
- Impact scoring.
- Speech-to-text.
- Image analysis.
- Video analysis.
- Semantic embeddings.
- Duplicate detection.
- Master incident detection.
- Confidence calculation.
- Human-review triggering.

The original proposal suggests local Ollama/Mistral inference, Sentence Transformers embeddings, and MongoDB Atlas vector search. The exact implementation model should remain configurable.

---

# 51. AI Architecture

```text
ai-engine/
│
├── app.py
│
├── services/
│   ├── speech_to_text.py
│   ├── language_detection.py
│   ├── classification.py
│   ├── impact_score.py
│   ├── embeddings.py
│   └── duplicate_detection.py
│
└── models/
```

---

# 52. AI Processing Pipeline

```text
GRIEVANCE
    ↓
INPUT VALIDATION
    ↓
MEDIA PROCESSING
    ↓
SPEECH-TO-TEXT (if voice)
    ↓
TEXT EXTRACTION
    ↓
LANGUAGE DETECTION
    ↓
CATEGORY CLASSIFICATION
    ↓
SUBCATEGORY CLASSIFICATION
    ↓
SEVERITY
    ↓
IMPACT SCORE
    ↓
EMBEDDING
    ↓
DUPLICATE CHECK
    ↓
AI CONFIDENCE
    ↓
BACKEND
```

---

# 53. Text Processing

Supported language scenarios include:

- Hindi.
- English.
- Hinglish.
- Multilingual input.

Example:

```text
Input:
"NIT gate ke paas road mein bahut bada pothole hai."
```

AI output:

```json
{
  "category": "Road",
  "subCategory": "Pothole",
  "language": "Hinglish",
  "severity": "High"
}
```

---

# 54. Language Detection

The AI service should determine the language of the grievance.

Example:

```text
English
Hindi
Hinglish
Other supported language
```

Language should be included in the AI response.

---

# 55. Category Classification

Initial categories:

```text
Road
Water
Sanitation
Electrical
Sewerage
Traffic
Public Safety
Other
```

Example:

```text
"Streetlight is not working"
        ↓
Electrical
        ↓
Streetlight
```

---

# 56. Severity

Severity should classify the urgency of the grievance.

Example levels:

```text
Low
Medium
High
Critical
```

Severity should consider the actual grievance content and available evidence.

---

# 57. Impact Scoring

Every grievance receives a score:

```text
0 ───────────────────────────── 100
Low                            Critical
```

Inputs may include:

- Severity.
- Public safety risk.
- Number of affected people.
- Hazard type.
- Evidence.
- Duration.

The proposal specifically defines a 0–100 impact score using weighted severity, public-safety risk, and affected headcount.

Example:

```text
Impact Score: 84/100
```

---

# 58. AI Confidence

Every AI classification must include confidence.

Example:

```text
Category: Road
Confidence: 94%
```

If confidence is below the defined threshold:

```text
AI Confidence < 75%
        ↓
Human Review
```

The 75% threshold is the specified human-in-the-loop threshold in the source proposal.

---

# 59. Human-in-the-Loop

Low-confidence cases should be routed for human review.

Human review may be performed by:

- Admin.
- Authorized officer.
- Designated reviewer.

The reviewer should be able to:

- Confirm category.
- Correct category.
- Confirm severity.
- Correct severity.
- Review duplicate suggestions.
- Override incorrect AI output.

AI decisions and overrides should be auditable.

---

# 60. Voice Processing

Pipeline:

```text
VOICE
  ↓
SPEECH-TO-TEXT
  ↓
LANGUAGE DETECTION
  ↓
NLP
  ↓
CATEGORY
  ↓
SEVERITY
  ↓
IMPACT
```

Voice should become equivalent to text internally after transcription.

The original voice file should remain available as evidence according to the privacy model.

---

# 61. Image Processing

Pipeline:

```text
IMAGE
  ↓
MEDIA PROCESSING
  ↓
AI ANALYSIS
  ↓
ISSUE CLASSIFICATION
  ↓
GRIEVANCE METADATA
```

Example:

```text
Photo
 ↓
Road Damage
 ↓
Pothole
 ↓
Road Department
```

A specific computer-vision model is not prescribed by the source PRD. The implementation model should therefore remain configurable.

---

# 62. Video Processing

Pipeline:

```text
VIDEO
  ↓
MEDIA PROCESSING
  ↓
AI ANALYSIS
  ↓
ISSUE CLASSIFICATION
  ↓
GRIEVANCE METADATA
```

Video support should be treated as configurable and may be implemented after the core MVP.

---

# 63. Semantic Duplicate Detection

Example:

```text
Citizen 1 → Pothole near NIT Gate
Citizen 2 → Huge pothole at NIT entrance
Citizen 3 → Road damaged near NIT main gate
Citizen 4 → Same pothole near college gate
```

AI should identify semantic similarity.

Conceptually:

```text
Report 1 ─┐
Report 2 ─┤
Report 3 ─┤
Report 4 ─┼──→ MASTER INCIDENT
Report 5 ─┤
   ...    │
Report 50 ┘
```

Individual citizen grievances must not be deleted when grouped.

---

# 64. Embeddings

The proposal describes semantic similarity using sentence embeddings.

Possible architecture:

```text
Grievance Text
      ↓
Embedding Model
      ↓
Vector
      ↓
Vector Search
      ↓
Similarity
      ↓
Duplicate Candidate
```

The exact model can remain configurable.

---

# 65. Master Incident Model

Suggested structure:

```text
incidentId
category
location
wardId
departmentId
linkedGrievances[]
reportCount
impactScore
engagementScore
status
officerId
slaDeadline
createdAt
```

The AI service can provide duplicate candidates; the backend remains responsible for persistence and final workflow handling.

---

# 66. AI Service Contract

The backend should send a normalized request to the AI service.

Conceptually:

```json
{
  "grievanceId": "GRV-10234",
  "text": "There is a large pothole near NIT gate.",
  "language": null,
  "media": [],
  "location": {
    "latitude": 21.25,
    "longitude": 81.63
  }
}
```

AI response should contain:

```json
{
  "grievanceId": "GRV-10234",
  "language": "English",
  "category": "Road",
  "subCategory": "Pothole",
  "severity": "High",
  "impactScore": 84,
  "confidence": {
    "category": 0.94,
    "severity": 0.89,
    "impact": 0.86
  },
  "duplicate": {
    "isDuplicate": false,
    "masterIncidentId": null,
    "similarity": 0
  }
}
```

The exact API contract should be finalized jointly by the AI and backend teams before integration.

---

# 67. AI MVP Scope

For the MVP:

- [ ] Text classification.
- [ ] Category detection.
- [ ] Subcategory detection where feasible.
- [ ] Severity detection.
- [ ] Impact score.
- [ ] Confidence.
- [ ] Human-review flag.
- [ ] Basic language detection.
- [ ] Backend AI API.
- [ ] AI response schema.
- [ ] Logging.
- [ ] Error handling.

Phase 2:

- [ ] Voice.
- [ ] Video.
- [ ] Multilingual NLP expansion.
- [ ] Semantic duplicate detection.
- [ ] Master incident clustering.
- [ ] Vector search.
- [ ] Advanced computer vision.

---

# 68. SHARED INTEGRATION CONTRACT

This section is mandatory for all three teams.

---

# 69. Frontend ↔ Backend

Frontend communicates only through documented backend APIs.

Example:

```text
Frontend
   ↓
HTTP Request
   ↓
Backend API
   ↓
Database / Services
   ↓
HTTP Response
   ↓
Frontend
```

Frontend should not directly access the database.

---

# 70. Backend ↔ AI

Backend owns the main grievance workflow.

```text
Citizen
  ↓
Frontend
  ↓
Backend
  ↓
AI Service
  ↓
AI Result
  ↓
Backend
  ↓
Database
  ↓
Officer
```

Backend responsibilities:

- Validate AI input.
- Send AI request.
- Handle AI timeout/failure.
- Validate AI response.
- Store AI output.
- Trigger routing.
- Trigger human review when required.

---

# 71. AI Failure Handling

If AI service fails:

```text
AI REQUEST
   ↓
FAILURE
   ↓
RETRY / QUEUE
   ↓
IF STILL FAILED
   ↓
HUMAN REVIEW / FALLBACK
```

A failed AI request must not silently delete or lose the citizen grievance.

---

# 72. Common Grievance Status Contract

All teams must use the same status values:

```text
SUBMITTED
AI_PROCESSED
ASSIGNED
ACKNOWLEDGED
IN_PROGRESS
RESOLUTION_SUBMITTED
VERIFICATION
RESOLVED
REOPENED
REJECTED
```

Frontend must not invent alternate status strings.

---

# 73. Common Categories

All teams must use the same initial category identifiers:

```text
road
water
sanitation
electrical
sewerage
traffic
public_safety
other
```

Display names may be different from internal identifiers.

---

# 74. API Error Contract

Backend should return predictable errors.

Conceptual structure:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_GRIEVANCE",
    "message": "Grievance data is invalid"
  }
}
```

Frontend should use the error code/message to display appropriate UI.

---

# 75. FINAL BACKEND INTEGRATION & MERGE

## 75.1 Integration Owner

The **backend team is the final integration owner**.

Frontend and AI teams can develop independently, but the backend team is responsible for bringing the modules together into one working product.

---

# 76. Integration Sequence

```text
FRONTEND DEVELOPMENT
        ↓
BACKEND API DEVELOPMENT
        ↓
AI SERVICE DEVELOPMENT
        ↓
DATABASE
        ↓
FRONTEND API INTEGRATION
        ↓
BACKEND ↔ AI INTEGRATION
        ↓
NOTIFICATION INTEGRATION
        ↓
AUTHENTICATION / AUTHORIZATION
        ↓
COMPLETE SYSTEM
        ↓
END-TO-END TESTING
        ↓
PRODUCTION BUILD
        ↓
DEPLOYMENT
```

---

# 77. Backend Final Integration Responsibilities

The backend team must:

### Frontend Integration

- Connect frontend to production APIs.
- Verify authentication.
- Verify API responses.
- Verify pagination.
- Verify uploads.
- Verify feed.
- Verify profile.
- Verify officer dashboard.

### AI Integration

- Connect AI service.
- Configure AI service URL.
- Send normalized grievance data.
- Receive AI results.
- Validate AI results.
- Store AI metadata.
- Trigger routing.
- Handle AI failures.
- Handle low-confidence results.

### Database Integration

- Verify all models.
- Verify indexes.
- Verify geospatial indexes.
- Verify relationships/references.
- Verify migrations/configuration where applicable.
- Verify production database connection.

### Notification Integration

- In-app notifications.
- SMS.
- WhatsApp where implemented.

### Security Integration

- Authentication.
- Authorization.
- Role checks.
- Rate limiting.
- Upload validation.
- Secure media storage.
- PII protection.

---

# 78. Git / Merge Strategy

Recommended branch structure:

```text
main
 │
 ├── backend
 ├── frontend
 └── ai
```

Suggested workflow:

```text
Developer
   ↓
Feature Branch
   ↓
Pull Request
   ↓
Review
   ↓
Team Branch
   ↓
Integration Testing
   ↓
Main
```

Before merging to `main`:

- API contract must be verified.
- Environment variables must be documented.
- Tests must pass.
- Build must succeed.
- No critical console/server errors.
- No unresolved integration conflicts.

---

# 79. Environment Configuration

The integration owner should maintain configuration for:

```text
DATABASE_URL
JWT_SECRET
OTP_PROVIDER
SMS_PROVIDER
AI_SERVICE_URL
MEDIA_STORAGE_URL
NOTIFICATION_PROVIDER
WHATSAPP_PROVIDER
FRONTEND_URL
BACKEND_URL
```

Secrets must not be committed to Git.

Use environment variables.

---

# 80. End-to-End Testing

The final integration team must test the complete flow:

```text
SIGN UP
 ↓
OTP
 ↓
LOGIN
 ↓
PROFILE
 ↓
CREATE GRIEVANCE
 ↓
UPLOAD PHOTO
 ↓
LOCATION
 ↓
AI PROCESSING
 ↓
CATEGORY
 ↓
SEVERITY
 ↓
IMPACT
 ↓
WARD
 ↓
DEPARTMENT
 ↓
OFFICER
 ↓
PUBLIC FEED
 ↓
UPVOTE
 ↓
COMMENT
 ↓
OFFICER ACKNOWLEDGE
 ↓
IN PROGRESS
 ↓
RESOLUTION
 ↓
EVIDENCE
 ↓
RESOLVED
 ↓
NOTIFICATION
 ↓
PROFILE UPDATED
```

---

# 81. Final Integration Test Cases

## Authentication

- [ ] Registration works.
- [ ] Duplicate username rejected.
- [ ] OTP expires.
- [ ] OTP attempts limited.
- [ ] Login works.
- [ ] Unauthorized requests rejected.

## Grievance

- [ ] Text grievance works.
- [ ] Photo upload works.
- [ ] Location works.
- [ ] Grievance appears in profile.
- [ ] Status is stored correctly.

## AI

- [ ] AI receives grievance.
- [ ] AI returns category.
- [ ] AI returns severity.
- [ ] AI returns impact.
- [ ] Confidence is stored.
- [ ] AI failure is handled.

## Routing

- [ ] Ward detected.
- [ ] Department selected.
- [ ] Officer assigned.

## Social

- [ ] Feed displays grievance.
- [ ] Nearby feed works.
- [ ] Upvote works.
- [ ] Downvote works.
- [ ] Comment works.

## Government

- [ ] Officer sees assigned grievance.
- [ ] Officer changes status.
- [ ] Resolution evidence uploads.
- [ ] Resolution is recorded.
- [ ] Citizen sees resolution.

## Notifications

- [ ] Acknowledgement notification.
- [ ] In-progress notification.
- [ ] Resolution notification.

## Security

- [ ] Role checks work.
- [ ] Unauthorized officer access rejected.
- [ ] File validation works.
- [ ] Rate limiting works.
- [ ] PII is protected.

---

# 82. Production Deployment

The backend integration owner is responsible for final deployment.

Deployment sequence:

```text
LOCAL DEVELOPMENT
       ↓
INTEGRATION ENVIRONMENT
       ↓
FULL SYSTEM TEST
       ↓
PRODUCTION BUILD
       ↓
DEPLOY BACKEND
       ↓
DEPLOY AI SERVICE
       ↓
DEPLOY FRONTEND
       ↓
CONNECT DATABASE
       ↓
CONFIGURE ENVIRONMENT VARIABLES
       ↓
VERIFY APIs
       ↓
VERIFY FRONTEND
       ↓
VERIFY AI
       ↓
PRODUCTION DEMO
```

---

# 83. Observability

Track:

- API latency.
- AI processing time.
- Failed notifications.
- Queue failures.
- Database errors.
- Authentication failures.
- AI failures.
- Upload failures.
- Integration errors.

---

# 84. MVP Scope — Genesis 2026

The MVP should implement the essential end-to-end loop.

## Citizen

- Sign up.
- SMS OTP.
- Login.
- Profile.
- My Grievances.
- Submit text.
- Upload photo.
- Location.

## AI

- Category detection.
- Severity.
- Impact score.

## Government

- Department routing.
- Officer dashboard.
- Status updates.

## Social Layer

- Public feed.
- Location-based feed.
- Upvote.
- Downvote.
- Comments.

## Resolution

- Resolution evidence.
- Resolved status.
- Citizen notification.

---

# 85. Phase 2

After MVP:

- Voice.
- Video.
- WhatsApp Bot.
- Multilingual NLP expansion.
- Duplicate detection.
- Master Incidents.
- Vector Search.
- GIS Heatmaps.
- SLA Analytics.
- Advanced Notifications.
- Advanced AI/CV.

---

# 86. WhatsApp Bot Architecture

WhatsApp should use the same backend grievance pipeline.

```text
WhatsApp
   ↓
Text / Voice / Photo
   ↓
Location
   ↓
Synapse API
   ↓
AI
   ↓
Department
   ↓
Officer
```

There should be one core grievance-processing system.

```text
Web ──────────┐
              │
WhatsApp ─────┼──→ Grievance API
              │
Mobile ───────┘
```

---

# 87. Content Moderation

Because the feed is public, implement:

- Report Post.
- Report Comment.
- Block User.
- Admin Moderation.

Possible report reasons:

- Spam.
- Abuse.
- False Information.
- Offensive Content.
- Personal Information.
- Irrelevant Content.

---

# 88. Performance Requirements

Feed API should support pagination/cursor pagination.

Example:

```http
GET /api/feed?limit=20&cursor=...
```

System should separate:

```text
Frontend
Backend API
AI Service
Database
Media Storage
Notification Service
```

Important operations should be idempotent where appropriate.

---

# 89. Complete API Reference

## Authentication

```http
POST /api/auth/register
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## Users

```http
GET /api/users?username=ritesh
GET /api/users?search=ritesh
GET /api/users/me
PATCH /api/users/me
```

## Grievances

```http
GET /api/grievances?mine=true
GET /api/grievances?mine=true&status=resolved
GET /api/grievances?status=pending
GET /api/grievances?department=road
GET /api/grievances?ward=12
GET /api/grievances?category=water
GET /api/grievances?search=pothole
GET /api/grievances?lat=21.25&lng=81.63&radius=5000
POST /api/grievances
PATCH /api/grievances/:id/status
POST /api/grievances/:id/resolution
```

## Feed

```http
GET /api/feed?type=nearby
GET /api/feed?type=trending
GET /api/feed?type=for_you
GET /api/feed?category=roads
GET /api/feed?status=resolved
```

## Posts

```http
GET /api/posts?search=pothole
GET /api/posts?category=roads&sort=engagement
```

## Votes

```http
GET /api/votes?postId=123
POST /api/votes
DELETE /api/votes?postId=123
```

## Comments

```http
GET /api/comments?postId=123
POST /api/comments
DELETE /api/comments?id=456
```

## Notifications

```http
GET /api/notifications?read=false
GET /api/notifications?type=grievance
GET /api/notifications?page=1&limit=20
```

## Officer

```http
GET /api/grievances?assignedTo=me
GET /api/grievances?department=road&status=pending
GET /api/grievances?department=road&sort=impact
PATCH /api/grievances/:id/status
POST /api/grievances/:id/resolution
```

## Map

```http
GET /api/map/incidents?ward=12
GET /api/map/incidents?category=water
GET /api/map/incidents?status=pending
```

---

# 90. API Design Rule

Use query parameters for READ operations:

```text
Filtering
Searching
Sorting
Pagination
Location
Status
Category
Department
Ward
Date
```

Example:

```http
GET /api/grievances?department=road&status=pending&sort=impact
```

Use request bodies for WRITE operations:

```text
Create
Update
Vote
Comment
Upload
Resolve
```

Example:

```http
POST /api/votes

{
  "postId": "123",
  "type": "upvote"
}
```

This keeps the API predictable.

---

# 91. Recommended Demo Flow

The best demonstration should follow one grievance completely.

## Scene 1 — Citizen

User creates account:

```text
Sign Up
   ↓
SMS OTP
   ↓
Profile
```

## Scene 2 — Report

User submits:

```text
"Large pothole near NIT Gate"
+
Photo
+
GPS
```

## Scene 3 — AI

AI returns:

```text
Category: Road
Severity: High
Impact: 84
```

## Scene 4 — Routing

```text
Ward 12
   ↓
Road Department
   ↓
Officer
```

## Scene 5 — Feed

The issue appears:

```text
🚨 Pothole near NIT Gate

👍 342
👎 12
💬 46
```

## Scene 6 — Community

People interact with the issue:

```text
342 → 1,200 → 2,341
```

## Scene 7 — Officer

Officer sees:

```text
Impact: 84
Reports: 86
Upvotes: 2,341
```

## Scene 8 — Resolution

Officer uploads:

```text
Before photo
After photo
```

## Scene 9 — Citizen

Profile changes:

```text
🟢 RESOLVED
```

That demonstrates the complete product loop.

---

# 92. Final System Architecture

```text
                         ┌─────────────────┐
                         │     CITIZEN     │
                         └────────┬────────┘
                                  │
                           SMS OTP AUTH
                                  │
                                  ▼
                         ┌─────────────────┐
                         │     PROFILE     │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
             MY GRIEVANCES                REPORT ISSUE
                                                │
                          ┌─────────────────────┼─────────────────────┐
                          │                     │                     │
                          ▼                     ▼                     ▼
                        TEXT                  VOICE              PHOTO/VIDEO
                          │                     │                     │
                          └─────────────────────┼─────────────────────┘
                                                ▼
                                            LOCATION
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │      AI      │
                                        └──────┬───────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                    ▼                    ▼
                       CATEGORY             SEVERITY             IMPACT
                          │                    │                    │
                          └────────────────────┼────────────────────┘
                                               ▼
                                      DUPLICATE CHECK
                                               │
                                               ▼
                                         WARD DETECTION
                                               │
                                               ▼
                                      DEPARTMENT ROUTING
                                               │
                                               ▼
                                      OFFICER DASHBOARD
                                               │
                                               ▼
                                          ACKNOWLEDGED
                                               │
                                               ▼
                                         PUBLIC FEED
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                      UPVOTE                DOWNVOTE              COMMENT
                         │                     │                     │
                         └─────────────────────┼─────────────────────┘
                                               ▼
                                     COMMUNITY ENGAGEMENT
                                               │
                                               ▼
                                        ACCOUNTABILITY
                                               │
                                               ▼
                                        OFFICER ACTION
                                               │
                                               ▼
                                          IN PROGRESS
                                               │
                                               ▼
                                    RESOLUTION + EVIDENCE
                                               │
                                               ▼
                                            RESOLVED
                                               │
                              ┌────────────────┴────────────────┐
                              ▼                                 ▼
                     USER NOTIFICATION                    PUBLIC UPDATE
                              │
                              ▼
                       MY GRIEVANCES
                              │
                              ▼
                           DONE
```

---

# 93. Final Team Workflow

The complete development workflow is:

```text
┌──────────────────────────────────────────────────────┐
│                 1. FRONTEND TEAM                     │
│                                                      │
│ Build UI, pages, components and API integration      │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                  2. BACKEND TEAM                     │
│                                                      │
│ Build APIs, database, auth and business logic        │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                    3. AI TEAM                        │
│                                                      │
│ Build classification, scoring and AI services        │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│              4. BACKEND INTEGRATION                  │
│                                                      │
│ Backend team merges Frontend + AI + Database         │
│                                                      │
│ • Connect APIs                                       │
│ • Connect AI                                         │
│ • Configure services                                  │
│ • Resolve integration conflicts                       │
│ • Validate data contracts                             │
│ • Test complete workflow                              │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                  5. E2E TESTING                      │
│                                                      │
│ Citizen → AI → Department → Officer → Resolution    │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│                    6. DEPLOYMENT                     │
│                                                      │
│ Frontend + Backend + AI + Database + Services        │
└─────────────────────────┬────────────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ SYNAPSE MVP   │
                  │    LIVE       │
                  └───────────────┘
```

---

# 94. Final Product Definition

Synapse is a civic social network where verified citizens report real-world problems through text, voice, photos, or videos; AI understands and routes those grievances to the responsible government department; citizens track every grievance from their profile; and a location-aware public feed lets communities collectively surface and engage with civic issues.

The system creates a transparent accountability loop:

```text
REPORT
  ↓
UNDERSTAND
  ↓
ROUTE
  ↓
PUBLISH
  ↓
ENGAGE
  ↓
ACT
  ↓
VERIFY
  ↓
RESOLVE
```

---

# 95. Definition of Done

The Synapse MVP is considered complete when:

- A citizen can register and verify their account.
- A citizen can log in.
- A citizen can create a grievance.
- A citizen can attach a photo.
- A citizen can provide location.
- The backend stores the grievance.
- The AI service processes the grievance.
- Category is generated.
- Severity is generated.
- Impact score is generated.
- Grievance is routed to a department.
- An officer can view the grievance.
- The grievance appears in the public feed.
- Citizens can upvote/downvote/comment.
- Officer can acknowledge the grievance.
- Officer can mark it in progress.
- Officer can submit resolution evidence.
- Grievance can become resolved.
- Citizen receives notification.
- Citizen's profile reflects the updated status.
- Frontend, backend, database, and AI work together.
- End-to-end testing passes.
- The integrated application can be deployed.

---

# 96. Final Responsibility

The **Backend Team owns the final integration stage**.

Frontend and AI teams are responsible for delivering their modules according to the shared contracts. The backend team then:

```text
RECEIVE FRONTEND
      +
RECEIVE AI SERVICE
      +
CONNECT DATABASE
      +
CONNECT NOTIFICATIONS
      +
CONNECT AUTH
      ↓
INTEGRATE EVERYTHING
      ↓
TEST EVERYTHING
      ↓
DEPLOY EVERYTHING
```

The final deliverable is **one complete Synapse application**, not three independent modules.

---

**END OF SYNAPSE TEAM-SPECIFIC PRD**
