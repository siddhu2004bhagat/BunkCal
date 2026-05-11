import { Router } from 'express'
import webpush from 'web-push'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { supabaseAdmin } from '../supabase'

const router = Router()

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@bunkwise.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

// GET /api/push/vapid-public-key — client fetches this to subscribe
router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
})

// POST /api/push/subscribe — save push subscription for a user
router.post('/subscribe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subscription } = req.body
    if (!subscription?.endpoint) {
      res.status(400).json({ error: 'Invalid subscription object' })
      return
    }

    // Upsert subscription (endpoint is unique per device/browser)
    const { error } = await db
      .from('push_subscriptions')
      .upsert({
        user_id: req.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('[Push] Subscribe error:', err)
    res.status(500).json({ error: 'Failed to save subscription' })
  }
})

// POST /api/push/unsubscribe — remove a push subscription
router.post('/unsubscribe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { endpoint } = req.body
    if (!endpoint) { res.status(400).json({ error: 'Missing endpoint' }); return }

    await db.from('push_subscriptions').delete().eq('endpoint', endpoint)
    res.json({ ok: true })
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err)
    res.status(500).json({ error: 'Failed to remove subscription' })
  }
})

// POST /api/push/send — internal: send push to a specific user
// Called by the notification watcher (not exposed to clients directly)
router.post('/send', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, title, body, url, tag } = req.body
    if (!userId || !title) { res.status(400).json({ error: 'Missing userId or title' }); return }

    await sendPushToUser(userId, { title, body, url, tag })
    res.json({ ok: true })
  } catch (err) {
    console.error('[Push] Send error:', err)
    res.status(500).json({ error: 'Failed to send push' })
  }
})

// ── Core helper: send Web Push to all subscriptions for a user ───────────────
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; url?: string; tag?: string; icon?: string }
) {
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subs?.length) return

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.tag || 'bunkwise',
    url: payload.url || '/notifications',
    vibrate: [200, 100, 200],
  })

  const results = await Promise.allSettled(
    subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushPayload
      ).catch(async (err: { statusCode?: number }) => {
        // 410 Gone = subscription expired, remove it
        if (err.statusCode === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        throw err
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  console.info(`[Push] Sent to ${sent}/${subs.length} subscriptions for user ${userId}`)
}

export default router
