---
# Real project. Facts from the private repo (BoofKoor/telabzar: app/, website/, tests/, CI and docker-compose.yml, October 2026); every count was re-run on it.
# The repository is private and has no licence: no Source link, and it is not called open source. Confirm that telabzar.com is live and the status; no user figures until Mehdi gives them. The cover is the phone on telabzar.com, not a Telegram screenshot.
title: "Telabzar"
summary: "A Telegram bot that sends any file back with the tools for its type, from compressing a video to turning a PDF into Word."
role: "Product lead and operator"
status: "In production"
stack: ["Python", "aiogram 3", "FFmpeg", "Redis", "PostgreSQL", "arq", "LibreOffice", "Caddy", "Docker Compose"]
metric: { value: "31", label: "File operations" }
demo: "https://telabzar.com"
cover: { src: "/projects/telabzar.webp", alt: "The Telabzar bot as the phone on telabzar.com plays it: a video sent back as a card with its size, quality and length, and a menu of 13 tools for it" }
device: "phone"
accent: "#0E4C90"   # a deeper tone of the brand blue #1689F2 (3.56:1 with white); white text 8.55:1 (6.08 under the strongest glow), the live light 4.23:1
logo: { src: "/projects/logos/telabzar.svg", bg: "#0795FD", tint: "#1690F4" }   # the toolbox from the project's logo on the middle stop of its disk gradient, like the bot's own icon (white box 3.12:1 on it); tint is the logo's tool blue
featured: true
order: 3
---

## The idea

Telabzar (<span lang="fa">تل‌ابزار</span>, abzar is Persian for tools) is a toolbox for files inside Telegram. Send it any file and it comes back as a card: the same file, with a menu of the tools for its type. Send a link to a post or a video and the download comes back too, a single file as a card of its own. No app and no signup, in Persian first and in English.

## What I built

- **A menu for every file.** Seven kinds of file get their own menu, 31 operations in all, from compressing and trimming video to OCR, Whisper transcripts and locking a PDF. Every job shows live progress, the long ones can be cancelled, and the files the bot sends can be sent again from its history.
- **Persian PDF to Word.** Poppler's pdftotext, a common PDF tool, reads "<span lang="fa">سلام</span>" (salam, hello) as "<span lang="fa">سالم</span>" (salem, healthy), because it reverses the lam-alef (<span lang="fa">لا</span>) ligature. Telabzar reads each glyph and restores the reading order, with OCR for scanned pages, so the Word file can be edited.
- **One Python backend.** aiogram 3 and arq workers on Redis and PostgreSQL drive FFmpeg, LibreOffice and Tesseract in twelve Docker Compose services. A local Bot API server lets the bot handle files of up to 2 GB, and Caddy gets and renews its own certificates.
- **A panel that runs the bot and its site.** A bilingual panel holds the settings, the users and the bot's texts and buttons, and publishes telabzar.com. Each tool's page there has a phone that plays the bot's conversation in CSS alone, built from the bot's messages and keyboards and tested against its code.

## How it is tested

Every pull request runs the full suite in two parallel CI jobs: 3,438 tests by October 2026, with the real FFmpeg, PDF tools and Caddy installed in one of them. A notebook of 814 sabotage cases, replayed by hand, breaks one piece of the code at a time and names the test that must catch it. It has caught tests that passed for the wrong reason. A checker built on the Unicode bidi rules catches a number that would join the Latin word before it in a Persian list line, in the bot's lists and progress notes and on the site's phones.

## Where it stands

The bot is in production, and its site, telabzar.com, went up in October 2026. Every change goes through a pull request: 152 so far.
