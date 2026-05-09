import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'

const router = Router()

// GET /api/proxy/ledger
router.get('/ledger', requireAuth, async (req: AuthRequest, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('proxy_ledger')
      .select('*')
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch ledger' })
  }
})

// POST /api/proxy/ledger
router.post('/ledger', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { contact_name, contact_email } = z.object({
      contact_name: z.string().min(1),
      contact_email: z.string().email().optional(),
    }).parse(req.body)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('proxy_ledger')
      .insert({ user_id: req.userId, contact_name, contact_email: contact_email || null, balance: 0 })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors })
    else res.status(500).json({ error: 'Failed to add contact' })
  }
})

// POST /api/proxy/transaction
router.post('/transaction', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      ledger_id: z.string().uuid(),
      type: z.enum(['gave', 'received']),
      classes: z.number().min(1),
      subject: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any

    const { data: txn, error: txnError } = await db
      .from('proxy_transactions')
      .insert({ user_id: req.userId, ...body, subject: body.subject || null, notes: body.notes || null })
      .select()
      .single()
    if (txnError) throw txnError

    const delta = body.type === 'gave' ? body.classes : -body.classes
    const { data: ledger, error: ledgerError } = await db
      .from('proxy_ledger')
      .select('balance')
      .eq('id', body.ledger_id)
      .single()
    if (ledgerError) throw ledgerError

    await db
      .from('proxy_ledger')
      .update({ balance: ledger.balance + delta, updated_at: new Date().toISOString() })
      .eq('id', body.ledger_id)

    res.status(201).json(txn)
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.errors })
    else res.status(500).json({ error: 'Failed to record transaction' })
  }
})

// GET /api/proxy/transactions
router.get('/transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('proxy_transactions')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

export default router
