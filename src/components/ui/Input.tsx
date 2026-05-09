import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, icon, suffix, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold tracking-wider uppercase text-[#45474c] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75777d]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-white border rounded px-4 py-2.5 text-sm text-[#191c1e]
              placeholder:text-[#75777d] outline-none transition-all duration-150
              focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-[#ba1a1a] focus:border-[#ba1a1a] focus:ring-[#ba1a1a]/10' : 'border-[#c5c6cd]'}
              ${icon ? 'pl-10' : ''}
              ${suffix ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#75777d] text-sm">
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[#ba1a1a]">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-[#75777d]">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
