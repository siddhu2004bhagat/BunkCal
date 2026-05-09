import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { History as HistoryIcon, CheckCircle, XCircle, Calculator, ArrowUpRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { StaggerContainer, StaggerItem } from '@/components/motion/FadeIn'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { attendanceService } from '@/services/attendance'
import { calculatorService } from '@/services/calculator'
import { proxyService } from '@/services/proxy'
import { subjectsService } from '@/services/subjects'
import { useState } from 'react'

type Tab = 'attendance' | 'calculator' | 'proxy'

export default function History() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('attendance')

  const { data: records = [] } = useQuery({
    queryKey: ['attendance', user?.id],
    queryFn: () => attendanceService.getRecords(user!.id),
    enabled: !!user?.id,
  })

  const { data: calcHistory = [] } = useQuery({
    queryKey: ['calculator-history', user?.id],
    queryFn: () => calculatorService.getHistory(user!.id),
    enabled: !!user?.id,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['proxy-transactions', user?.id],
    queryFn: () => proxyService.getTransactions(user!.id),
    enabled: !!user?.id,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: () => subjectsService.getSubjects(user!.id),
    enabled: !!user?.id,
  })

  const { data: ledger = [] } = useQuery({
    queryKey: ['proxy-ledger', user?.id],
    queryFn: () => proxyService.getLedger(user!.id),
    enabled: !!user?.id,
  })

  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || 'Unknown'
  const getContactName = (id: string) => ledger.find((l) => l.id === id)?.contact_name || 'Unknown'

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'attendance', label: 'Attendance', count: records.length },
    { id: 'calculator', label: 'Calculator', count: calcHistory.length },
    { id: 'proxy', label: 'Proxy', count: transactions.length },
  ]

  return (
    <AppShell>
      <PageTransition>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#091426]">History</h1>
          <p className="text-sm text-[#45474c] mt-0.5">Your activity log</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#f2f4f6] rounded-xl p-1 mb-6">
          {tabs.map(({ id, label, count }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                tab === id ? 'bg-white text-[#091426] ambient-shadow' : 'text-[#45474c] hover:text-[#091426]'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${tab === id ? 'text-[#45474c]' : 'text-[#75777d]'}`}>
                ({count})
              </span>
            </motion.button>
          ))}
        </div>

        {/* Attendance History */}
        {tab === 'attendance' && (
          records.length === 0 ? (
            <EmptyState icon={<HistoryIcon size={28} />} title="No attendance records" description="Start marking attendance to see history here." />
          ) : (
            <StaggerContainer className="space-y-2">
              {records.map((record) => (
                <StaggerItem key={record.id}>
                  <div className="flex items-center justify-between bg-white border border-[#c5c6cd] rounded-xl px-4 py-3 ambient-shadow">
                    <div className="flex items-center gap-3">
                      {record.status === 'present'
                        ? <CheckCircle size={18} className="text-[#24a375]" />
                        : record.status === 'proxy'
                        ? <ArrowUpRight size={18} className="text-[#505f76]" />
                        : <XCircle size={18} className="text-[#ba1a1a]" />}
                      <div>
                        <p className="text-sm font-semibold text-[#091426]">{getSubjectName(record.subject_id)}</p>
                        <p className="text-xs text-[#75777d]">{new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      record.status === 'present' ? 'bg-[#85f8c4] text-[#002114]' :
                      record.status === 'proxy' ? 'bg-[#d0e1fb] text-[#091426]' :
                      'bg-[#ffdad6] text-[#93000a]'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )
        )}

        {/* Calculator History */}
        {tab === 'calculator' && (
          calcHistory.length === 0 ? (
            <EmptyState icon={<Calculator size={28} />} title="No calculations yet" description="Use the bunk calculator to see history here." />
          ) : (
            <StaggerContainer className="space-y-2">
              {calcHistory.map((h) => (
                <StaggerItem key={h.id}>
                  <Card padding="md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#091426]">{h.subject_name}</p>
                        <p className="text-xs text-[#75777d] mt-0.5">
                          {h.attended}/{h.total} classes · Target: {h.target}%
                        </p>
                        <p className="text-xs text-[#75777d]">{new Date(h.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#24a375]">+{h.can_miss} can miss</p>
                        <p className="text-xs text-[#75777d]">{Math.round((h.attended / h.total) * 100)}% current</p>
                      </div>
                    </div>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )
        )}

        {/* Proxy History */}
        {tab === 'proxy' && (
          transactions.length === 0 ? (
            <EmptyState icon={<ArrowUpRight size={28} />} title="No proxy transactions" description="Record proxy transactions to see history here." />
          ) : (
            <StaggerContainer className="space-y-2">
              {transactions.map((txn) => (
                <StaggerItem key={txn.id}>
                  <div className="flex items-center justify-between bg-white border border-[#c5c6cd] rounded-xl px-4 py-3 ambient-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.type === 'gave' ? 'bg-[#85f8c4]' : 'bg-[#ffdad6]'}`}>
                        {txn.type === 'gave'
                          ? <ArrowUpRight size={14} className="text-[#002114]" />
                          : <motion.div className="rotate-180"><ArrowUpRight size={14} className="text-[#93000a]" /></motion.div>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#091426]">
                          {txn.type === 'gave' ? 'Gave proxy to' : 'Received proxy from'} {getContactName(txn.ledger_id)}
                        </p>
                        {txn.subject && <p className="text-xs text-[#75777d]">{txn.subject}</p>}
                        <p className="text-xs text-[#75777d]">{new Date(txn.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${txn.type === 'gave' ? 'text-[#24a375]' : 'text-[#ba1a1a]'}`}>
                      {txn.type === 'gave' ? '+' : '-'}{txn.classes}
                    </span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )
        )}
      </PageTransition>
    </AppShell>
  )
}
