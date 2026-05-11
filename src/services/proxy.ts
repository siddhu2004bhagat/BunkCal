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

  async addContact(userId: string, contactName: string, contactEmail?: string, counterpartUserId?: string): Promise<ProxyLedger> {
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
    // Get the ledger entry to find counterpart_user_id
    const { data: ledgerEntry } = await db
      .from('proxy_ledger')
      .select('balance, counterpart_user_id')
      .eq('id', ledgerId)
      .single()

    const counterpartUserId = ledgerEntry?.counterpart_user_id || null

    // Insert transaction — trigger will auto-mirror if counterpart_user_id is set
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

    // Update local ledger balance
    const delta = type === 'gave' ? classes : -classes
    const currentBalance = ledgerEntry?.balance ?? 0
    const { error: updateError } = await db
      .from('proxy_ledger')
      .update({ balance: currentBalance + delta, updated_at: new Date().toISOString() })
      .eq('id', ledgerId)
    if (updateError) throw updateError

    return txn
  },

  async deleteContact(id: string): Promise<void> {
    const { error } = await db.from('proxy_ledger').delete().eq('id', id)
    if (error) throw error
  },

  // Link a ledger contact to a real user account (enables mirroring)
  async linkContactToUser(ledgerId: string, counterpartUserId: string): Promise<void> {
    const { error } = await db
      .from('proxy_ledger')
      .update({ counterpart_user_id: counterpartUserId })
      .eq('id', ledgerId)
    if (error) throw error
  },
}
