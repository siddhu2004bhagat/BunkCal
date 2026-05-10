import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share, Plus } from 'lucide-react'
import { GraduationCap } from 'lucide-react'

// Detect platform
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function isAndroid() {
  return /android/i.test(navigator.userAgent)
}
function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const DISMISSED_KEY = 'bunkwise-install-dismissed'
const DISMISSED_UNTIL_KEY = 'bunkwise-install-dismissed-until'

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosStep, setIosStep] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return

    // Don't show if permanently dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return

    // Don't show if snoozed
    const until = localStorage.getItem(DISMISSED_UNTIL_KEY)
    if (until && Date.now() < parseInt(until)) return

    // Android: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPlatform('android')
      // Show after 3 seconds so it doesn't feel intrusive
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show manual instructions
    if (isIOS() && !isInStandaloneMode()) {
      setPlatform('ios')
      setTimeout(() => setShow(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (platform === 'android' && deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(DISMISSED_KEY, '1')
      }
      setShow(false)
    } else if (platform === 'ios') {
      setIosStep(true)
    }
  }

  const handleDismiss = (permanent = false) => {
    setShow(false)
    if (permanent) {
      localStorage.setItem(DISMISSED_KEY, '1')
    } else {
      // Snooze for 3 days
      localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000))
    }
  }

  if (!platform) return null

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop for iOS step */}
          {iosStep && (
            <motion.div
              className="fixed inset-0 bg-black/40 z-[200] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIosStep(false)}
            />
          )}

          {/* Main banner — slides up from bottom */}
          <motion.div
            className="fixed left-0 right-0 z-[200] md:hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          >
            <div className="mx-3 bg-[#091426] rounded-2xl overflow-hidden shadow-2xl">

              {/* iOS step-by-step instructions */}
              <AnimatePresence>
                {iosStep && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-white/10 overflow-hidden"
                  >
                    <div className="px-5 py-4">
                      <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">How to install on iOS</p>
                      <div className="space-y-3">
                        {[
                          { icon: <Share size={16} />, text: 'Tap the Share button at the bottom of Safari' },
                          { icon: <Plus size={16} />, text: 'Scroll down and tap "Add to Home Screen"' },
                          { icon: <Download size={16} />, text: 'Tap "Add" in the top right corner' },
                        ].map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                              {step.icon}
                            </div>
                            <p className="text-sm text-white/80">{step.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main content */}
              <div className="flex items-center gap-4 px-4 py-4">
                {/* App icon */}
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0">
                  <GraduationCap size={24} className="text-[#091426]" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">Install Bunkwise</p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {platform === 'ios'
                      ? 'Add to Home Screen for the best experience'
                      : 'Get the app — works offline, faster'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={handleInstall}
                    className="bg-white text-[#091426] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#f2f4f6] transition-colors"
                  >
                    {platform === 'ios' ? 'How?' : 'Install'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDismiss(false)}
                    className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-colors"
                  >
                    <X size={14} />
                  </motion.button>
                </div>
              </div>

              {/* "Don't show again" link */}
              <div className="px-4 pb-3 text-center">
                <button
                  onClick={() => handleDismiss(true)}
                  className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
                >
                  Don't show again
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
