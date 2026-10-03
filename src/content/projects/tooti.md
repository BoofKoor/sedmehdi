---
# Real project. Facts from the repo (github.com/BoofKoor/tooti: package.json, routes, prisma, Caddyfile, October 2026); confirm the role and add a start date.
title: "Tooti"
summary: "An English-learning app for Persian speakers, in short, game-like lessons, built for the phone first."
role: "Solo developer"
status: "In development"
stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL", "Auth.js", "Docker Compose", "Caddy"]
github: "https://github.com/BoofKoor/tooti"
demo: "https://tooti.academy"
cover: { src: "/projects/tooti.webp", alt: "The Tooti welcome screen on a phone: Learn English with Tooti" }
device: "phone"
accent: "#09564F"   # a deeper tone of the brand teal #0fa294 (its ink #0a7268 gave the summary 4.20:1); white 8.55:1, amber light 4.16:1
logo: { src: "/projects/logos/tooti.svg", bg: "#F2FBF8", tint: "#1BB6A7" }   # from the project repo; tint sampled from the logo
featured: true
order: 2
---

## The idea

Tooti teaches English to Persian speakers in short, game-like lessons, in the style of Duolingo. It is built for the phone first and runs in the browser at tooti.academy.

## What I built

- A Next.js and React app styled with Tailwind, where every colour, space and motion comes from design tokens, with a page that shows all of them for review.
- Sign-in with Google or an email link through Auth.js, with users kept in PostgreSQL through Prisma.
- The main screens: a learning path, lessons, stories, study and vocabulary practice, and a profile, all behind sign-in.
- Deployed with Docker Compose behind Caddy.

## How I work on it

Design comes first. A styleguide page is the source of truth, a handoff document holds the stack and the tokens, and a roadmap splits the work into phases. Each phase gets a written spec, is built on a branch and reviewed against a checklist before the next one starts.
