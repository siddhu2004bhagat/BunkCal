import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'

const router = Router()

const subjectSchema = z.object({
  name: z.string().min(1),
  credits: z.number().min(1).max(10).default(4),
  attendance_goal: z.number().min(50).max(100).default(75),
  attended_classes: z.number().min(0).default(0),
  total_classes: z.number().min(0).default(0),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// GET /api/subjects
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('subjects')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects' })
  }
})

// POST /api/subjects
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = subjectSchema.parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('subjects')
      .insert({ ...body, user_id: req.userId })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues })
    } else {
      res.status(500).json({ error: 'Failed to create subject' })
    }
  }
})

// PATCH /api/subjects/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = subjectSchema.partial().parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('subjects')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subject' })
  }
})

// DELETE /api/subjects/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('subjects')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId)

    if (error) throw error
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject' })
  }
})

export default router
