# KPI Dashboard — Telegram Bot (Not Mini App)

**Date:** 2026-06-01  
**Approach:** Telegram bot, not Mini App.

## Why we switched from Mini App to bot

Original spec: build a Telegram Mini App (React + Vite SPA, Coolify deploy, BotFather registration, 12-18 hours of work). After review:

- Cam rejects Mini Apps because they require separate infra (Coolify app + domain + TLS)
- A Telegram bot is 1-2 hours of work, uses the existing infra, and gets the same data
- A bot is actually **better** for KPIs because it can push proactively (daily 8am summary) — a Mini App requires the user to open it
- For daily-driver metrics, text beats UI. The dashboard has 4 numbers. A bot message shows them in 3 lines.

So: built a text endpoint (`/api/ads/dashboard-summary`) that returns a compact, human-readable summary. A Telegram bot pulls this and posts it. A cron pushes it daily.

## Architecture

```
[Coolify cron, daily 8am]
        ↓
curl /api/ads/dashboard-summary
        ↓
[text response]
        ↓
Telegram Bot API → Gerardo's chat
```

OR (interactive):

```
Gerardo: /ads
        ↓
Telegram bot webhook → /api/telegram/handle
        ↓
fetch /api/ads/dashboard-summary
        ↓
text response → sendMessage → Gerardo's chat
```

## What was built

### Code (in source repo)
- `src/app/api/ads/dashboard-summary/route.js` — the endpoint
- Returns both human-readable `.text` and structured `.data` JSON
- Auth: x-cron-secret OR admin

### Doc
- `TELEGRAM-BOT-SETUP.md` in this kit — full setup guide, bot token + chat ID setup, cron push command, command extensions

## What was NOT built

- Telegram bot itself (1-2 hours; Coolify cron + bot token in env)
- The /ads webhook handler in `telegram/webhook/route.js` (15 min; add a case for the /ads command)
- Coolify scheduled task (5 min; one line in Coolify UI)

These are all manual setup steps that need a human. Total human time: 1-2 hours.

## When to build the bot

After launch (week 2+). The web dashboard at `/admin/marketing/ads-launch` covers the v1 daily driver. The bot is for:
- Mobile access (Gerardo in the truck, in a job site)
- Proactive daily summary (bot pushes to him, he doesn't have to remember to check)
- Quick command (text `/ads` to a chat vs. opening a browser)

If those use cases don't apply, skip the bot entirely. The web dashboard is sufficient.

## Original Mini App spec (for reference)

The full spec from the round 2 audit is preserved in git history. It's a valid approach if:
- You need visual charts/graphs (not just text)
- You need user-editable workflows
- You're building a SaaS where the operator logs in multiple times a day

For a single-operator painting business, the bot is the right tool. The Mini App would be over-engineering.

## If you change your mind later

The dashboard-summary endpoint is a building block. You can:
- Add chart endpoints (`/api/ads/timeseries?metric=cpl&range=30d`)
- Add a JSON variant (`?format=json` for programmatic access)
- Plug it into any frontend (Grafana, Retool, internal admin)

The text interface is the simplest, but the data is structured for any consumer.
