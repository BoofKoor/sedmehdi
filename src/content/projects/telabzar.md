---
# Real project. Facts from the private repo (BoofKoor/telabzar: app/, website/, tests/, CI and docker-compose.yml, October 2026); every count was re-run on it.
# The repository is private and has no licence: no Source link, and it is not called open source. Confirm that telabzar.com is live and the status; no user figures until Mehdi gives them. The cover is the phone on telabzar.com, not a Telegram screenshot.
title: "Telabzar"
summary: "A Telegram bot that sends files back with the tools for each type, from compressing a video to turning a PDF into Word."
role: "Product lead and operator"
status: "In production"
stack: ["Python", "aiogram 3", "FFmpeg", "Redis", "PostgreSQL", "arq", "LibreOffice", "Caddy", "Docker Compose"]
metric: { value: "31", label: "File operations" }
demo: "https://telabzar.com"
cover: { src: "/projects/telabzar.webp", alt: "The Telabzar bot as the phone on telabzar.com plays it: a video the bot has just compressed, sent back as a card with its size, quality and length, and a Persian menu of 13 tools for it" }
device: "phone"
accent: "#0E4C90"   # a deeper tone of the brand blue #1689F2 (3.56:1 with white); white text 8.55:1 (6.08 under the strongest glow), the live light 4.23:1
logo: { src: "/projects/logos/telabzar.svg", bg: "#0795FD", tint: "#1690F4" }   # the toolbox from the project's logo on the middle stop of its disk gradient, like the bot's own icon (white box 3.12:1 on it); tint is the logo's tool blue
featured: true
order: 3
---

## The idea

Telabzar (<span lang="fa">تل‌ابزار</span>, abzar is Persian for tools) is a toolbox for files inside Telegram. Send it a file and it comes back as a card: the same file, with a menu of the tools for its type. Links to posts and videos work too: the bot downloads them. No app and no signup, in Persian by default and in English.

## What I built

- **A menu for every file.** Seven kinds of file get their own menu, 31 operations in all, from compressing and trimming video to OCR, Whisper transcripts and locking a PDF. Long jobs show live progress, and encodes, most PDF work, transcripts and downloads can be stopped midway. Since October, the files the bot sends can be sent again from its history.
- **Persian PDF to Word.** Poppler's pdftotext, a common PDF tool, reads "<span lang="fa">سلام</span>" (salam, hello) as "<span lang="fa">سالم</span>" (salem, healthy), because it reverses the ligature of lam and alef (<span lang="fa">لا</span>). Telabzar reads each glyph and restores the reading order, with OCR for scanned pages, so the Word file can be edited.
- **One Python backend.** An aiogram 3 bot and arq workers share Redis and PostgreSQL, and the workers drive FFmpeg, LibreOffice and Tesseract. The whole stack runs as 12 Docker Compose services: a local Bot API server lets the bot take in files of any size and send back new ones of up to 2 GB, and Caddy gets and renews its own certificates.
- **A panel for the bot and its site.** A bilingual panel edits the bot's texts and buttons, manages its settings and users, and publishes telabzar.com. Each tool's page there has a phone that plays the bot's conversation in CSS alone, built from the bot's messages and keyboards and tested against its code.

## How it is tested

By mid-October 2026 there are 3,438 tests and 814 sabotage cases. Since mid-August, every pull request runs the tests in two parallel CI jobs, and one of them now installs the real FFmpeg, PDF tools and Caddy. The sabotage cases, rerun by hand, each break one piece of the project and name the test that should catch it or, for the 26 controls, the tests that must stay green. They have caught tests that passed for the wrong reason. A checker built on the Unicode bidi rules guards one known trap, a number that jumps across a middle dot to the Latin word before it and scrambles a Persian line, in the bot's file lists and progress notes and on every phone of the site.

## Where it stands

The bot is in production, and its site, telabzar.com, went up in October 2026. Every change to the repository so far has come through a pull request, 152 of them by mid-October.
