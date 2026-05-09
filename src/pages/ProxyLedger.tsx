import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, UserPlus, ChevronRight, BadgeCheck, Search, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { proxyService } from '@/services/proxy'
import { friendsService, type FriendSearchResult } from '@/services/friends'

// Weekly bar chart data (visual only)
const weekBars = [40, 60, 30, 80, 95, 50, 70]
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function ProxyLedger() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const [addContactOpen, setAddContactOpen] = useState(false)
  const [txnModal, setTxnModal] = useState<{
    open: boolean; ledgerId: string; contactName: string; type: 'gave' | 'received'
  } | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [txnClasses, setTxnClasses] = useState(1)
  const [txnSubject, setTxnSubject] = useState('')

  // Friend search by Bunkwise ID
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<FriendSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const result = await friendsService.searchByBunkwiseId(searchId.trim())
      if (result) {
        setSearchResult(result)
        setContactName(result.full_name || result.bunkwise_id)
      } else {
        setSearchError('No user found with that ID. Check and try again.')
      }
    } catch {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

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

  const addContactMutation = useMutation({
    mutationFn: () => proxyService.addContact(user!.id, contactName, contactEmail || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger'] })
      addToast({ type: 'success', message: 'Contact added' })
      setAddContactOpen(false)
      setContactName(''); setContactEmail('')
    },
    onError: () => addToast({ type: 'error', message: 'Failed to add contact' }),
  })

  const addTxnMutation = useMutation({
    mutationFn: () =>
      proxyService.addTransaction(user!.id, txnModal!.ledgerId, txnModal!.type, txnClasses, txnSubject || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['proxy-transactions'] })
      addToast({ type: 'success', message: 'Transaction recorded' })
      setTxnModal(null); setTxnClasses(1); setTxnSubject('')
    },
    onError: () => addToast({ type: 'error', message: 'Failed to record transaction' }),
  })

  const totalOwed = ledger.reduce((sum, l) => sum + Math.max(0, l.balance), 0)
  const totalTransactions = transactions.length

  return (
    <AppShell>
      <PageTransition>

        {/* Hero Stats Section — matches original exactly */}
        <section className="mb-10">
          <div className="bg-white border border-[#c5c6cd] rounded-xl p-6 md:p-10 ambient-shadow">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#45474c]">
                  Total Proxies Owed to You
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[#091426]">
                    <AnimatedCounter value={totalOwed} /> Classes
                  </span>
                  <span className="text-sm text-[#24a375] flex items-center gap-1 bg-[#00301f]/10 px-2 py-0.5 rounded-full">
                    <TrendingUp size={12} />
                    +{Math.max(0, totalOwed - 10)} from last week
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* "I did a proxy" — primary button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (ledger.length === 0) { addToast({ type: 'info', message: 'Add a contact first' }); return }
                    setTxnModal({ open: true, ledgerId: ledger[0].id, contactName: ledger[0].contact_name, type: 'gave' })
                  }}
                  className="flex items-center gap-2 bg-[#091426] text-white text-xs font-semibold px-6 py-3 rounded hover:bg-[#1e293b] transition-colors active:scale-[0.98]"
                >
                  <Plus size={16} />
                  I did a proxy
                </motion.button>
                {/* "They did a proxy" — secondary button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (ledger.length === 0) { addToast({ type: 'info', message: 'Add a contact first' }); return }
                    setTxnModal({ open: true, ledgerId: ledger[0].id, contactName: ledger[0].contact_name, type: 'received' })
                  }}
                  className="flex items-center gap-2 bg-[#eceef0] border border-[#75777d] text-[#191c1e] text-xs font-semibold px-6 py-3 rounded hover:bg-[#e0e3e5] transition-colors active:scale-[0.98]"
                >
                  <UserPlus size={16} />
                  They did a proxy
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid — 8/4 like original */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Proxy Ledger List — col-span-8 */}
          <div className="md:col-span-8">
            {ledger.length === 0 ? (
              <EmptyState
                icon={<UserPlus size={28} />}
                title="No contacts yet"
                description="Add friends to start tracking proxy balances."
                action={
                  <Button icon={<Plus size={16} />} onClick={() => setAddContactOpen(true)}>
                    Add Contact
                  </Button>
                }
              />
            ) : (
              <div className="bg-white border border-[#c5c6cd] rounded-xl overflow-hidden ambient-shadow">
                {/* Header */}
                <div className="px-6 py-3 border-b border-[#c5c6cd] bg-[#f2f4f6] flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-[#091426]">Proxy Ledger</h3>
                  <span className="text-xs font-semibold text-[#45474c]">Active Contacts</span>
                </div>

                {/* Rows */}
                <StaggerContainer>
                  {ledger.map((entry) => {
                    const isOwed = entry.balance > 0
                    const isOwe = entry.balance < 0
                    const avatarBorder = isOwed ? 'border-[#bcc7de]' : isOwe ? 'border-[#ffdad6]' : 'border-[#c5c6cd]'

                    return (
                      <StaggerItem key={entry.id}>
                        <motion.div
                          whileHover={{ backgroundColor: '#f2f4f6' }}
                          className="p-6 flex items-center justify-between border-b border-[#c5c6cd] last:border-0 transition-colors group cursor-pointer"
                          onClick={() => setTxnModal({ open: true, ledgerId: entry.id, contactName: entry.contact_name, type: 'gave' })}
                        >
                          <div className="flex items-center gap-6">
                            {/* Avatar with border color based on balance */}
                            <div className={`w-12 h-12 rounded-full border-2 ${avatarBorder} bg-[#d0e1fb] flex items-center justify-center font-bold text-[#091426] text-lg shrink-0`}>
                              {entry.contact_name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-[#091426]">{entry.contact_name}</p>
                              {entry.contact_email && (
                                <p className="text-sm text-[#45474c]">{entry.contact_email}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${isOwed ? 'text-[#24a375]' : isOwe ? 'text-[#ba1a1a]' : 'text-[#75777d]'}`}>
                              {isOwed ? `+${entry.balance} Owed` : isOwe ? `${entry.balance} Owe` : 'Settled'}
                            </p>
                            <p className="text-xs font-semibold text-[#45474c]">
                              {transactions.find(t => t.ledger_id === entry.id)
                                ? `Last activity: ${new Date(transactions.find(t => t.ledger_id === entry.id)!.created_at).toLocaleDateString('en-IN', { weekday: 'long' })}`
                                : 'No activity yet'}
                            </p>
                          </div>
                        </motion.div>
                      </StaggerItem>
                    )
                  })}
                </StaggerContainer>

                {/* Footer */}
                <div className="p-6 text-center">
                  <button
                    onClick={() => setAddContactOpen(true)}
                    className="text-xs font-semibold text-[#505f76] hover:text-[#091426] transition-colors inline-flex items-center gap-1"
                  >
                    Add New Contact
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — col-span-4 */}
          <div className="md:col-span-4 space-y-6">

            {/* Reliability Score Card — dark navy, matches original */}
            <div className="bg-[#091426] text-white rounded-xl p-6 ambient-shadow">
              <h4 className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-3">Your Reliability Score</h4>
              <div className="flex items-center gap-6 mb-6">
                <span className="text-4xl font-bold">
                  <AnimatedCounter value={totalTransactions > 0 ? 98 : 0} suffix="%" />
                </span>
                <BadgeCheck size={36} className="text-[#85f8c4]" />
              </div>
              <div className="w-full bg-[#1e293b] h-1 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="bg-[#85f8c4] h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '98%' }}
                  transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
              <p className="text-sm opacity-80">Based on {totalTransactions} verified proxies this semester.</p>
            </div>

            {/* Weekly Trend Bar Chart — matches original bar style */}
            <div className="bg-white border border-[#c5c6cd] rounded-xl p-6 ambient-shadow">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[#45474c] mb-6">Weekly Trend</h4>
              <div className="flex items-end justify-between h-24 gap-1 mb-3">
                {weekBars.map((h, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-t-sm ${i === 4 ? 'bg-[#091426]' : 'bg-[#d0e1fb]'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                    title={weekDays[i]}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                {weekDays.map((d, i) => (
                  <span key={i} className="flex-1 text-center text-xs text-[#75777d]">{d}</span>
                ))}
              </div>
              <p className="text-sm text-[#45474c] text-center mt-3">Proxy usage is peaking this week.</p>
            </div>

            {/* Invite a Friend — dashed card, matches original */}
            <motion.div
              whileHover={{ backgroundColor: '#eceef0' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAddContactOpen(true)}
              className="bg-[#e6e8ea] border-2 border-dashed border-[#c5c6cd] rounded-xl p-6 flex flex-col items-center text-center gap-3 cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <UserPlus size={18} className="text-[#091426]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#091426]">Invite a Friend</p>
                <p className="text-sm text-[#45474c]">Grow your proxy network</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Add Contact Modal */}
        <Modal open={addContactOpen} onClose={() => {
          setAddContactOpen(false)
          setSearchId(''); setSearchResult(null); setSearchError(''); setContactName(''); setContactEmail('')
        }} title="Add Friend">
          <div className="space-y-4">

            {/* Search by Bunkwise ID */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">
                Search by Bunkwise ID
              </label>
              <div className="flex gap-2">
                <input
                  value={searchId}
                  onChange={(e) => { setSearchId(e.target.value.toUpperCase()); setSearchResult(null); setSearchError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. BW-A3K9"
                  className="flex-1 border border-[#c5c6cd] rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:border-[#091426] uppercase"
                  maxLength={7}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSearch}
                  disabled={searching || !searchId.trim()}
                  className="px-4 py-2.5 bg-[#091426] text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {searching ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <Search size={15} />}
                  Find
                </motion.button>
              </div>
              <p className="text-xs text-[#75777d] mt-1">Ask your friend to share their Bunkwise ID from their Profile page</p>
            </div>

            {/* Search result */}
            <AnimatePresence>
              {searchResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between p-4 bg-[#f0fdf4] border border-[#85f8c4] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#091426] flex items-center justify-center text-white font-bold">
                      {(searchResult.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#091426]">{searchResult.full_name || 'Unknown'}</p>
                      <p className="text-xs text-[#45474c] font-mono">{searchResult.bunkwise_id}</p>
                      {searchResult.college && <p className="text-xs text-[#75777d]">{searchResult.college}</p>}
                    </div>
                  </div>
                  <BadgeCheck size={20} className="text-[#24a375]" />
                </motion.div>
              )}
              {searchError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl"
                >
                  <X size={14} className="text-[#ba1a1a] shrink-0" />
                  <p className="text-xs text-[#93000a]">{searchError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-[#f2f4f6] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#75777d] mb-3">Or add manually</p>
              <div className="space-y-3">
                <Input label="Name" placeholder="Friend's name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                <Input label="Email (optional)" type="email" placeholder="friend@college.edu" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => addContactMutation.mutate()}
              loading={addContactMutation.isPending}
              disabled={!contactName.trim()}
            >
              Add to Proxy Ledger
            </Button>
          </div>
        </Modal>

        {/* Transaction Modal */}
        <Modal
          open={!!txnModal?.open}
          onClose={() => setTxnModal(null)}
          title={txnModal?.type === 'gave' ? `I did a proxy for ${txnModal?.contactName}` : `${txnModal?.contactName} did a proxy for me`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">Number of Classes</label>
              <div className="flex items-center gap-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setTxnClasses(Math.max(1, txnClasses - 1))}
                  className="w-10 h-10 rounded-lg bg-[#f2f4f6] text-[#091426] font-bold text-xl hover:bg-[#e6e8ea] transition-colors">−</motion.button>
                <span className="text-2xl font-bold text-[#091426] w-12 text-center">{txnClasses}</span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setTxnClasses(txnClasses + 1)}
                  className="w-10 h-10 rounded-lg bg-[#f2f4f6] text-[#091426] font-bold text-xl hover:bg-[#e6e8ea] transition-colors">+</motion.button>
              </div>
            </div>

            {/* Contact selector if multiple */}
            {ledger.length > 1 && (
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">Contact</label>
                <div className="space-y-2">
                  {ledger.map((l) => (
                    <motion.div
                      key={l.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTxnModal(prev => prev ? { ...prev, ledgerId: l.id, contactName: l.contact_name } : null)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${
                        txnModal?.ledgerId === l.id
                          ? 'bg-[#e6e8ea] border-[#091426]/20'
                          : 'hover:bg-[#f2f4f6] border-transparent hover:border-[#c5c6cd]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#d0e1fb] flex items-center justify-center font-bold text-[#091426] text-sm">
                          {l.contact_name[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#091426]">{l.contact_name}</span>
                      </div>
                      <AnimatePresence>
                        {txnModal?.ledgerId === l.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <div className="w-4 h-4 rounded-full bg-[#091426]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <Input label="Subject (optional)" placeholder="e.g. Advanced Mathematics" value={txnSubject} onChange={(e) => setTxnSubject(e.target.value)} />
            <Button className="w-full" onClick={() => addTxnMutation.mutate()} loading={addTxnMutation.isPending}>
              Record Transaction
            </Button>
          </div>
        </Modal>

      </PageTransition>
    </AppShell>
  )
}
