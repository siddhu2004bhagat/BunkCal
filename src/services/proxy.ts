import { supabase } from '@/lib/supabase'
import type { ProxyLedger, ProxyTransaction } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const proxyService = {
  async getLedger(userId: string): Promise<ProxyLedger[]> {
    const { data, error } = await db
      .from('proxy_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async addContact(
    userId: string,
    contactName: string,
    contactEmail?: string,
    counterpartUserId?: string
  ): Promise<ProxyLedger> {
    const { data, error } = await db
      .from('proxy_ledger')
      .insert({
        user_id: userId,
        contact_name: contactName,
        contact_email: contactEmail || null,
        balance: 0,
        counterpart_user_id: counterpartUserId || null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getTransactions(userId: string, ledgerId?: string): Promise<ProxyTransaction[]> {
    let query = db
      .from('proxy_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (ledgerId) query = query.eq('ledger_id', ledgerId)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async addTransaction(
    userId: string,
    ledgerId: string,
    type: 'gave' | 'received',
    classes: number,
    subject?: string,
    notes?: string
  ): Promise<ProxyTransaction> {
    // 1. Get the ledger entry (includes counterpart_user_id if linked)
    const { data: ledgerEntry, error: ledgerErr } = await db
      .from('proxy_ledger')
      .select('balance, counterpart_user_id, contact_name')
      .eq('id', ledgerId)
      .single()
    if (ledgerErr) throw ledgerErr

    const counterpartUserId: string | null = ledgerEntry?.counterpart_user_id || null

    // 2. Insert the transaction for the current user
    const { data: txn, error: txnError } = await db
      .from('proxy_transactions')
      .insert({
        user_id: userId,
        ledger_id: ledgerId,
        type,
        classes,
        subject: subject || null,
        notes: notes || null,
        counterpart_user_id: counterpartUserId,
      })
      .select()
      .single()
    if (txnError) throw txnError

    // 3. Update current user's ledger balance
    const delta = type === 'gave' ? classes : -classes
    await db
      .from('proxy_ledger')
      .update({ balance: (ledgerEntry?.balance ?? 0) + delta, updated_at: new Date().toISOString() })
      .eq('id', ledgerId)

    // 4. ── MIRROR to counterpart ──────────────────────────────────────────────
    if (counterpartUserId) {
      await proxyService._mirrorTransaction(
        userId,
        counterpartUserId,
        ledgerEntry?.contact_name || 'Unknown',
        type,
        classes,
        subject,
        notes
      )
    }

    return txn
  },

  // Mirror a transaction to the other user's ledger
  async _mirrorTransaction(
    senderUserId: string,
    receiverUserId: string,
    senderName: string,
    originalType: 'gave' | 'received',
    classes: number,
    subject?: string,
    notes?: string
  ): Promise<void> {
    try {
      // Mirror type is opposite: if sender "gave", receiver "received" (and vice versa)
      const mirrorType: 'gave' | 'received' = originalType === 'gave' ? 'received' : 'gave'

      // Get sender's name from profiles
      const { data: senderProfile } = await db
        .from('profiles')
        .select('full_name, bunkwise_id')
        .eq('user_id', senderUserId)
        .maybeSingle()
      const displayName = senderProfile?.full_name || senderProfile?.bunkwise_id || senderName

      // Find or create the mirror ledger entry on receiver's side
      let { data: mirrorLedger } = await db
        .from('proxy_ledger')
        .select('id, balance')
        .eq('user_id', receiverUserId)
        .eq('counterpart_user_id', senderUserId)
        .maybeSingle()

      if (!mirrorLedger) {
        // Create mirror ledger entry
        const { data: newLedger, error: createErr } = await db
          .from('proxy_ledger')
          .insert({
            user_id: receiverUserId,
            contact_name: displayName,
            balance: 0,
            counterpart_user_id: senderUserId,
          })
          .select()
          .single()
        if (createErr) {
          console.warn('[Proxy Mirror] Could not create mirror ledger:', createErr)
          return
        }
        mirrorLedger = newLedger
      }

      // Insert mirror transaction
      await db.from('proxy_transactions').insert({
        user_id: receiverUserId,
        ledger_id: mirrorLedger.id,
        type: mirrorType,
        classes,
        subject: subject || null,
        notes: notes || null,
        counterpart_user_id: senderUserId,
      })

      // Update mirror ledger balance
      const mirrorDelta = mirrorType === 'gave' ? classes : -classes
      await db
        .from('proxy_ledger')
        .update({
          balance: (mirrorLedger.balance ?? 0) + mirrorDelta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mirrorLedger.id)

      console.info('[Proxy Mirror] ✓ Mirrored to', receiverUserId)
    } catch (err) {
      // Non-fatal — the original transaction was recorded
      console.warn('[Proxy Mirror] Failed to mirror (non-fatal):', err)
    }
  },

  async deleteContact(id: string): Promise<void> {
    const { error } = await db.from('proxy_ledger').delete().eq('id', id)
    if (error) throw error
  },

  async linkContactToUser(ledgerId: string, counterpartUserId: string): Promise<void> {
    const { error } = await db
      .from('proxy_ledger')
      .update({ counterpart_user_id: counterpartUserId })
      .eq('id', ledgerId)
    if (error) throw error
  },
}
