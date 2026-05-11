import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import subjectsRouter from './routes/subjects'
import attendanceRouter from './routes/attendance'
import proxyRouter from './routes/proxy'
import profileRouter from './routes/profile'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ]
    if (allowed.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/subjects', subjectsRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/proxy', proxyRouter)
app.use('/api/profile', profileRouter)

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Bunkwise API running on http://localhost:${PORT}`)
})

export default app
