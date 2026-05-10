import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, UserCheck, UserX, Users, Check, X, Copy } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { friendsService, type FriendSearchResult } from '@/services/friends'

export default function Friends() {
  const { user, profile } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<FriendSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [copiedId, setCopiedId] = useState(false)

  // Queries
  const { data: friends = [] } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => friendsService.getFriends(user!.id),
    enabled: !!user?.id,
  })

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: () => friendsService.getPendingRequests(user!.id),
    enabled: !!user?.id,
    refetchInterval: 15000, // poll every 15s as fallback
  })

  const { data: sentRequests = [] } = useQuery({
    queryKey: ['sent-requests', user?.id],
    queryFn: () => friendsService.getSentRequests(user!.id),
    enabled: !!user?.id,
  })

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (receiverId: string) => friendsService.sendRequest(user!.id, receiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] })
      addToast({ type: 'success', message: 'Friend request sent!' })
      setSearchResult(null)
      setSearchId('')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to send request'
      if (msg.includes('duplicate') || msg.includes('unique')) {
        addToast({ type: 'warning', message: 'Request already sent' })
      } else {
        addToast({ type: 'error', message: msg })
      }
    },
  })

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => friendsService.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      addToast({ type: 'success', message: 'Friend added!' })
    },
    onError: () => addToast({ type: 'error', message: 'Failed to accept request' }),
  })

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => friendsService.rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      addToast({ type: 'info', message: 'Request declined' })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (friendId: string) => friendsService.removeFriend(user!.id, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      addToast({ type: 'info', message: 'Friend removed' })
    },
  })

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const result = await friendsService.searchByBunkwiseId(searchId.trim())
      if (!result) {
        setSearchError('No user found with that ID.')
      } else if (result.user_id === user?.id) {
        setSearchError("That's your own ID!")
      } else {
        setSearchResult(result)
      }
    } catch {
      setSearchError('Search failed. Try again.')
    } finally {
      setSearching(false)
    }
  }

  const copyMyId = () => {
    if (profile?.bunkwise_id) {
      navigator.clipboard.writeText(profile.bunkwise_id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const sentIds = new Set(sentRequests.map(r => r.receiver_id))
  const friendIds = new Set(friends.map(f => f.friend_id))

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#091426]">Friends</h1>
            <p className="text-sm text-[#45474c] mt-0.5">Connect with classmates to track proxies together</p>
          </div>

          {/* My Bunkwise ID card */}
          <div className="bg-[#091426] rounded-2xl p-5 relative overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8590a6] mb-1">Your Bunkwise ID</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-white tracking-widest font-mono">
                {profile?.bunkwise_id ?? '—'}
              </span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={copyMyId}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  copiedId ? 'bg-[#85f8c4] text-[#002114]' : 'bg-[#1e293b] text-white hover:bg-[#3c475a]'
                }`}
              >
                {copiedId ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </motion.button>
            </div>
            <p className="text-xs text-[#8590a6] mt-2">Share this with friends so they can find and add you</p>
            <div className="absolute right-[-8%] top-[-30%] w-32 h-32 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Search by ID */}
          <div className="bg-white rounded-2xl p-5 ambient-shadow">
            <h3 className="font-semibold text-[#091426] mb-4">Find a Friend</h3>
            <div className="flex gap-2">
              <input
                value={searchId}
                onChange={(e) => { setSearchId(e.target.value.toUpperCase()); setSearchResult(null); setSearchError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter Bunkwise ID  e.g. BW-A3K9"
                className="flex-1 border border-[#c5c6cd] rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:border-[#091426] uppercase bg-[#f7f9fb]"
                maxLength={7}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSearch}
                disabled={searching || !searchId.trim()}
                className="px-5 py-2.5 bg-[#091426] text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {searching ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Search size={15} />}
                Search
              </motion.button>
            </div>

            {/* Search result */}
            <AnimatePresence>
              {searchError && (
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-xs text-[#ba1a1a] mt-2 flex items-center gap-1">
                  <X size={12} /> {searchError}
                </motion.p>
              )}
              {searchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center justify-between p-4 bg-[#f7f9fb] border border-[#c5c6cd] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#091426] flex items-center justify-center text-white font-bold text-lg">
                      {(searchResult.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#091426]">{searchResult.full_name || 'Unknown'}</p>
                      <p className="text-xs font-mono text-[#75777d]">{searchResult.bunkwise_id}</p>
                      {searchResult.college && <p className="text-xs text-[#75777d]">{searchResult.college}</p>}
                    </div>
                  </div>
                  {friendIds.has(searchResult.user_id) ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#24a375] bg-[#f0fdf4] px-3 py-1.5 rounded-lg">
                      <UserCheck size={13} /> Friends
                    </span>
                  ) : sentIds.has(searchResult.user_id) ? (
                    <span className="text-xs font-semibold text-[#75777d] bg-[#f2f4f6] px-3 py-1.5 rounded-lg">
                      Request sent
                    </span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sendMutation.mutate(searchResult.user_id)}
                      disabled={sendMutation.isPending}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-[#091426] text-white px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors disabled:opacity-50"
                    >
                      <UserPlus size={13} /> Add Friend
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
              <div className="px-5 py-3 border-b border-[#f2f4f6] flex items-center justify-between">
                <h3 className="font-semibold text-[#091426]">Friend Requests</h3>
                <span className="text-xs font-bold bg-[#ffdad6] text-[#ba1a1a] px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </div>
              <StaggerContainer>
                {pendingRequests.map((req) => (
                  <StaggerItem key={req.id}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2f4f6] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#d0e1fb] flex items-center justify-center font-bold text-[#091426]">
                          {(req.sender_profile?.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#091426]">
                            {req.sender_profile?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs font-mono text-[#75777d]">
                            {req.sender_profile?.bunkwise_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => acceptMutation.mutate(req.id)}
                          disabled={acceptMutation.isPending}
                          className="w-9 h-9 rounded-xl bg-[#85f8c4] text-[#002114] flex items-center justify-center hover:bg-[#68dba9] transition-colors"
                        >
                          <Check size={16} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => rejectMutation.mutate(req.id)}
                          disabled={rejectMutation.isPending}
                          className="w-9 h-9 rounded-xl bg-[#ffdad6] text-[#93000a] flex items-center justify-center hover:bg-[#ffb4ab] transition-colors"
                        >
                          <X size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          )}

          {/* Friends List */}
          <div>
            <h3 className="font-semibold text-[#091426] mb-3">
              My Friends <span className="text-sm font-normal text-[#75777d]">({friends.length})</span>
            </h3>
            {friends.length === 0 ? (
              <EmptyState
                icon={<Users size={28} />}
                title="No friends yet"
                description="Search by Bunkwise ID to find and add classmates."
              />
            ) : (
              <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
                <StaggerContainer>
                  {friends.map((friend) => (
                    <StaggerItem key={friend.friend_id}>
                      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f2f4f6] last:border-0 hover:bg-[#f7f9fb] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#091426] flex items-center justify-center text-white font-bold">
                            {(friend.full_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#091426]">{friend.full_name || 'Unknown'}</p>
                            <p className="text-xs font-mono text-[#75777d]">{friend.bunkwise_id}</p>
                            {friend.college && (
                              <p className="text-xs text-[#75777d]">{friend.college}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-[#24a375] font-semibold">
                            <UserCheck size={13} /> Friends
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              if (confirm(`Remove ${friend.full_name} from friends?`)) {
                                removeMutation.mutate(friend.friend_id)
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#75777d] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors"
                          >
                            <UserX size={15} />
                          </motion.button>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            )}
          </div>

        </div>
      </PageTransition>
    </AppShell>
  )
}
