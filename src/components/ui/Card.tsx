import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', hover = false, onClick, padding = 'md' }: Props) {
  const base = `bg-white border border-[#c5c6cd] rounded-xl ambient-shadow ${paddings[padding]} ${className}`

  if (hover || onClick) {
    return (
      <motion.div
        className={`${base} cursor-pointer`}
        whileHover={{ y: -2, boxShadow: '0px 8px 24px rgba(30,41,59,0.08)' }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.18 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    )
  }

  return <div className={base}>{children}</div>
}
