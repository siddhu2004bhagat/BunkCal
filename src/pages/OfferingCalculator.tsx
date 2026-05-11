import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Upload, Sparkles, ArrowLeftRight, Users, History, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { analyzeOffering, type OfferingResult } from '@/services/gemini'
import { proxyService } from '@/services/proxy'
import { calculatorService } from '@/services/calculator'

// Proxy value to visual indicator
function ProxyBadge({ value }: { value: number }) {
  const colors = ['', 'bg-[#f2f4f6] text-[#45474c]', 'bg-[#d0e1fb] text-[#091426]', 'bg-[#85f8c4] text-[#002114]', 'bg-amber-100 text-amber-800', 'bg-[#ffdad6] text-[#93000a]']
  const labels = ['', '1 Proxy', '2 Proxies', '3 Proxies', '4 Proxies', '5 Proxies']
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[value] || colors[1]}`}>
      {labels[value] || `${value} Proxies`}
    </span>
  )
}

export default function OfferingCalculator() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState<string>('image/jpeg')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<OfferingResult | null>(null)
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<'gave' | 'received'>('received')

  const { data: ledger = [] } = useQuery({
    queryKey: ['proxy-ledger', user?.id],
    queryFn: () => proxyService.getLedger(user!.id),
    enabled: !!user?.id,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['calculator-history', user?.id],
    queryFn: () => calculatorService.getHistory(user!.id),
    enabled: !!user?.id,
  })

  const tradeMutation = useMutation({
    mutationFn: async () => {
      if (!result || !selectedContact) throw new Error('Select a contact first')
      return proxyService.addTransaction(
        user!.id,
        selectedContact,
        tradeType,
        result.proxyValue,
        result.item,
        `Offering: ${result.item} (${result.proxyValue} proxies)`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['proxy-transactions'] })
      addToast({ type: 'success', message: `Trade accepted! ${result?.proxyValue} proxies ${tradeType === 'gave' ? 'given' : 'received'}.` })
      setResult(null)
      setImagePreview(null)
      setImageBase64(null)
      setSelectedContact(null)
    },
    onError: () => addToast({ type: 'error', message: 'Trade failed. Try again.' }),
  })

  const handleImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)
      // Extract base64 without the data URL prefix
      const base64 = dataUrl.split(',')[1]
      setImageBase64(base64)
      setImageMime(file.type || 'image/jpeg')
      setResult(null)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async () => {
    if (!imageBase64) return
    setAnalyzing(true)
    try {
      const res = await analyzeOffering(imageBase64, imageMime)
      setResult(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      if (msg.includes('API key not configured')) {
        addToast({ type: 'warning', message: 'Add VITE_GEMINI_API_KEY to .env to use AI analysis' })
        // Demo mode — show a mock result
        setResult({
          item: 'Maggi Plate',
          description: 'A hot plate of Maggi instant noodles',
          proxyValue: 2,
          confidence: 'high',
          reasoning: 'Standard college canteen item worth 2 proxy credits',
        })
      } else {
        addToast({ type: 'error', message: msg })
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const geminiConfigured = import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'

  return (
    <AppShell>
      <PageTransition>
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} className="text-[#3b82f6]" />
              <h1 className="text-2xl font-bold text-[#091426]">Trade for Attendance</h1>
            </div>
            <p className="text-sm text-[#45474c]">
              Upload a photo of your offering — AI calculates how many proxies it's worth
            </p>
          </div>

          {/* API key warning */}
          {!geminiConfigured && (
            <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Demo Mode</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Add <code className="bg-amber-100 px-1 rounded">VITE_GEMINI_API_KEY</code> to your .env for real AI analysis.
                  Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline">aistudio.google.com</a>
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Image Upload — col-span-7 */}
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#091426]">Scan Offering</h3>
                  <span className="text-xs font-semibold bg-[#d0e1fb] text-[#54647a] px-3 py-1 rounded-full">
                    AI POWERED
                  </span>
                </div>

                {/* Image area */}
                <div
                  className="relative aspect-video bg-[#f7f9fb] rounded-xl overflow-hidden border-2 border-dashed border-[#c5c6cd] cursor-pointer hover:border-[#3b82f6] transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="offering" className="w-full h-full object-cover" />
                      {/* Scanner overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-[#3b82f6]" />
                        <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-[#3b82f6]" />
                        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-[#3b82f6]" />
                        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-[#3b82f6]" />
                      </div>
                      {result && (
                        <div className="absolute bottom-3 left-3 bg-[#091426] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                          <Sparkles size={12} className="text-[#85f8c4]" />
                          Detected: {result.item}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                      <div className="w-14 h-14 bg-[#f2f4f6] rounded-2xl flex items-center justify-center">
                        <Camera size={24} className="text-[#9ca3af]" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-[#45474c]">Upload a photo of the offering</p>
                        <p className="text-xs text-[#9ca3af] mt-1">Maggi, biryani, pizza, anything!</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload buttons */}
                <div className="flex gap-2 mt-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#c5c6cd] rounded-xl text-sm font-semibold text-[#45474c] hover:bg-[#f7f9fb] transition-colors"
                  >
                    <Upload size={15} /> Upload Photo
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => cameraRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[#c5c6cd] rounded-xl text-sm font-semibold text-[#45474c] hover:bg-[#f7f9fb] transition-colors"
                  >
                    <Camera size={15} /> Take Photo
                  </motion.button>
                </div>

                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }} />

                {imagePreview && !result && (
                  <Button
                    className="w-full mt-3"
                    loading={analyzing}
                    icon={<Sparkles size={15} />}
                    onClick={handleAnalyze}
                  >
                    {analyzing ? 'Analyzing with AI...' : 'Analyze Offering'}
                  </Button>
                )}
              </Card>
            </div>

            {/* Result + Trade — col-span-5 */}
            <div className="lg:col-span-5 space-y-4">

              {/* Estimated Value */}
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#091426] text-white rounded-2xl p-5"
                  >
                    <h3 className="text-sm font-semibold opacity-70 mb-1">Estimated Value</h3>
                    <div className="flex items-end gap-2 my-4">
                      <span className="text-6xl font-bold leading-none">
                        <AnimatedCounter value={result.proxyValue} />
                      </span>
                      <span className="text-xl font-semibold mb-1">
                        {result.proxyValue === 1 ? 'Proxy' : 'Proxies'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mb-0.5">{result.item}</p>
                    <p className="text-xs text-[#8590a6] mb-4">{result.reasoning}</p>
                    <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                      <ProxyBadge value={result.proxyValue} />
                      <span className={`text-xs font-semibold ${result.confidence === 'high' ? 'text-[#85f8c4]' : result.confidence === 'medium' ? 'text-amber-400' : 'text-[#ffdad6]'}`}>
                        {result.confidence} confidence
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    className="bg-[#091426] text-white rounded-2xl p-5 flex flex-col justify-between min-h-[180px]"
                  >
                    <h3 className="text-sm font-semibold opacity-70">Estimated Value</h3>
                    <div className="flex items-end gap-2 my-4">
                      <span className="text-6xl font-bold leading-none opacity-20">—</span>
                    </div>
                    <p className="text-xs text-[#8590a6]">Upload a photo to see proxy value</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Send To — contact selector */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#c5c6cd] rounded-2xl p-4 ambient-shadow"
                >
                  <h3 className="font-semibold text-[#091426] mb-3">Trade With</h3>

                  {/* Trade direction */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setTradeType('received')}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tradeType === 'received' ? 'bg-[#091426] text-white' : 'bg-[#f2f4f6] text-[#45474c]'}`}
                    >
                      They offered → I get proxies
                    </button>
                    <button
                      onClick={() => setTradeType('gave')}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tradeType === 'gave' ? 'bg-[#091426] text-white' : 'bg-[#f2f4f6] text-[#45474c]'}`}
                    >
                      I offered → They get proxies
                    </button>
                  </div>

                  {ledger.length === 0 ? (
                    <p className="text-xs text-[#75777d] text-center py-3">
                      Add contacts in Proxy Ledger first
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                      {ledger.map((contact) => (
                        <motion.div
                          key={contact.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedContact(contact.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                            selectedContact === contact.id
                              ? 'bg-[#f0f4ff] border-[#3b82f6]/30'
                              : 'hover:bg-[#f7f9fb] border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#d0e1fb] flex items-center justify-center font-bold text-[#091426] text-sm">
                              {contact.contact_name[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-[#091426]">{contact.contact_name}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedContact === contact.id ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-[#c5c6cd]'
                          }`}>
                            {selectedContact === contact.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Accept Trade CTA */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-12 flex flex-col items-center gap-4 py-4"
              >
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => tradeMutation.mutate()}
                  disabled={!selectedContact || tradeMutation.isPending}
                  className="bg-[#091426] text-white text-base font-bold px-12 py-4 rounded-xl ambient-shadow flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1e293b] transition-colors"
                >
                  {tradeMutation.isPending ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <ArrowLeftRight size={20} />}
                  Accept Trade
                </motion.button>
                <p className="text-xs text-[#9ca3af] italic text-center max-w-md">
                  "In the halls of academia, true currency isn't just grades — it's the strategic distribution of Maggi to those who hold the ledger."
                </p>
              </motion.div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="lg:col-span-12">
                <div className="bg-white border border-[#c5c6cd] rounded-2xl overflow-hidden ambient-shadow">
                  <div className="px-5 py-3 border-b border-[#f2f4f6] flex items-center gap-2">
                    <History size={15} className="text-[#45474c]" />
                    <h3 className="text-sm font-semibold text-[#091426]">Recent Calculations</h3>
                  </div>
                  {history.slice(0, 5).map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-5 py-3 border-b border-[#f2f4f6] last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-[#091426]">{h.subject_name}</p>
                        <p className="text-xs text-[#75777d]">{h.attended}/{h.total} · Target {h.target}% · {new Date(h.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#24a375]">+{h.can_miss} safe</p>
                        <p className="text-xs text-[#75777d]">{Math.round((h.attended / h.total) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    </AppShell>
  )
}
