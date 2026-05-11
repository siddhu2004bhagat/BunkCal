import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { useAuthInit } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { useSmartNotifications } from '@/hooks/useSmartNotifications'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicRoute } from '@/components/auth/PublicRoute'

// ─── Code-split every page (lazy load) ───────────────────────────────────────
// Each page is its own chunk — initial bundle drops from 1.1MB to ~200KB
const Login             = lazy(() => import('@/pages/Login'))
const Signup            = lazy(() => import('@/pages/Signup'))
const Dashboard         = lazy(() => import('@/pages/Dashboard'))
const Subjects          = lazy(() => import('@/pages/Subjects'))
const AddSubject        = lazy(() => import('@/pages/AddSubject'))
const SubjectDetail     = lazy(() => import('@/pages/SubjectDetail'))
const Attendance        = lazy(() => import('@/pages/Attendance'))
const OfferingCalculator = lazy(() => import('@/pages/OfferingCalculator'))
const ProxyLedger       = lazy(() => import('@/pages/ProxyLedger'))
const Schedule          = lazy(() => import('@/pages/Schedule'))
const History           = lazy(() => import('@/pages/History'))
const Notifications     = lazy(() => import('@/pages/Notifications'))
const Profile           = lazy(() => import('@/pages/Profile'))
const AIPrediction       = lazy(() => import('@/pages/AIPrediction'))
const ImportTimetable   = lazy(() => import('@/pages/ImportTimetable'))
const Friends           = lazy(() => import('@/pages/Friends'))
const Settings          = lazy(() => import('@/pages/Settings'))

// ─── Page loading fallback ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f7f9fb]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-[#091426] rounded-xl animate-pulse" />
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-[#091426] rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-[#091426] rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-[#091426] rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

// ─── React Query client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30s — show cached data instantly, Realtime handles live updates
      gcTime: 1000 * 60 * 10,      // keep in cache 10 min
      retry: 1,
      refetchOnWindowFocus: false, // Realtime handles this — no need to refetch on focus
      refetchOnReconnect: true,    // refetch when network comes back
      refetchOnMount: false,       // use cache first — Realtime pushes changes
    },
    mutations: {
      retry: 0,
    },
  },
})

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  useAuthInit()
  useRealtime()
  useSmartNotifications() // 🔔 Background AI-style smart notifications

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public — redirect to dashboard if already logged in */}
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Protected */}
          <Route path="/dashboard"           element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/subjects"            element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
          <Route path="/add-subject"         element={<ProtectedRoute><AddSubject /></ProtectedRoute>} />
          <Route path="/subject/:id"         element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>} />
          <Route path="/attendance"          element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/offering-calculator" element={<ProtectedRoute><OfferingCalculator /></ProtectedRoute>} />
          <Route path="/proxy-ledger"        element={<ProtectedRoute><ProxyLedger /></ProtectedRoute>} />
          <Route path="/schedule"            element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
          <Route path="/history"             element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/ai-prediction"          element={<ProtectedRoute><AIPrediction /></ProtectedRoute>} />
          <Route path="/import-timetable"     element={<ProtectedRoute><ImportTimetable /></ProtectedRoute>} />
          <Route path="/friends"             element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/notifications"       element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile"             element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings"            element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
