# ⚡ QuizCraft — MCQ Assessment & Candidate Evaluation Platform

A full-stack, responsive Multiple Choice Questions (MCQ) assessment platform designed for student testing, quota management, and performance analytics. Built with **React + Vite** frontend and **Node.js (Express) + MongoDB Atlas + JWT** backend.

---

## 🌟 Key Features

### 🎓 Candidate / Student Portal
- **Role-Based Authentication**: Secure registration with admin approval workflow.
- **Three Assessment Modes**:
  1. **Chapter Wise**: Practice questions chapter-by-chapter (Self-paced, elapsed stopwatch).
  2. **Question Volume**: Choose question sets (Full 100%, 50%, or Quick 10 Qs).
  3. **Time & Exam Duration**: Strictly timed exams with countdown timer (up to 120 mins max).
- **Test Attempt Allocation & Decrement on Start**:
  - Assigned attempts decrease immediately upon starting a test.
  - Test session automatically persists in `localStorage`; page reloads restore the active test without deducting duplicate attempts.
- **Candidate Profile**:
  - Live **Balance Test Attempts** gauge with progress bar.
  - **Performance Analytics** (Tests completed, Average accuracy %, Best score %, Total time spent).
  - **Candidate Leaderboard** with medal rankings (`🥇`, `🥈`, `🥉`) and user highlighting.
  - **Previous Test History** log with date, chapter, score, accuracy, and duration.
- **Interactive Quiz Arena**:
  - Clear option selection, question flagging for review, and instant answer clearance.
  - Responsive question palette with status indicators (answered, unanswered, flagged).
  - Detailed scorecard and question-by-question solution review with explanations.

### 🛡️ Admin Control Center
- **Pending Registrations**: Review candidate signups, allocate custom test attempt allowances, and approve/reject candidates.
- **Approved Active Users**: Manage active candidates, top-up test attempts dynamically, and live search by candidate name or email.
- **Question Bank Management**: Organize questions chapter-by-chapter with prompt, code snippet, four options, correct answer key, and detailed explanation.

### 📱 Responsive Design
- Designed mobile-first for small phones (360px+), tablets, and desktop displays.
- Un-congested layouts, comfortable touch targets, and side-by-side adaptive navigation.

---

## 🏗️ Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS Design System, Lucide-style visual indicators
- **Backend**: Node.js, Express, MongoDB Atlas, Mongoose, JSON Web Tokens (JWT), bcryptjs
- **Database**: MongoDB Atlas Cluster

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or local MongoDB)

### 2. Environment Setup

Create `server/.env` with your database and JWT secret:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/quizcraft?retryWrites=true&w=majority
JWT_SECRET=your-secret-jwt-key
```

### 3. Install Dependencies

In the root directory (Frontend):
```bash
npm install
```

In the `server` directory (Backend):
```bash
cd server
npm install
cd ..
```

### 4. Running Locally

**Terminal 1 — Backend API:**
```bash
node server/server.js
```
Runs on `http://localhost:5000`.

**Terminal 2 — Frontend App:**
```bash
npm run dev -- --port 5173
```
Runs on `http://localhost:5173`.

---

## 👥 Default Administrator Account

- **Admin Account**:
  - Email: `anjusia@gmail.com`
  - Password: `anjusia1999@@`
- **Student Account**:
  - Email: `sophia@test.edu`
  - Password: `studentpassword123`


