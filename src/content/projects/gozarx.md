---
# Real project. Facts from Mehdi's notes (August 2026); confirm the numbers and the wording before publishing.
title: "GozarX"
summary: "A free, open-source service that gives people in Iran a working VPN config every day, through a Telegram bot and a website."
role: "Solo developer and operator"
status: "In production"
stack: ["Python", "aiogram 3", "FastAPI", "PostgreSQL", "Redis", "Docker Compose", "Next.js", "React"]
metric: { value: "119k", label: "Registered users" }
github: "https://github.com/BoofKoor/GozarX"
demo: "https://gozarx.net"
lab: "/lab/admin/?profile=vpn"   # the admin panel as a white-label demo with synthetic data (apps/admin-demo)
cover: { src: "/projects/gozarx.webp", alt: "The GozarX locations page, with the countries a free config is offered in" }
accent: "#020617"   # sampled from the site background; white text 20.17:1
logo: { src: "/projects/logos/gozarx.svg", bg: "#0B1222", tint: "#2563EB" }   # from the project repo; tint sampled from the logo
featured: true
order: 1
---

## The problem

Many people in Iran lose access to the open internet every day. The all-in-one apps meant to help often fail on Iranian mobile operators and stay connected only on the less restricted ones. A single working config, fresh every day and free, reaches more people.

## What I built

- A Telegram bot and a website, gozarx.net, where anyone can claim one free config a day, pick a location, and grow their daily allowance by inviting friends. No signup and no payments.
- A Python backend: aiogram 3 over webhooks with FastAPI, an arq worker, PostgreSQL with SQLAlchemy and Alembic, and Redis, behind nginx and installed with one script on Docker Compose.
- A React admin panel, a Next.js public site in Persian and English, and nightly database backups.

## Challenges

For a service like this, privacy comes first. I audited every place a user's IP address could end up, from web server logs to rate-limit keys in Redis and database backups, and planned how to remove or hash each one.

## Results

By August 2026: about 119,000 registered users, 47,000 active in any two-week window, around 10,000 configs delivered a day and 200 TB of traffic served. The code is open source under AGPL-3.0.
