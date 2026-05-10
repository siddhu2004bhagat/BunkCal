import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Scroll container — full screen, scrollable, clears bottom nav */}
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Centering wrapper */}
            <div className="flex min-h-full items-end sm:items-center justify-center p-4 sm:p-6">
              <motion.div
                className={`bg-white rounded-2xl w-full ${sizes[size]} ambient-shadow-lg overflow-hidden`}
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                onClick={e => e.stopPropagation()}
              >
                {title && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e8ea] sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-[#091426]">{title}</h3>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg hover:bg-[#f2f4f6] transition-colors"
                    >
                      <X size={18} className="text-[#45474c]" />
                    </button>
                  </div>
                )}
                <div className="p-6">{children}</div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
