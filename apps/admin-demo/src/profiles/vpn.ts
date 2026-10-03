/**
 * Passway, a VPN service: the GozarX panel's own metrics, in generic wording. No real figure is
 * reused: the magnitudes here are deliberately not GozarX's.
 */
import { g } from "@/data/gen";
import { SERVER_CITIES } from "@/data/names";

import { BRANDS } from "./brands";
import type { BusinessProfile } from "./types";

const L = (en: string, fa: string) => ({ en, fa });

const PLATFORMS = [
  { name: L("Android", "اندروید"), weight: 46 },
  { name: L("iOS", "iOS"), weight: 24 },
  { name: L("Windows", "ویندوز"), weight: 17 },
  { name: L("macOS", "macOS"), weight: 8 },
  { name: L("Linux", "لینوکس"), weight: 5 },
];

const STATUSES_USERS = [
  { id: "active", label: L("Active", "فعال"), tone: "success" as const, weight: 52 },
  { id: "idle", label: L("Idle", "بی‌فعالیت"), tone: "neutral" as const, weight: 40 },
  { id: "blocked", label: L("Blocked", "مسدود"), tone: "danger" as const, weight: 8 },
];

const STATUSES_SERVERS = [
  { id: "online", label: L("Online", "آنلاین"), tone: "success" as const, weight: 80 },
  { id: "degraded", label: L("Degraded", "کند"), tone: "warning" as const, weight: 12 },
  { id: "maintenance", label: L("Maintenance", "در حال تعمیر"), tone: "info" as const, weight: 8 },
];

