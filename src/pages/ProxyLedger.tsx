import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
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

export default function ProxyLedger() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const [addContactOpen, setAddContactOpen] = useState(false)
  const [txnModal, setTxnModal] = useState<{ open: boolean; ledgerId: string; contactName: string; type: 'gave' | 'received' } | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [txnClasses, setTxnClasses] = useState(1)
  const [txnSubject, setTxnSubject] = useState('')

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
      setContactName('')
      setContactEmail('')
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
      setTxnModal(null)
      setTxnClasses(1)
      setTxnSubject('')
    },
    onError: () => addToast({ type: 'error', message: 'Failed to record transaction' }),
  })

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
          <Button icon={<Plus size={16} />} onClick={() => setAddContactOpen(true)}>
            Add Contact
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#091426] text-white rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#85f8c4]" />
              <p className="text-xs text-[#8590a6] uppercase tracking-wider">Owed to You</p>
            </div>
            <p className="text-3xl font-bold text-[#85f8c4]">
              <AnimatedCounter value={totalOwed} />
            </p>
            <p className="text-xs text-[#8590a6] mt-1">classes</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-[#c5c6cd] rounded-2xl p-5 ambient-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-[#ba1a1a]" />
              <p className="text-xs text-[#45474c] uppercase tracking-wider">You Owe</p>
            </div>
            <p className="text-3xl font-bold text-[#ba1a1a]">
              <AnimatedCounter value={totalOwe} />
            </p>
            <p className="text-xs text-[#75777d] mt-1">classes</p>
          </motion.div>
        </div>

        {/* Ledger List */}
        {ledger.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No contacts yet"
            description="Add friends to start tracking proxy balances."
            action={
              <Button icon={<Plus size={16} />} onClick={() => setAddContactOpen(true)}>
                Add Contact
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Ledger */}
            <div className="md:col-span-8">
              <Card padding="none">
                <div className="px-6 py-4 border-b border-[#f2f4f6] flex justify-between items-center">
                  <h3 className="font-semibold text-[#091426]">Proxy Ledger</h3>
                  <span className="text-xs text-[#75777d]">{ledger.length} contacts</span>
                </div>
                <StaggerContainer>
                  {ledger.map((entry) => (
                    <StaggerItem key={entry.id}>
                      <motion.div
                        layout
                        className="px-6 py-4 flex items-center justify-between border-b border-[#f2f4f6] last:border-0 hover:bg-[#f7f9fb] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#d0e1fb] flex items-center justify-center font-bold text-[#091426]">
                            {entry.contact_name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#091426]">{entry.contact_name}</p>
                            {entry.contact_email && (
                              <p className="text-xs text-[#75777d]">{entry.contact_email}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-bold text-lg ${entry.balance > 0 ? 'text-[#24a375]' : entry.balance < 0 ? 'text-[#ba1a1a]' : 'text-[#75777d]'}`}>
                              {entry.balance > 0 ? `+${entry.balance}` : entry.balance} classes
                            </p>
                            <p className="text-xs text-[#75777d]">
                              {entry.balance > 0 ? 'owed to you' : entry.balance < 0 ? 'you owe' : 'settled'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setTxnModal({ open: true, ledgerId: entry.id, contactName: entry.contact_name, type: 'gave' })}
                              className="p-1.5 rounded-lg bg-[#85f8c4] text-[#002114] hover:bg-[#68dba9] transition-colors"
                              title="I did a proxy"
                            >
                              <ArrowUpRight size={14} />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setTxnModal({ open: true, ledgerId: entry.id, contactName: entry.contact_name, type: 'received' })}
                              className="p-1.5 rounded-lg bg-[#ffdad6] text-[#93000a] hover:bg-[#ffb4ab] transition-colors"
                              title="They did a proxy"
                            >
                              <ArrowDownLeft size={14} />
                            </motion.button>
                          </div>
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
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${txn.type === 'gave' ? 'bg-[#85f8c4]' : 'bg-[#ffdad6]'}`}>
                                {txn.type === 'gave'
                                  ? <ArrowUpRight size={12} className="text-[#002114]" />
                                  : <ArrowDownLeft size={12} className="text-[#93000a]" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#091426]">{contact?.contact_name}</p>
                                <p className="text-xs text-[#75777d]">{new Date(txn.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${txn.type === 'gave' ? 'text-[#24a375]' : 'text-[#ba1a1a]'}`}>
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

        {/* Add Contact Modal */}
        <Modal open={addContactOpen} onClose={() => setAddContactOpen(false)} title="Add Contact">
          <div className="space-y-4">
            <Input
              label="Name"
              placeholder="Friend's name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input
              label="Email (optional)"
              type="email"
              placeholder="friend@college.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => addContactMutation.mutate()}
              loading={addContactMutation.isPending}
              disabled={!contactName.trim()}
            >
              Add Contact
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
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-2">
                Number of Classes
              </label>
              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTxnClasses(Math.max(1, txnClasses - 1))}
                  className="w-10 h-10 rounded-lg bg-[#f2f4f6] text-[#091426] font-bold text-lg hover:bg-[#e6e8ea] transition-colors"
                >
                  −
                </motion.button>
                <span className="text-2xl font-bold text-[#091426] w-12 text-center">{txnClasses}</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTxnClasses(txnClasses + 1)}
                  className="w-10 h-10 rounded-lg bg-[#f2f4f6] text-[#091426] font-bold text-lg hover:bg-[#e6e8ea] transition-colors"
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
              Record Transaction
            </Button>
          </div>
        </Modal>
      </PageTransition>
    </AppShell>
  )
}
