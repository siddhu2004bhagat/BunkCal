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
    if (err instanceof z.ZodError) res.status(400).json({ error: err.issues })
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

    // 1. Fetch ledger entry (includes counterpart_user_id for mirroring)
    const { data: ledgerEntry, error: ledgerError } = await db
      .from('proxy_ledger')
      .select('balance, counterpart_user_id, contact_name')
      .eq('id', body.ledger_id)
      .single()
    if (ledgerError) throw ledgerError

    // 2. Insert the transaction for the current user
    const { data: txn, error: txnError } = await db
      .from('proxy_transactions')
      .insert({
        user_id: req.userId,
        ledger_id: body.ledger_id,
        type: body.type,
        classes: body.classes,
        subject: body.subject || null,
        notes: body.notes || null,
      })
      .select()
      .single()
    if (txnError) throw txnError

    // 3. Update current user's ledger balance
    const delta = body.type === 'gave' ? body.classes : -body.classes
    await db
      .from('proxy_ledger')
      .update({ balance: (ledgerEntry.balance ?? 0) + delta, updated_at: new Date().toISOString() })
      .eq('id', body.ledger_id)

    // 4. Mirror to counterpart if linked (service role bypasses RLS)
    const counterpartUserId: string | null = ledgerEntry?.counterpart_user_id || null
    if (counterpartUserId) {
      try {
        const mirrorType: 'gave' | 'received' = body.type === 'gave' ? 'received' : 'gave'

        // Get sender's display name
        const { data: senderProfile } = await db
          .from('profiles')
          .select('full_name, bunkwise_id')
          .eq('user_id', req.userId)
          .maybeSingle()
        const displayName = senderProfile?.full_name || senderProfile?.bunkwise_id || ledgerEntry.contact_name

        // Find or create mirror ledger entry on receiver's side
        let { data: mirrorLedger } = await db
          .from('proxy_ledger')
          .select('id, balance')
          .eq('user_id', counterpartUserId)
          .eq('counterpart_user_id', req.userId)
          .maybeSingle()

        if (!mirrorLedger) {
          const { data: newLedger, error: createErr } = await db
            .from('proxy_ledger')
            .insert({
              user_id: counterpartUserId,
              contact_name: displayName,
              balance: 0,
              counterpart_user_id: req.userId,
            })
            .select()
            .single()
          if (createErr) throw createErr
          mirrorLedger = newLedger
        }

        // Insert mirror transaction
        await db.from('proxy_transactions').insert({
          user_id: counterpartUserId,
          ledger_id: mirrorLedger.id,
          type: mirrorType,
          classes: body.classes,
          subject: body.subject || null,
          notes: body.notes || null,
        })

        // Update mirror ledger balance
        const mirrorDelta = mirrorType === 'gave' ? body.classes : -body.classes
        await db
          .from('proxy_ledger')
          .update({
            balance: (mirrorLedger.balance ?? 0) + mirrorDelta,
            updated_at: new Date().toISOString(),
          })
          .eq('id', mirrorLedger.id)
      } catch (mirrorErr) {
        // Non-fatal — original transaction was recorded successfully
        console.warn('[Proxy Mirror] Failed to mirror (non-fatal):', mirrorErr)
      }
    }

    res.status(201).json(txn)
  } catch (err) {
    if (err instanceof z.ZodError) res.status(400).json({ error: err.issues })
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