export const vpn: BusinessProfile = {
  id: "vpn",
  brand: BRANDS.vpn,
  seed: 0x5a17e0,
  currency: "USD",
  reference: "2026-10-01",
  launched: "2025-02-10",
  week: [1.06, 0.97, 0.96, 0.97, 0.99, 1.03, 1.08],
  hours: [5, 3, 2, 1.5, 1.2, 1.4, 2.4, 4, 5.5, 6, 6.2, 6.5, 7, 6.8, 6.5, 6.6, 7.2, 8, 9.2, 10.4, 11, 10.6, 9, 7],
  series: {
    primary: { label: L("Configs issued", "کانفیگ‌های صادرشده"), unit: L("configs", "کانفیگ"), base: 2140, growth: 0.55, noise: 0.07 },
    secondary: { label: L("New users", "کاربران جدید"), unit: L("users", "کاربر"), base: 96, growth: 0.4, noise: 0.12 },
  },
  streams: {
    traffic: { from: "primary", ratio: 0.92 * 1024 ** 3, noise: 0.1 },
  },
  perActive: { day: 1.12, d7: 1.9, d90: 7.4 },
  copy: {
    chartTitle: L("Activity overview", "نمای کلی فعالیت"),
    chartSub: L("Configs issued and new users over the selected range", "کانفیگ‌های صادرشده و کاربران جدید در بازهٔ انتخابی"),
    sparkMetric: L("New users", "کاربران جدید"),
    health: L("Service health", "سلامت سرویس"),
  },
  kpis: [
    { id: "total", label: L("Total users", "کل کاربران"), format: "number", upIsGood: true, value: (s) => ({ value: s.total, previous: null }) },
    { id: "active", label: L("Active users, {days} days", "کاربران فعال، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.active, previous: s.prevActive }) },
    { id: "issued", label: L("Configs issued, {days} days", "کانفیگ صادرشده، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.cur("primary"), previous: s.prev("primary") }) },
    {
      id: "perUser",
      label: L("Configs per active user", "کانفیگ به ازای هر کاربر فعال"),
      format: "decimal",
      upIsGood: true,
      value: (s) => ({ value: s.cur("primary") / Math.max(1, s.active), previous: s.prev("primary") / Math.max(1, s.prevActive) }),
    },
  ],
  radar: [
    { label: L("Conversion", "تبدیل"), full: L("New users in this range who got a config", "کاربران جدید این بازه که کانفیگ گرفتند"), base: 74, spread: 6 },
    { label: L("Activation", "فعال‌سازی"), full: L("Got a config within 24 hours of signing up", "کانفیگ در ۲۴ ساعت اول پس از ثبت‌نام"), base: 66, spread: 7 },
    { label: L("Week-2 return", "بازگشت هفتهٔ دوم"), full: L("Came back in their second week", "در هفتهٔ دوم برگشتند"), base: 51, spread: 6 },
    { label: L("Repeat", "تکرار"), full: L("Users who took more than one config", "کاربرانی که بیش از یک کانفیگ گرفتند"), base: 58, spread: 5 },
  ],
  tops: [
    { label: L("Top location", "پرطرفدارترین لوکیشن"), unit: L("configs", "کانفیگ"), scope: "range", of: "primary", share: 1, items: SERVER_CITIES.slice(0, 8).map((c, i) => ({ name: c.name, weight: [30, 22, 14, 10, 8, 7, 5, 4][i] })) },
    { label: L("Top platform", "پلتفرم اول"), unit: L("users", "کاربر"), scope: "allTime", of: "secondary", share: 1, items: PLATFORMS },
    {
      label: L("Top inviter", "دعوت‌کنندهٔ برتر"),
      unit: L("invites", "دعوت"),
      scope: "allTime",
      of: "secondary",
      share: 0.012,
      mono: true,
      items: [
        { name: L("@kian.r", "@kian.r"), weight: 9 },
        { name: L("@sara.m7", "@sara.m7"), weight: 7 },
        { name: L("@omid.t", "@omid.t"), weight: 6 },
      ],
    },
  ],
  live: {
    online: { label: L("Online now", "آنلاین الان"), ofLabel: L("active this week", "فعال در این هفته"), share: 0.075 },
    today: { label: L("New users today", "کاربران جدید امروز"), ofLabel: L("this week", "این هفته") },
    lifetime: { label: L("Traffic carried", "ترافیک منتقل‌شده"), sub: L("since launch", "از زمان راه‌اندازی"), stream: "traffic", format: "bytes" },
  },
  health: [
    { id: "control", name: L("Control plane API", "API کنترل"), kind: "latency", base: 86, warn: 220, side: true, flaky: 0.05 },
    { id: "gateways", name: L("Edge gateways", "گیت‌وی‌های لبه"), kind: "nodes", base: 12, warn: 11, side: true, flaky: 0.08 },
    { id: "auth", name: L("Auth service", "سرویس احراز هویت"), kind: "latency", base: 42, warn: 150, side: true, flaky: 0.03 },
    { id: "conversion", name: L("Conversion, {days} days", "تبدیل، {days} روز"), kind: "percent", base: 74, warn: 50, side: true, flaky: 0 },
    { id: "webhook", name: L("Signup webhook", "وب‌هوک ثبت‌نام"), kind: "queue", base: 3, warn: 40, flaky: 0.04 },
    { id: "dns", name: L("DNS resolvers", "سرورهای DNS"), kind: "latency", base: 18, warn: 80, flaky: 0.02 },
  ],
  incidents: [
    { title: L("Higher latency on two European gateways", "تأخیر بالاتر روی دو گیت‌وی اروپایی"), service: "gateways", daysAgo: 4, minutes: 38 },
    { title: L("Signup webhook backlog after a deploy", "صف وب‌هوک ثبت‌نام پس از یک استقرار"), service: "webhook", daysAgo: 17, minutes: 22 },
    { title: L("Control plane restarted for an upgrade", "راه‌اندازی دوبارهٔ API کنترل برای ارتقا"), service: "control", daysAgo: 41, minutes: 9 },
  ],
  growth: {
    cumulative: L("Total users over time", "روند کل کاربران"),
    split: { title: L("New and returning users", "کاربران جدید و بازگشتی"), sub: L("People who took a config each day", "کسانی که هر روز کانفیگ گرفتند"), fresh: L("New", "جدید"), returning: L("Returning", "بازگشتی") },
    funnel: {
      title: L("Signup funnel", "قیف ثبت‌نام"),
      sub: L("From signing up to inviting a friend, this range", "از ثبت‌نام تا دعوت از یک دوست، در این بازه"),
      steps: [L("Signed up", "ثبت‌نام"), L("Got a config", "کانفیگ گرفت"), L("Came back", "برگشت"), L("Invited a friend", "دوستی را دعوت کرد")],
      rates: [0.74, 0.62, 0.21],
    },
  },
  retention: {
    title: L("Weekly retention", "ماندگاری هفتگی"),
    sub: L("Share of each signup week that took a config in each later week", "سهمی از هر هفتهٔ ثبت‌نام که در هفته‌های بعد کانفیگ گرفت"),
    curve: [0.8, 0.51, 0.3],
    distribution: {
      title: L("Configs per user", "کانفیگ به ازای هر کاربر"),
      sub: L("Active users in this range, by how many configs they took", "کاربران فعال این بازه، بر اساس تعداد کانفیگ"),
      buckets: [L("1", "۱"), L("2–3", "۲ تا ۳"), L("4–6", "۴ تا ۶"), L("7+", "۷ و بیشتر")],
      weights: [42, 31, 17, 10],
    },
  },
  behaviour: {
    heat: L("Configs issued", "کانفیگ‌های صادرشده"),
    segments: { title: L("Users by platform", "کاربران بر اساس پلتفرم"), sub: L("Share of configs issued in this range", "سهم از کانفیگ‌های این بازه"), items: PLATFORMS },
    list: { title: L("Busiest locations", "شلوغ‌ترین لوکیشن‌ها"), sub: L("Configs issued in this range", "کانفیگ صادرشده در این بازه"), items: SERVER_CITIES.slice(0, 6).map((c, i) => ({ name: c.name, weight: [30, 22, 14, 10, 8, 7][i] })) },
  },
  entities: [
    {
      id: "users",
      path: "users",
      label: L("Users", "کاربران"),
      things: L("users", "کاربران"),
      icon: "users",
      count: 240,
      statuses: STATUSES_USERS,
      filter: { column: "location", label: L("Location", "لوکیشن") },
      sort: { column: "seen", dir: "desc" },
      trend: { label: L("Configs per day", "کانفیگ در روز"), base: 1.2 },
      activity: [
        L("Took a config in {n} seconds", "در {n} ثانیه کانفیگ گرفت"),
        L("Switched location", "لوکیشن را عوض کرد"),
        L("Invited {n} friends", "{n} دوست را دعوت کرد"),
        L("Renewed the daily config", "کانفیگ روزانه را تمدید کرد"),
      ],
      columns: [
        { id: "user", label: L("User", "کاربر"), kind: "person", gen: (r) => g.person(r) },
        { id: "status", label: L("Status", "وضعیت"), kind: "status", gen: (r) => g.status(r, STATUSES_USERS) },
        { id: "location", label: L("Location", "لوکیشن"), kind: "enum", gen: (r) => r.pick(SERVER_CITIES.slice(0, 8)).name },
        { id: "platform", label: L("Platform", "پلتفرم"), kind: "enum", gen: (r) => g.weighted(r, PLATFORMS), secondary: true },
        { id: "configs", label: L("Configs", "کانفیگ‌ها"), kind: "number", gen: (r) => g.count(r, 14, 0.9, 1) },
        { id: "seen", label: L("Last seen", "آخرین بازدید"), kind: "ago", gen: (r, _row, c) => g.ago(r, c.now, 30) },
      ],
    },
    {
      id: "servers",
      path: "servers",
      label: L("Servers", "سرورها"),
      things: L("servers", "سرورها"),
      icon: "server",
      count: 36,
      statuses: STATUSES_SERVERS,
      filter: { column: "city", label: L("City", "شهر") },
      sort: { column: "load", dir: "desc" },
      trend: { label: L("Peak users per day", "اوج کاربران در روز"), base: 260 },
      activity: [
        L("Load balanced across {n} nodes", "بار روی {n} نود پخش شد"),
        L("Certificate renewed", "گواهی تمدید شد"),
        L("Kernel patched and rebooted", "هسته وصله و راه‌اندازی دوباره شد"),
        L("Health probe recovered", "بررسی سلامت برقرار شد"),
      ],
      columns: [
        { id: "server", label: L("Server", "سرور"), kind: "code", gen: (_r, _row, c) => `${SERVER_CITIES[c.index % SERVER_CITIES.length].code}-${Math.floor(c.index / SERVER_CITIES.length) + 1}` },
        { id: "city", label: L("City", "شهر"), kind: "enum", gen: (_r, _row, c) => SERVER_CITIES[c.index % SERVER_CITIES.length].name },
        { id: "status", label: L("Status", "وضعیت"), kind: "status", gen: (r) => g.status(r, STATUSES_SERVERS) },
        { id: "load", label: L("Load", "بار"), kind: "progress", gen: (r) => g.pct(r, 18, 92, 0) },
        { id: "online", label: L("Users online", "کاربران آنلاین"), kind: "number", gen: (r) => g.count(r, 120, 0.5, 4) },
        { id: "latency", label: L("Latency", "تأخیر"), kind: "ms", gen: (r) => Math.round(r.lognormal(48, 0.35)), secondary: true },
      ],
    },
  ],
};
