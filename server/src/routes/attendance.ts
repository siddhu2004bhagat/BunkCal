import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'

const router = Router()

// GET /api/attendance
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject_id } = req.query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from('attendance_records')
      .select('*')
      .eq('user_id', req.userId)
      .order('date', { ascending: false })

    if (subject_id) query = query.eq('subject_id', subject_id)

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
})

// POST /api/attendance
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      subject_id: z.string().uuid(),
      date: z.string(),
      status: z.enum(['present', 'absent', 'proxy']),
      notes: z.string().nullable().optional(),
    }).parse(req.body)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('attendance_records')
      .insert({ ...body, user_id: req.userId })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors })
    else res.status(500).json({ error: 'Failed to record attendance' })
  }
})

// DELETE /api/attendance/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('attendance_records')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
    if (error) throw error
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Failed to delete record' })
  }
})

export default router
