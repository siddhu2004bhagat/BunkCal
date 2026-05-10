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
      {/* 
        pt: header height (64px) + safe-area-top
        pb on mobile: bottom nav (72px) + safe-area-bottom + extra breathing room
        pb on desktop: just 32px
        pl on desktop: sidebar width (240px)
      */}
      <main
        className="md:pl-60"
        style={{
          paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* On desktop, remove the mobile bottom padding */}
        <style>{`@media (min-width: 768px) { main { padding-bottom: 2rem !important; } }`}</style>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}
