---
# Real project. Facts from the private repo (BoofKoor/telabzar: app/, website/, tests/, CI and docker-compose.yml, October 2026); every count was re-run on it.
# The repository is private and has no licence: no Source link, and it is not called open source. Confirm that telabzar.com is live and the status; no user figures until Mehdi gives them.
title: "Telabzar"
summary: "A Telegram bot that sends any file back with the tools for its type, from compressing a video to turning a PDF into Word."
role: "Product lead and operator"
status: "In production"
stack: ["Python", "aiogram 3", "PostgreSQL", "Redis", "ARQ", "FFmpeg", "LibreOffice", "Docker Compose", "Caddy"]
metric: { value: "31", label: "File operations" }
demo: "https://telabzar.com"
cover: { src: "/projects/telabzar.webp", alt: "The Telabzar bot in Telegram: a video sent back as a card with its size, quality and length, and a menu of 13 tools for it" }
device: "phone"
accent: "#0E4C90"   # a deeper tone of the brand blue #1689F2 (3.56:1 with white); white text 8.55:1 (6.08 under the strongest glow), the live light 4.23:1
logo: { src: "/projects/logos/telabzar.svg", bg: "#0795FD", tint: "#1690F4" }   # the toolbox from the project's logo on its disk blue, like the bot's own icon; tint is the logo's tool blue
featured: true
order: 3
---

## The idea

Telabzar (تل‌ابزار), whose name means Telegram tools, is a toolbox for files inside Telegram. Send it any file and it comes back as a card: the same file, with a menu of the tools for its type. Send a link to a post or a video and the downloaded file gets a card of its own. No app and no signup, in Persian first and in English.

## What I built

- **Cards, not commands.** Seven kinds of file get their own menu, 31 operations in all, from compressing and trimming video to OCR, Whisper transcripts and locking a PDF. Every job shows live progress and can be cancelled, and any file the bot has sent can be sent again from its history.
- **Persian PDF to Word.** Common PDF tools read "سلام" as "سالم", because they reverse the لا ligature. Telabzar reads each glyph and restores the reading order, with OCR for scanned pages, so the Word file can be edited.
- **One Python backend.** aiogram 3 and ARQ workers on Redis and PostgreSQL drive FFmpeg, LibreOffice and Tesseract in twelve Docker Compose services. A local Bot API server lets the bot handle files of up to 2 GB, and Caddy issues its own certificates.
- **A panel that runs the bot and its site.** A bilingual panel holds the settings, the users and every word the bot says, and publishes telabzar.com. Each tool's page there has a phone that replays the bot's real conversation in CSS alone, checked by tests against the bot's own code.

## How it is tested

Every pull request runs 3,438 automated tests in two parallel CI jobs, with the real FFmpeg, PDF tools and web server installed. A notebook of 814 sabotage cases breaks one piece of the code at a time and names the test that must fail, so a test that passes for the wrong reason gets caught. A checker built on the Unicode bidi rules catches any number that would slip to the wrong side of Persian text.

## Where it stands

The bot is in production, and its site, telabzar.com, went up in October 2026. Every change goes through a reviewed pull request: 152 so far.
