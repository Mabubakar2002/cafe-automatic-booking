import fs from 'fs'
import path from 'path'

// ─── WhatsApp sender (UltraMsg API — free tier 500 msg/month) ─────────────────
// Setup: https://ultramsg.com → Sign up → Create Instance → Get Token + Instance ID
// Then add to .env.local:
//   ULTRAMSG_INSTANCE=instance12345
//   ULTRAMSG_TOKEN=yourtoken
//
// Alternative (Meta Cloud API — official, 1000 free/month):
//   WHATSAPP_PHONE_NUMBER_ID=your_phone_id
//   WHATSAPP_TOKEN=your_bearer_token
// ─────────────────────────────────────────────────────────────────────────────

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const rawPhone = phone.replace(/\D/g, '')
  // Convert 03xx → 923xx for international format
  const intlPhone = rawPhone.startsWith('0')
    ? (process.env.DEFAULT_COUNTRY_CODE || '92') + rawPhone.slice(1)
    : rawPhone

  if (!/^\d{10,15}$/.test(intlPhone)) {
    console.warn('[WhatsApp] Invalid phone number, skipping:', phone)
    return
  }

  // ── 1. UltraMsg (easiest, free 500/month) ─────────────────────────────────
  const ultraInstance = process.env.ULTRAMSG_INSTANCE
  const ultraToken = process.env.ULTRAMSG_TOKEN
  if (ultraInstance && ultraToken) {
    try {
      const body = new URLSearchParams({
        token: ultraToken,
        to: intlPhone,
        body: message,
      })
      const res = await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      const json = await res.json()
      if (json.sent === 'true' || json.id) {
        console.log(`[WhatsApp UltraMsg] ✅ Sent to ${intlPhone}`)
        return
      }
      console.warn('[WhatsApp UltraMsg] Response:', json)
    } catch (err) {
      console.error('[WhatsApp UltraMsg Error]:', err)
    }
  }

  // ── 2. Meta WhatsApp Cloud API (official, 1000 free/month) ────────────────
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const metaToken = process.env.WHATSAPP_TOKEN
  if (metaPhoneId && metaToken) {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: intlPhone,
          type: 'text',
          text: { body: message },
        }),
      })
      const json = await res.json()
      if (json.messages?.[0]?.id) {
        console.log(`[WhatsApp Meta] ✅ Sent to ${intlPhone}`)
        return
      }
      console.warn('[WhatsApp Meta] Response:', json)
    } catch (err) {
      console.error('[WhatsApp Meta Error]:', err)
    }
  }

  // ── 3. Generic Webhook fallback ────────────────────────────────────────────
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: intlPhone, message }),
      })
      console.log(`[WhatsApp Webhook] ✅ Sent to ${intlPhone}`)
      return
    } catch {}
  }

  // ── 4. No API configured — log only ───────────────────────────────────────
  console.log(`[WhatsApp NOT CONFIGURED] Would send to ${intlPhone}:`)
  console.log(`   "${message}"`)
  console.log(`   → Add ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN to .env.local to enable auto WhatsApp`)
}

// ─── Main notify function ──────────────────────────────────────────────────────
export async function notify(event: string, data: Record<string, unknown>) {
  const cafe = process.env.NEXT_PUBLIC_CAFE_NAME || 'Cafe'
  const customerName = (data.name as string) || 'Valued Customer'
  const phone = (data.phone as string) || ''
  const rating = data.rating as number | undefined
  const comment = data.comment as string | undefined
  const time = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })

  // Build message per event
  let message = ''
  if (event === 'thanks') {
    message =
      `✨ *${cafe}*\n\n` +
      `Assalam o Alaikum ${customerName}! 🙏\n\n` +
      `Aapka shukriya jo aap ne hamare saath waqt guzara. ` +
      `Hum umeed karte hain ke aapko achi service mili. ` +
      `Dobara zaroor aayen! ❤️\n\n` +
      `📍 ${cafe} Team\n⏰ ${time}`
  } else if (event === 'feedback') {
    const stars = '⭐'.repeat(Math.min(5, rating ?? 0))
    message =
      `🌟 *${cafe} — Shukriya!*\n\n` +
      `${customerName} aapka feedback mila:\n` +
      `Rating: ${stars} (${rating}/5)\n` +
      (comment ? `Aapki baat: "${comment}"\n\n` : '\n') +
      `Aapki rai hamein aur behtar banane mein madad karti hai. ` +
      `Aap hamesha hamare khaas mehman hain! 🤗\n\n` +
      `Dobara tahrif layen — ${cafe} Team`
  } else {
    message = `📢 ${cafe}: ${event} — ${customerName}`
  }

  // ── Log to console ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(55)}`)
  console.log(`📢 [${event.toUpperCase()}] ${cafe} → ${customerName} (${phone || 'no phone'})`)
  console.log(`💬 ${message.split('\n')[0]}`)
  console.log(`${'═'.repeat(55)}\n`)

  // ── Log to file ────────────────────────────────────────────────────────────
  try {
    const logDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const entry = `[${new Date().toISOString()}] [${event}] ${customerName} (${phone})\n${message}\n---\n`
    fs.appendFileSync(path.join(logDir, 'notifications.log'), entry)
  } catch {}

  // ── Send WhatsApp if phone exists ─────────────────────────────────────────
  if (phone) {
    await sendWhatsApp(phone, message)
  }
}
