import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Users, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, Copy, Check,
  UserPlus, Hash, Trash2, Search
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { proxyService } from '@/services/proxy'
import { profilesService } from '@/services/profiles'

export default function ProxyLedger() {
  const { user, profile, setProfile } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [friendCode, setFriendCode] = useState('')
  const [lookupResult, setLookupResult] = useState<{ name: string; code: string } | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [isLooking, setIsLooking] = useState(false)
  const [copied, setCopied] = useState(false)

  const [txnModal, setTxnModal] = useState<{
    open: boolean; ledgerId: string; contactName: string; type: 'gave' | 'received'
  } | null>(null)
  const [txnClasses, setTxnClasses] = useState(1)
  const [txnSubject, setTxnSubject] = useState('')

  // Ensure current user has a friend code
  const { data: myCode } = useQuery({
    queryKey: ['my-friend-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      if (profile?.friend_code) return profile.friend_code
      const code = await profilesService.ensureFriendCode(user.id)
      // Refresh profile in store
      const updated = await profilesService.getProfile(user.id)
      if (updated) setProfile(updated)
      return code
    },
    enabled: !!user?.id,
  })

  const { data: ledger = [] } = useQuery({
    queryKey: ['proxy-ledger', user?.id],
    queryFn: () => proxyService.getLedger(user!.id),
    enabled: !!user?.id,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['proxy-transactions', user?.id],
    queryFn: () => proxyService.getTransactions(user!.id),
    enabled: !!user?.id,
  })

  // Look up friend by code (preview before adding)
  const handleLookup = async () => {
    if (!friendCode.trim()) return
    setIsLooking(true)
    setLookupError('')
    setLookupResult(null)
    try {
      const found = await profilesService.getProfileByFriendCode(friendCode)
      if (!found) {
        setLookupError('No user found with this friend code')
      } else if (found.user_id === user?.id) {
        setLookupError("That's your own friend code!")
      } else {
        setLookupResult({
          name: found.full_name || found.email || 'Unknown User',
          code: found.friend_code!,
        })
      }
    } catch {
      setLookupError('Failed to look up friend code')
    } finally {
      setIsLooking(false)
    }
  }

  const addByCodeMutation = useMutation({
    mutationFn: () => proxyService.addContactByFriendCode(user!.id, friendCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger'] })
      addToast({ type: 'success', message: `${lookupResult?.name} added to your ledger!` })
      setAddOpen(false)
      setFriendCode('')
      setLookupResult(null)
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proxyService.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger'] })
      addToast({ type: 'success', message: 'Contact removed' })
    },
  })

  const addTxnMutation = useMutation({
    mutationFn: () =>
      proxyService.addTransaction(
        user!.id, txnModal!.ledgerId, txnModal!.type,
        txnClasses, txnSubject || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['proxy-transactions'] })
      addToast({ type: 'success', message: 'Transaction recorded' })
      setTxnModal(null)
      setTxnClasses(1)
      setTxnSubject('')
    },
    onError: () => addToast({ type: 'error', message: 'Failed to record transaction' }),
  })

  const copyCode = () => {
    if (!myCode) return
    navigator.clipboard.writeText(myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast({ type: 'success', message: 'Friend code copied!' })
  }

  const totalOwed = ledger.reduce((sum, l) => sum + Math.max(0, l.balance), 0)
  const totalOwe = ledger.reduce((sum, l) => sum + Math.max(0, -l.balance), 0)

  return (
    <AppShell>
      <PageTransition>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#091426]">Proxy Ledger</h1>
            <p className="text-sm text-[#45474c] mt-0.5">Track proxy balances with friends</p>
          </div>
          <Button icon={<UserPlus size={16} />} onClick={() => setAddOpen(true)}>
            Add Friend
          </Button>
        </div>

        {/* My Friend Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#091426] text-white rounded-2xl p-5 mb-6 relative overflow-hidden"
        >
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Hash size={14} className="text-[#8590a6]" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8590a6]">
                  Your Friend Code
                </p>
              </div>
              <p className="text-3xl font-bold tracking-widest text-white font-mono">
                {myCode || '——————'}
              </p>
              <p className="text-xs text-[#8590a6] mt-1">
                Share this code so friends can add you to their proxy ledger
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={copyCode}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1"
                  >
                    <Check size={13} className="text-[#85f8c4]" /> Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1"
                  >
                    <Copy size={13} /> Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          {/* Decorative */}
          <div className="absolute right-[-10%] top-[-30%] w-40 h-40 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#f0fdf4] border border-[#85f8c4] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#24a375]" />
              <p className="text-xs text-[#24a375] uppercase tracking-wider font-semibold">Owed to You</p>
            </div>
            <p className="text-3xl font-bold text-[#24a375]">
              <AnimatedCounter value={totalOwed} />
            </p>
            <p className="text-xs text-[#45474c] mt-1">classes</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-[#fff5f5] border border-[#ffdad6] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-[#ba1a1a]" />
              <p className="text-xs text-[#ba1a1a] uppercase tracking-wider font-semibold">You Owe</p>
            </div>
            <p className="text-3xl font-bold text-[#ba1a1a]">
              <AnimatedCounter value={totalOwe} />
            </p>
            <p className="text-xs text-[#45474c] mt-1">classes</p>
          </motion.div>
        </div>

        {/* Ledger List */}
        {ledger.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No friends added yet"
            description="Share your friend code or enter a friend's code to start tracking proxies."
            action={
              <Button icon={<UserPlus size={16} />} onClick={() => setAddOpen(true)}>
                Add Friend
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Ledger */}
            <div className="md:col-span-8">
              <Card padding="none">
                <div className="px-6 py-4 border-b border-[#f2f4f6] flex justify-between items-center">
                  <h3 className="font-semibold text-[#091426]">Friends</h3>
                  <span className="text-xs text-[#75777d]">{ledger.length} contact{ledger.length !== 1 ? 's' : ''}</span>
                </div>
                <StaggerContainer>
                  {ledger.map((entry) => (
                    <StaggerItem key={entry.id}>
                      <motion.div
                        layout
                        className="px-6 py-4 flex items-center justify-between border-b border-[#f2f4f6] last:border-0 hover:bg-[#f7f9fb] transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-[#d0e1fb] flex items-center justify-center font-bold text-[#091426] shrink-0 text-sm">
                            {entry.contact_name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#091426] truncate">{entry.contact_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {entry.friend_code ? (
                                <span className="text-xs text-[#75777d] font-mono bg-[#f2f4f6] px-1.5 py-0.5 rounded">
                                  {entry.friend_code}
                                </span>
                              ) : entry.contact_email ? (
                                <span className="text-xs text-[#75777d] truncate">{entry.contact_email}</span>
                              ) : null}
                              {entry.friend_user_id && (
                                <span className="text-xs text-[#24a375] font-semibold">✓ Linked</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {/* Balance */}
                          <div className="text-right mr-1">
                            <p className={`font-bold text-base ${
                              entry.balance > 0 ? 'text-[#24a375]' :
                              entry.balance < 0 ? 'text-[#ba1a1a]' : 'text-[#75777d]'
                            }`}>
                              {entry.balance > 0 ? `+${entry.balance}` : entry.balance}
                            </p>
                            <p className="text-xs text-[#75777d]">
                              {entry.balance > 0 ? 'owed to you' : entry.balance < 0 ? 'you owe' : 'settled'}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <motion.button
                            whileTap={{ scale: 0.88 }}
                            onClick={() => setTxnModal({ open: true, ledgerId: entry.id, contactName: entry.contact_name, type: 'gave' })}
                            className="p-2 rounded-lg bg-[#85f8c4] text-[#002114] hover:bg-[#68dba9] transition-colors"
                            title="I did a proxy for them"
                          >
                            <ArrowUpRight size={14} />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.88 }}
                            onClick={() => setTxnModal({ open: true, ledgerId: entry.id, contactName: entry.contact_name, type: 'received' })}
                            className="p-2 rounded-lg bg-[#ffdad6] text-[#93000a] hover:bg-[#ffb4ab] transition-colors"
                            title="They did a proxy for me"
                          >
                            <ArrowDownLeft size={14} />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.88 }}
                            onClick={() => {
                              if (confirm(`Remove ${entry.contact_name} from your ledger?`)) {
                                deleteMutation.mutate(entry.id)
                              }
                            }}
                            className="p-2 rounded-lg text-[#75777d] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </Card>
            </div>

            {/* Recent Transactions */}
            <div className="md:col-span-4">
              <Card>
                <h4 className="font-semibold text-[#091426] mb-4">Recent Activity</h4>
                {transactions.length === 0 ? (
                  <p className="text-sm text-[#75777d] text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {transactions.slice(0, 6).map((txn) => {
                        const contact = ledger.find((l) => l.id === txn.ledger_id)
                        return (
                          <motion.div
                            key={txn.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                txn.type === 'gave' ? 'bg-[#85f8c4]' : 'bg-[#ffdad6]'
                              }`}>
                                {txn.type === 'gave'
                                  ? <ArrowUpRight size={12} className="text-[#002114]" />
                                  : <ArrowDownLeft size={12} className="text-[#93000a]" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#091426] truncate max-w-[100px]">
                                  {contact?.contact_name}
                                </p>
                                <p className="text-xs text-[#75777d]">
                                  {new Date(txn.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${
                              txn.type === 'gave' ? 'text-[#24a375]' : 'text-[#ba1a1a]'
                            }`}>
                              {txn.type === 'gave' ? '+' : '-'}{txn.classes}
                            </span>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── Add Friend Modal ── */}
        <Modal open={addOpen} onClose={() => {
          setAddOpen(false)
          setFriendCode('')
          setLookupResult(null)
          setLookupError('')
        }} title="Add Friend by Code">
          <div className="space-y-4">
            {/* Instruction */}
            <div className="bg-[#f2f4f6] rounded-xl p-3">
              <p className="text-xs text-[#45474c]">
                Ask your friend to share their <span className="font-semibold text-[#091426]">Friend Code</span> from their Proxy Ledger page. Enter it below to add them.
              </p>
            </div>

            {/* Code input + lookup */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">
                Friend Code
              </label>
              <div className="flex gap-2">
                <input
                  value={friendCode}
                  onChange={(e) => {
                    setFriendCode(e.target.value.toUpperCase())
                    setLookupResult(null)
                    setLookupError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="BW-XXXXX"
                  maxLength={8}
                  className="flex-1 border border-[#c5c6cd] rounded px-4 py-2.5 text-sm font-mono tracking-widest text-[#091426] bg-white focus:outline-none focus:border-[#091426] uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLookup}
                  disabled={!friendCode.trim() || isLooking}
                  className="px-4 py-2.5 bg-[#f2f4f6] text-[#091426] rounded text-sm font-semibold hover:bg-[#e6e8ea] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search size={14} />
                  {isLooking ? '...' : 'Find'}
                </motion.button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {lookupError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#ffdad6] text-[#93000a] text-sm px-4 py-3 rounded-xl"
                >
                  {lookupError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Found user preview */}
            <AnimatePresence>
              {lookupResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#f0fdf4] border border-[#85f8c4] rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#091426] flex items-center justify-center text-white font-bold">
                      {lookupResult.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#091426]">{lookupResult.name}</p>
                      <p className="text-xs text-[#45474c] font-mono">{lookupResult.code}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#24a375] bg-[#85f8c4] px-2 py-1 rounded-full">
                    Found ✓
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add button — only enabled after successful lookup */}
            <Button
              className="w-full"
              onClick={() => addByCodeMutation.mutate()}
              loading={addByCodeMutation.isPending}
              disabled={!lookupResult}
            >
              Add {lookupResult?.name || 'Friend'} to Ledger
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e6e8ea]" />
              <span className="text-xs text-[#75777d]">your code</span>
              <div className="flex-1 h-px bg-[#e6e8ea]" />
            </div>

            {/* Show own code in modal too */}
            <div
              onClick={copyCode}
              className="flex items-center justify-between bg-[#091426] text-white rounded-xl px-4 py-3 cursor-pointer hover:bg-[#1e293b] transition-colors"
            >
              <div>
                <p className="text-xs text-[#8590a6] mb-0.5">Your friend code</p>
                <p className="font-mono font-bold tracking-widest text-lg">{myCode || '...'}</p>
              </div>
              <motion.div whileTap={{ scale: 0.9 }}>
                {copied ? <Check size={18} className="text-[#85f8c4]" /> : <Copy size={18} className="text-[#8590a6]" />}
              </motion.div>
            </div>
          </div>
        </Modal>

        {/* ── Transaction Modal ── */}
        <Modal
          open={!!txnModal?.open}
          onClose={() => { setTxnModal(null); setTxnClasses(1); setTxnSubject('') }}
          title={txnModal?.type === 'gave'
            ? `I did a proxy for ${txnModal?.contactName}`
            : `${txnModal?.contactName} did a proxy for me`}
        >
          <div className="space-y-5">
            {/* Type indicator */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${
              txnModal?.type === 'gave'
                ? 'bg-[#f0fdf4] text-[#24a375]'
                : 'bg-[#fff5f5] text-[#ba1a1a]'
            }`}>
              {txnModal?.type === 'gave'
                ? <><ArrowUpRight size={16} /> You gave a proxy — they owe you</>
                : <><ArrowDownLeft size={16} /> They gave a proxy — you owe them</>}
            </div>

            {/* Class counter */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-3">
                Number of Classes
              </label>
              <div className="flex items-center justify-center gap-6">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setTxnClasses(Math.max(1, txnClasses - 1))}
                  className="w-12 h-12 rounded-xl bg-[#f2f4f6] text-[#091426] font-bold text-xl hover:bg-[#e6e8ea] transition-colors"
                >
                  −
                </motion.button>
                <motion.span
                  key={txnClasses}
                  initial={{ scale: 1.3, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold text-[#091426] w-16 text-center tabular-nums"
                >
                  {txnClasses}
                </motion.span>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setTxnClasses(txnClasses + 1)}
                  className="w-12 h-12 rounded-xl bg-[#f2f4f6] text-[#091426] font-bold text-xl hover:bg-[#e6e8ea] transition-colors"
                >
                  +
                </motion.button>
              </div>
            </div>

            <Input
              label="Subject (optional)"
              placeholder="e.g. Advanced Mathematics"
              value={txnSubject}
              onChange={(e) => setTxnSubject(e.target.value)}
            />

            <Button
              className="w-full"
              onClick={() => addTxnMutation.mutate()}
              loading={addTxnMutation.isPending}
            >
              Record {txnClasses} Class{txnClasses !== 1 ? 'es' : ''}
            </Button>
          </div>
        </Modal>
      </PageTransition>
    </AppShell>
  )
}
