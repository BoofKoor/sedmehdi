---
# Real project. Facts from the repo (github.com/BoofKoor/jozveyar, CLAUDE.md and infra, October 2026); confirm the role and add a start date.
title: "Jozveyar"
summary: "A website where students in Iran upload their course notes, see the exact price at once, and get them printed, bound and posted."
role: "Founder"
status: "In development"
stack: ["Next.js", "React", "TypeScript", "PostgreSQL", "Drizzle", "Redis", "Python", "LibreOffice", "Docker Compose"]
github: "https://github.com/BoofKoor/jozveyar"
demo: "https://jozveyar.com"
cover: { src: "/projects/jozveyar.webp", alt: "The Jozveyar home page: drop your notes and see the price right away" }
accent: "#4E5B43"   # a deeper tone of the brand #768468 (3.98:1 with white); white text 7.24:1
logo: { src: "/projects/logos/jozveyar.svg", bg: "#F3F5EF", tint: "#768468" }   # from the project repo; tint sampled from the logo
featured: true
order: 4
---

## The idea

Students in Iran study from printed course notes, called jozveh. Jozveyar (جزوه‌یار) lets university students, and students preparing for the konkur, the university entrance exam, upload their notes and see the exact price at once, with no signup, then receive them printed and bound, by post anywhere in Iran.

## What I built

- A Persian, right-to-left site in Next.js and React. Files go straight to object storage in chunks, and the browser shows the price from the same rules the server charges.
- A Python worker that converts Word, PowerPoint and photos to PDF with LibreOffice, finds the colour pages, and warns about low-resolution images and replaced fonts, with page numbers.
- PostgreSQL with Drizzle, Redis, and Garage for file storage, deployed with Docker Compose behind nginx. Every design decision is recorded as an ADR, 52 so far.

## Where it stands

The site is live at jozveyar.com. Online ordering opens next, with SMS sign-in and online payment.
