# Telegram Bot for Ads KPIs (Faster than a Mini App)

**Why this is better than a Telegram Mini App:** Cam rejects Mini Apps because they require separate hosting, separate auth flow, separate deploy. A Telegram bot is **one curl command** away. The bot pulls text from `/api/ads/dashboard-summary` and posts to a chat. Gerardo runs `/ads` from his phone, gets a summary, done.

**Build effort:** 1-2 hours vs. 12-18 for a Mini App.

---

## What the bot does

When Gerardo texts the bot `/ads`, it returns a compact summary like:

```
📊 Arcan Ads — 2026-06-15

Today: 7 leads · $87 spent · $12.49 CPL
7d:   23 leads (↑ +18% WoW)
30d:  67 leads · 12 won · 18% close rate

Campaigns:
  Meta:   3 active · $60/day
  Google: 1 active · $5/day

Queue: 2 delayed emails due

Health: 6/8 ready
❌ APP_URL not set
⚠️ CAPI in test mode
```

That's the entire daily driver. Gerardo can run `/ads` from his phone in 3 seconds, see what's working, see what needs attention.

---

## Setup (1 hour)

### Step 1: Create the Telegram bot (5 min)
1. Open Telegram, search `@BotFather`
2. Send `/newbot`, follow prompts
3. Get the bot token (e.g., `123456:ABC-DEF...`)
4. Get the chat ID: send `/start` to your new bot, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your chat ID

### Step 2: Add a webhook route to the Arcan app (30 min)

The route should accept a `/ads` command and respond with the dashboard summary text. Two options:

#### Option A: Simple — direct integration with existing `/api/telegram/webhook`

Add a handler for the `/ads` command to the existing Telegram webhook route. The bot receives the command, calls `/api/ads/dashboard-summary` internally, and sends the text response.

```js
// Add to src/app/api/telegram/webhook/route.js (or wherever the existing handler is)
// Pseudo-code:
if (message.text === "/ads") {
  const res = await fetch(`${process.env.APP_URL}/api/ads/dashboard-summary`, {
    headers: { "x-cron-secret": process.env.CRON_SECRET },
  });
  const { text } = await res.json();
  await sendTelegramMessage(chatId, text, { parse_mode: "Markdown" });
  return;
}
```

#### Option B: Push-based — daily 8am summary

Set up a cron (in Coolify) to call the summary endpoint at 8am daily and push to the chat:

```bash
# Coolify cron job, runs daily at 8am
curl -H "x-cron-secret: $CRON_SECRET" \
  "$APP_URL/api/ads/dashboard-summary" | \
  jq -r '.text' | \
  curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=@-" \
    -d "parse_mode=Markdown"
```

This way Gerardo doesn't even need to text the bot — he gets the daily summary in his chat at 8am.

### Step 3: Add cron secret + bot token to Coolify env (5 min)

```
TELEGRAM_BOT_TOKEN=... from BotFather
TELEGRAM_CHAT_ID=... Gerardo's chat ID
CRON_SECRET=... already set (used by the dashboard-summary endpoint)
```

### Step 4: Test (5 min)

- Open the bot in Telegram, send `/start`
- Send `/ads`
- Verify the summary comes back

---

## Bot commands (extensible)

| Command | Response |
|---|---|
| `/ads` | Full daily summary (today, 7d, 30d, campaigns, queue, health) |
| `/ads leads` | Last 10 leads, regardless of source |
| `/ads meta` | Meta-only metrics: CPL, CTR, top creative |
| `/ads queue` | Pending delayed emails + their scheduled send time |
| `/ads health` | System health: pixel, CAPI, webhook, connections |
| `/ads spend` | Today's spend + projected month-end |
| `/ads weekly` | Last 7 days + week-over-week comparison + lead sources breakdown |

Build these out as the operator asks for them. Start with just `/ads` and add commands as needed.

---

## Why a bot, not a Mini App

| | Telegram Bot | Telegram Mini App |
|---|---|---|
| Build time | 1-2 hours | 12-18 hours |
| Deploy | curl command | New Coolify app + domain + TLS |
| Auth | Telegram handles it | OAuth + Telegram init data verification |
| Cam's stance | ✅ Approved (he uses Telegram already) | ❌ Rejected (separate infra) |
| Mobile UX | Top of chat, 3-tap access | Open app, wait for load |
| Notifications | Bot can push proactively | User must open the app |
| Maintenance | One route to update | Whole SPA to redeploy |

For daily KPIs, the bot is the right tool. Mini Apps win when you need rich interaction (forms, file uploads, multi-step flows). KPIs don't need that.

---

## Future: when a Mini App DOES make sense

Build a Mini App only when you need:
- Visual dashboards with charts (not just text)
- Real-time updating widgets
- User-editable workflows (A/B test config, campaign toggles)
- File uploads (creative assets)

For v1, none of these are needed. Bot covers the operator's daily check.

---

## Implementation (full code)

The full integration: add 3 things to the Arcan app.

### 1. The dashboard-summary endpoint (already in this kit, see `src-changes/api/ads/dashboard-summary/route.js`)

### 2. The Telegram bot handler (add to existing `src/app/api/telegram/webhook/route.js`)

See pseudo-code above. The actual implementation depends on how the existing webhook handles incoming messages.

### 3. The cron push (Coolify scheduled task)

A single shell command that runs at 8am, fetches the summary, and posts to Telegram. Add as a Coolify scheduled job (not a cron — see AGENTS.md note about cron avoidance, but this is a one-line pull-not-push, similar to the existing lead workflow).

Actually, the simplest deployment: a Coolify "Scheduled Task" that runs:
```bash
curl -sf -H "x-cron-secret: $CRON_SECRET" "$APP_URL/api/ads/dashboard-summary" | jq -r '.text' | curl -sf -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d "chat_id=$TELEGRAM_CHAT_ID" -d "text=@-" -d "parse_mode=Markdown" || echo "Dashboard push failed at $(date)" >> /var/log/ads-push.log
```

This is 1-2 hours of setup vs 12-18 hours for a Mini App. The result: Gerardo gets a daily summary at 8am, can also ask for `/ads` on demand. Same data, 10x faster to ship.

---

## When to do this

After launch (week 2+). Not blocking. The web dashboard at `/admin/marketing/ads-launch` covers the daily-driver need for v1. The bot is a nice-to-have for mobile access.
