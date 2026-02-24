# Insight POC — CUBED-3 Assessment Platform

A proof-of-concept web application for administering, scoring, and reporting on CUBED-3 literacy assessments, built for the Multi-Tiered System of Support (MTSS) framework.

## Features

- **User Authentication** — Signup, login, JWT-based sessions with role-based access (admin/examiner)
- **Student Management** — CRUD operations, CSV bulk import, "My Students" list, groups
- **Assessment Administration** — Select student, subtest, and time-of-year; enter scores with automatic risk classification
- **Scoring Engine** — Benchmark cut points from CUBED-3 manual; classifies scores as benchmark/moderate/high risk
- **Intervention Recommendations** — Automatic recommendations based on risk level and target area
- **Reports Dashboard** — Risk distribution charts, student risk table, CSV export, grade/period filters
- **Student Detail** — Test history, progress-over-time charts, risk badges
- **Progress Monitoring** — Track scores over BOY/MOY/EOY across academic years

## Subtests Supported

- **NLM Listening** (PreK–3): Retell + Questions
- **NLM Reading** (1–8): Retell + Questions + Decoding Fluency
- **DDM Phonemic Awareness** (PreK–2): Segmentation, Blending, First Sounds, Continuous Blending
- **DDM Phoneme Manipulation** (1–2): Deletion, Addition, Substitution
- **DDM Orthographic Mapping** (PreK–2): Irregular Words, Letter Sounds, Letter Names
- **DDM Decoding Inventory** (K–4): Closed Syllables through Advanced Word Forms

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Auth**: JWT (python-jose), bcrypt

## Getting Started

### Backend

```bash
cd backend
pip install -r ../requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at http://localhost:5173 and proxies API calls to the backend at http://localhost:8000.

### Demo Account

After starting both servers, sign up at http://localhost:5173/signup to create an account, then add students and start assessing.

## Project Structure

```
Insight-poc/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLite/SQLAlchemy setup
│   ├── models.py            # ORM models (User, Student, TestSession, Score, etc.)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # JWT + bcrypt auth utilities
│   ├── routers/
│   │   ├── auth_router.py       # Login, signup, me
│   │   ├── students_router.py   # CRUD, bulk import, groups
│   │   ├── assessments_router.py # Start, score, complete, recommendations
│   │   └── reports_router.py    # Risk summary, student table, CSV export
│   ├── services/
│   │   └── scoring.py          # Benchmark classification + recommendations
│   └── data/
│       └── benchmarks.json     # CUBED-3 cut points by grade/period
├── frontend/
│   └── src/
│       ├── App.jsx             # Routing
│       ├── context/AuthContext  # Auth state management
│       ├── services/api.js     # API client
│       ├── components/Layout   # Sidebar navigation
│       └── pages/
│           ├── Login/Signup    # Authentication
│           ├── Dashboard       # Overview with risk pie chart
│           ├── Students        # Student list + add/import
│           ├── StudentDetail   # Individual progress + history
│           ├── Assess          # 3-step assessment workflow
│           └── Reports         # Risk charts + table + export
└── requirements.txt
```
