import { supabase } from '@/lib/supabase'
import type { ProxyLedger, ProxyTransaction } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const proxyService = {
  // ─── READ ────────────────────────────────────────────────────────────────

  async getLedger(userId: string): Promise<ProxyLedger[]> {
    const { data, error } = await db
      .from('proxy_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
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

  // ─── ADD CONTACT ─────────────────────────────────────────────────────────
  //
  // If counterpartUserId is provided (linked friend), we call the
  // `add_proxy_contact` RPC which is SECURITY DEFINER — it creates the
  // ledger entry for the current user AND the mirror entry on the
  // counterpart's side in one atomic transaction, bypassing RLS.
  //
  // For unlinked (manual) contacts we insert directly — no cross-user write needed.

  async addContact(
    userId: string,
    contactName: string,
    contactEmail?: string,
    counterpartUserId?: string
  ): Promise<ProxyLedger> {
    if (counterpartUserId) {
      // Use SECURITY DEFINER RPC for 2-way linked contacts
      const { data, error } = await db.rpc('add_proxy_contact', {
        p_user_id: userId,
        p_contact_name: contactName,
        p_contact_email: contactEmail || null,
        p_counterpart_user_id: counterpartUserId,
      })
      if (error) throw error
      // RPC returns the new ledger row id; fetch the full row
      const { data: row, error: fetchErr } = await db
        .from('proxy_ledger')
        .select('*')
        .eq('id', data)
        .single()
      if (fetchErr) throw fetchErr
      return row
    }

    // Unlinked manual contact — direct insert is fine (own row only)
    const { data, error } = await db
      .from('proxy_ledger')
      .insert({
        user_id: userId,
        contact_name: contactName,
        contact_email: contactEmail || null,
        balance: 0,
        counterpart_user_id: null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // ─── RECORD TRANSACTION ──────────────────────────────────────────────────
  //
  // Always goes through the `record_proxy_transaction` RPC.
  // The RPC is SECURITY DEFINER so it can:
  //   1. Insert the transaction for the current user
  //   2. Update the current user's ledger balance
  //   3. If counterpart_user_id is set on the ledger entry:
  //      a. Find or create the mirror ledger entry on the counterpart's side
  //      b. Insert the mirror transaction (flipped type)
  //      c. Update the mirror ledger balance
  //      d. Insert a notification for the counterpart
  // All in one atomic DB call — no RLS issues.

  async addTransaction(
    userId: string,
    ledgerId: string,
    type: 'gave' | 'received',
    classes: number,
    subject?: string,
    notes?: string
  ): Promise<ProxyTransaction> {
    const { data, error } = await db.rpc('record_proxy_transaction', {
      p_user_id: userId,
      p_ledger_id: ledgerId,
      p_type: type,
      p_classes: classes,
      p_subject: subject || null,
      p_notes: notes || null,
    })
    if (error) throw error

    // RPC returns the new transaction row id; fetch the full row
    const { data: txn, error: fetchErr } = await db
      .from('proxy_transactions')
      .select('*')
      .eq('id', data)
      .single()
    if (fetchErr) throw fetchErr
    return txn
  },

  // ─── LINK existing unlinked contact to a real user ───────────────────────
  // Used when a manual contact is later matched to a Bunkwise user.

  async linkContactToUser(ledgerId: string, counterpartUserId: string): Promise<void> {
    const { error } = await db
      .from('proxy_ledger')
      .update({ counterpart_user_id: counterpartUserId })
      .eq('id', ledgerId)
    if (error) throw error
  },

  // ─── DELETE ──────────────────────────────────────────────────────────────

  async deleteContact(id: string): Promise<void> {
    const { error } = await db.from('proxy_ledger').delete().eq('id', id)
    if (error) throw error
  },
}
