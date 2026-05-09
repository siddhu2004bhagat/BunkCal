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

  async addContact(userId: string, contactName: string, contactEmail?: string): Promise<ProxyLedger> {
    const { data, error } = await db
      .from('proxy_ledger')
      .insert({ user_id: userId, contact_name: contactName, contact_email: contactEmail || null, balance: 0 })
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
    const { data: txn, error: txnError } = await db
      .from('proxy_transactions')
      .insert({ user_id: userId, ledger_id: ledgerId, type, classes, subject: subject || null, notes: notes || null })
      .select()
      .single()
    if (txnError) throw txnError

    const delta = type === 'gave' ? classes : -classes
    const { data: ledger, error: ledgerFetchError } = await db
      .from('proxy_ledger')
      .select('balance')
      .eq('id', ledgerId)
      .single()
    if (ledgerFetchError) throw ledgerFetchError

    const { error: updateError } = await db
      .from('proxy_ledger')
      .update({ balance: ledger.balance + delta, updated_at: new Date().toISOString() })
      .eq('id', ledgerId)
    if (updateError) throw updateError

    return txn
  },

  async deleteContact(id: string): Promise<void> {
    const { error } = await db.from('proxy_ledger').delete().eq('id', id)
    if (error) throw error
  },
}
