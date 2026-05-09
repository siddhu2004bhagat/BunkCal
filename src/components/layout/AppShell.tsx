import type { ReactNode } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '@/components/ui/Toast'

interface Props {
  children: ReactNode
  title?: string
  showBack?: boolean
}

export function AppShell({ children, title, showBack }: Props) {
  return (
    <div className="min-h-dvh bg-[#f7f9fb]">
      <Header title={title} showBack={showBack} />
      <Sidebar />
      <main className="pt-16 pb-24 md:pb-8 md:pl-60">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}
