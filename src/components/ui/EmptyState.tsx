import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#f2f4f6] flex items-center justify-center mb-4 text-[#75777d]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#091426] mb-2">{title}</h3>
      <p className="text-sm text-[#45474c] max-w-xs mb-6">{description}</p>
      {action}
    </motion.div>
  )
}
