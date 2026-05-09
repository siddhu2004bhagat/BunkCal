import { motion } from 'framer-motion'

interface Props {
  value: number
  max?: number
  color?: string
  height?: number
  animated?: boolean
  className?: string
}

export function ProgressBar({ value, max = 100, color = 'bg-[#091426]', height = 4, animated = true, className = '' }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={`w-full bg-[#e6e8ea] rounded-full overflow-hidden ${className}`}
      style={{ height }}
    >
      {animated ? (
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        />
      ) : (
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      )}
    </div>
  )
}
