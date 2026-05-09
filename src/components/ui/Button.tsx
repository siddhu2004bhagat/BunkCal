import { motion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variants = {
  primary: 'bg-[#091426] text-white hover:bg-[#1e293b] active:bg-[#0f172a]',
  secondary: 'bg-transparent border border-[#c5c6cd] text-[#191c1e] hover:bg-[#f2f4f6]',
  ghost: 'bg-transparent text-[#091426] hover:bg-[#eceef0]',
  danger: 'bg-[#ba1a1a] text-white hover:bg-[#93000a]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded',
  md: 'px-5 py-2.5 text-sm font-semibold rounded',
  lg: 'px-6 py-3 text-base font-semibold rounded',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.12 }}
      className={`inline-flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...(props as object)}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </motion.button>
  )
}
