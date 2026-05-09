import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

const icons = {
  success: <CheckCircle size={18} className="text-[#24a375]" />,
  error: <AlertCircle size={18} className="text-[#ba1a1a]" />,
  info: <Info size={18} className="text-[#505f76]" />,
  warning: <AlertTriangle size={18} className="text-amber-600" />,
}

const borders = {
  success: 'border-l-4 border-[#24a375]',
  error: 'border-l-4 border-[#ba1a1a]',
  info: 'border-l-4 border-[#505f76]',
  warning: 'border-l-4 border-amber-500',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`bg-white rounded-xl ambient-shadow-md px-4 py-3 flex items-start gap-3 ${borders[toast.type]}`}
          >
            <div className="mt-0.5 shrink-0">{icons[toast.type]}</div>
            <p className="text-sm text-[#191c1e] flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded hover:bg-[#f2f4f6] transition-colors"
            >
              <X size={14} className="text-[#75777d]" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
