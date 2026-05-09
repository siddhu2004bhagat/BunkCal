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

  /** Add a contact by their friend code — looks up their real profile */
  async addContactByFriendCode(
    userId: string,
    friendCode: string
  ): Promise<ProxyLedger> {
    // Look up the friend's profile
    const { data: friendProfile, error: lookupError } = await db
      .from('profiles')
      .select('user_id, full_name, email, friend_code')
      .eq('friend_code', friendCode.toUpperCase().trim())
      .single()

    if (lookupError || !friendProfile) {
      throw new Error(`No user found with friend code "${friendCode.toUpperCase()}"`)
    }

    if (friendProfile.user_id === userId) {
      throw new Error("You can't add yourself as a contact")
    }

    // Check if already added
    const { data: existing } = await db
      .from('proxy_ledger')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_user_id', friendProfile.user_id)
      .single()

    if (existing) {
      throw new Error('This friend is already in your ledger')
    }

    const { data, error } = await db
      .from('proxy_ledger')
      .insert({
        user_id: userId,
        contact_name: friendProfile.full_name || friendCode,
        contact_email: friendProfile.email || null,
        friend_user_id: friendProfile.user_id,
        friend_code: friendCode.toUpperCase(),
        balance: 0,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Legacy: add contact manually by name (no friend code) */
  async addContact(userId: string, contactName: string, contactEmail?: string): Promise<ProxyLedger> {
    const { data, error } = await db
      .from('proxy_ledger')
      .insert({
        user_id: userId,
        contact_name: contactName,
        contact_email: contactEmail || null,
        friend_user_id: null,
        friend_code: null,
        balance: 0,
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
    const { data: txn, error: txnError } = await db
      .from('proxy_transactions')
      .insert({
        user_id: userId,
        ledger_id: ledgerId,
        type,
        classes,
        subject: subject || null,
        notes: notes || null,
      })
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
