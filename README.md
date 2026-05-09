# Bunkwise

A full-stack student attendance management app built with React + Node.js + Supabase.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Node.js + Express
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **State/Data**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animation**: Framer Motion

## Getting Started

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 2. Configure Environment

```bash
# Frontend (.env)
cp .env.example .env
# Fill in your Supabase URL and anon key

# Backend (server/.env)
# Fill in your Supabase URL and service role key
```

### 3. Run the Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Run the Backend (optional)

The frontend talks directly to Supabase via the anon key with RLS policies.
The Express backend is available for server-side operations:

```bash
cd server
npm install
npm run dev
```

API runs on [http://localhost:3001](http://localhost:3001)

## Features

- 🔐 **Auth** — Sign up, sign in, sign out with Supabase Auth
- 📊 **Dashboard** — Overall attendance stats, weekly trend chart, subject breakdown
- 📚 **Subjects** — Add, edit, delete subjects with attendance tracking
- ✅ **Attendance** — Mark daily attendance per subject
- 🧮 **Bunk Calculator** — Calculate how many classes you can safely miss
- 👥 **Proxy Ledger** — Track proxy balances with friends
- 📅 **Schedule** — Weekly timetable view
- 📜 **History** — Attendance, calculator, and proxy history
- 🔔 **Notifications** — Attendance warnings and updates
- 👤 **Profile** — Edit name, branch, semester, college
- ⚙️ **Settings** — Theme, notifications, account management

## Project Structure

```
bunkwise/
├── src/
│   ├── components/
│   │   ├── auth/          # ProtectedRoute
│   │   ├── layout/        # AppShell, Header, BottomNav, Sidebar
│   │   ├── motion/        # PageTransition, FadeIn, AnimatedCounter
│   │   └── ui/            # Button, Card, Input, Modal, Toast, etc.
│   ├── hooks/             # useAuth
│   ├── lib/               # Supabase client
│   ├── pages/             # All route pages
│   ├── services/          # API service functions
│   ├── store/             # Zustand stores
│   ├── types/             # TypeScript types
│   └── utils/             # Attendance helpers
├── server/
│   └── src/
│       ├── middleware/    # Auth middleware
│       ├── routes/        # Express route handlers
│       └── index.ts       # Server entry point
└── supabase/
    └── schema.sql         # Full database schema + RLS policies
```

## Database Schema

Tables: `profiles`, `subjects`, `attendance_records`, `proxy_ledger`, `proxy_transactions`, `timetable_entries`, `notifications`, `settings`, `calculator_history`

All tables have Row Level Security enabled — users can only access their own data.
