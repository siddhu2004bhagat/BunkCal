import { supabase } from '@/lib/supabase'
import type { FriendRequest, FriendWithProfile } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface FriendSearchResult {
  user_id: string
  full_name: string | null
  bunkwise_id: string
  college: string | null
  branch: string | null
}

export const friendsService = {
  async searchByBunkwiseId(bunkwiseId: string): Promise<FriendSearchResult | null> {
    const normalized = bunkwiseId.trim().toUpperCase()
    const { data, error } = await db
      .from('profiles')
      .select('user_id, full_name, bunkwise_id, college, branch')
      .eq('bunkwise_id', normalized)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  },

  async getFriends(userId: string): Promise<FriendWithProfile[]> {
    const { data, error } = await db
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId)
    if (error) {
      // Table may not exist yet
      if (error.code === '42P01') return []
      throw error
    }
    if (!data?.length) return []

    const friendIds = data.map((f: { friend_id: string }) => f.friend_id)
    const { data: profiles, error: profileError } = await db
      .from('profiles')
      .select('user_id, full_name, bunkwise_id, college, branch, avatar_url')
      .in('user_id', friendIds)
    if (profileError) throw profileError

    return (profiles || []).map((p: {
      user_id: string; full_name: string | null; bunkwise_id: string | null
      college: string | null; branch: string | null; avatar_url: string | null
    }) => ({
      friend_id: p.user_id,
      full_name: p.full_name,
      bunkwise_id: p.bunkwise_id,
      college: p.college,
      branch: p.branch,
      avatar_url: p.avatar_url,
    }))
  },

  async sendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    // Insert the friend request
    const { data, error } = await db
      .from('friend_requests')
      .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
      .select()
      .single()
    if (error) throw error

    // Create a notification for the receiver
    try {
      // Get sender's name
      const { data: senderProfile } = await db
        .from('profiles')
        .select('full_name, bunkwise_id')
        .eq('user_id', senderId)
        .maybeSingle()

      const senderName = senderProfile?.full_name || senderProfile?.bunkwise_id || 'Someone'

      await db.from('notifications').insert({
        user_id: receiverId,
        title: 'New Friend Request',
        message: `${senderName} sent you a friend request. Check your Friends page to accept.`,
        type: 'info',
        read: false,
      })
    } catch (notifErr) {
      // Non-fatal — request was still sent
      console.warn('Could not create notification:', notifErr)
    }

    return data
  },

  async getPendingRequests(userId: string): Promise<(FriendRequest & { sender_profile: FriendSearchResult | null })[]> {
    const { data, error } = await db
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    if (!data?.length) return []

    const senderIds = data.map((r: FriendRequest) => r.sender_id)
    const { data: profiles } = await db
      .from('profiles')
      .select('user_id, full_name, bunkwise_id, college, branch')
      .in('user_id', senderIds)

    return data.map((req: FriendRequest) => ({
      ...req,
      sender_profile: profiles?.find((p: { user_id: string }) => p.user_id === req.sender_id) ?? null,
    }))
  },

  async getSentRequests(userId: string): Promise<FriendRequest[]> {
    const { data, error } = await db
      .from('friend_requests')
      .select('*')
      .eq('sender_id', userId)
      .eq('status', 'pending')
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return data || []
  },

  async acceptRequest(requestId: string): Promise<void> {
    // Try the RPC function first
    const { error: rpcError } = await db.rpc('accept_friend_request', { request_id: requestId })
    if (!rpcError) return

    // Fallback: manual accept if RPC doesn't exist
    const { data: req, error: fetchError } = await db
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single()
    if (fetchError) throw fetchError

    await db.from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    // Create friendship both ways
    await db.from('friends').upsert({ user_id: req.receiver_id, friend_id: req.sender_id })
    await db.from('friends').upsert({ user_id: req.sender_id, friend_id: req.receiver_id })

    // Notify the sender
    try {
      const { data: receiverProfile } = await db
        .from('profiles')
        .select('full_name')
        .eq('user_id', req.receiver_id)
        .maybeSingle()
      const name = receiverProfile?.full_name || 'Someone'
      await db.from('notifications').insert({
        user_id: req.sender_id,
        title: 'Friend Request Accepted',
        message: `${name} accepted your friend request! You are now friends.`,
        type: 'success',
        read: false,
      })
    } catch { /* non-fatal */ }
  },

  async rejectRequest(requestId: string): Promise<void> {
    const { error } = await db
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
    if (error) throw error
  },

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await db.from('friends').delete().eq('user_id', userId).eq('friend_id', friendId)
    await db.from('friends').delete().eq('user_id', friendId).eq('friend_id', userId)
  },

  async getRelationship(userId: string, targetId: string): Promise<'none' | 'friends' | 'pending_sent' | 'pending_received'> {
    const { data: friendship } = await db
      .from('friends').select('id').eq('user_id', userId).eq('friend_id', targetId).maybeSingle()
    if (friendship) return 'friends'

    const { data: sentReq } = await db
      .from('friend_requests').select('id').eq('sender_id', userId).eq('receiver_id', targetId).eq('status', 'pending').maybeSingle()
    if (sentReq) return 'pending_sent'

    const { data: receivedReq } = await db
      .from('friend_requests').select('id').eq('sender_id', targetId).eq('receiver_id', userId).eq('status', 'pending').maybeSingle()
    if (receivedReq) return 'pending_received'

    return 'none'
  },
}
