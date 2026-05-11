import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'

const router = Router()

// GET /api/profile
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('profiles')
      .select('*')
      .eq('user_id', req.userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    res.json(data || null)
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// PUT /api/profile
router.put('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      full_name: z.string().min(1).optional(),
      semester: z.string().optional(),
      branch: z.string().optional(),
      college: z.string().optional(),
      attendance_goal: z.number().min(50).max(100).optional(),
    }).parse(req.body)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('profiles')
      .upsert({ user_id: req.userId, ...body, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.issues })
    else res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
