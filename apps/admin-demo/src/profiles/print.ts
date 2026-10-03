/** Proofpost, a print-and-post shop: jobs, items printed, turnaround, paper stocks and parcels. */
import { g } from "@/data/gen";
import { CUSTOMER_CITIES } from "@/data/names";

import { BRANDS } from "./brands";
import type { BusinessProfile } from "./types";

const L = (en: string, fa: string) => ({ en, fa });

const PRODUCTS = [
  { name: L("Business cards", "کارت ویزیت"), weight: 30 },
  { name: L("Flyers", "تراکت"), weight: 22 },
  { name: L("Posters", "پوستر"), weight: 16 },
  { name: L("Stickers", "استیکر"), weight: 15 },
  { name: L("Booklets", "دفترچه"), weight: 10 },
  { name: L("Invitations", "کارت دعوت"), weight: 7 },
];

const PAPERS = [
  { name: L("Matte 350 g", "مات ۳۵۰ گرم"), weight: 34 },
  { name: L("Gloss 170 g", "براق ۱۷۰ گرم"), weight: 27 },
  { name: L("Recycled 120 g", "بازیافتی ۱۲۰ گرم"), weight: 21 },
  { name: L("Linen 300 g", "کتان ۳۰۰ گرم"), weight: 18 },
];

// A job's story, step by step (`story` on the jobs table).
const ARTWORK = L("Artwork uploaded", "طرح بارگذاری شد");
const PROOF = L("Proof sent for approval", "نمونه برای تأیید ارسال شد");
const APPROVED = L("Customer approved the proof", "مشتری نمونه را تأیید کرد");
const PRINTING = L("Printing started", "چاپ شروع شد");
const PACKED = L("Cut and packed {n} boxes", "{n} بسته برش و بسته‌بندی شد");

const STAGE = [
  { id: "proof", label: L("Proof", "نمونه"), tone: "info" as const, weight: 16 },
  { id: "printing", label: L("Printing", "در حال چاپ"), tone: "brand" as const, weight: 22 },
  { id: "finishing", label: L("Finishing", "تکمیل کار"), tone: "warning" as const, weight: 14 },
  { id: "posted", label: L("Posted", "ارسال‌شده"), tone: "success" as const, weight: 48 },
];

const CUSTOMER_TYPE = [
  { id: "business", label: L("Business", "شرکتی"), tone: "brand" as const, weight: 44 },
  { id: "personal", label: L("Personal", "شخصی"), tone: "neutral" as const, weight: 46 },
  { id: "agency", label: L("Agency", "آژانس"), tone: "info" as const, weight: 10 },
];

export const print: BusinessProfile = {
  id: "print",
  brand: BRANDS.print,
  seed: 0x9f1dd3,
  currency: "USD",
  reference: "2026-10-01",
  launched: "2025-01-06",
  week: [0.3, 1.14, 1.12, 1.1, 1.12, 0.98, 0.42],
  hours: [0.3, 0.2, 0.1, 0.1, 0.1, 0.3, 1, 3, 6.4, 8.8, 9.6, 9.2, 7.6, 8.2, 8.6, 8, 6.8, 5, 3.4, 2.6, 2, 1.6, 1, 0.6],
  series: {
    primary: { label: L("Jobs", "سفارش‌های چاپ"), unit: L("jobs", "سفارش"), base: 188, growth: 0.42, noise: 0.1 },
    secondary: { label: L("New customers", "مشتریان جدید"), unit: L("customers", "مشتری"), base: 26, growth: 0.3, noise: 0.16 },
  },
  streams: {
    items: { from: "primary", ratio: 142, noise: 0.12 },
    turnaround: { from: "primary", ratio: 19.4, noise: 0.09, kind: "level" },
    parcels: { from: "primary", ratio: 0.93, noise: 0.05 },
  },
  perActive: { day: 1.1, d7: 1.3, d90: 2.6 },
  copy: {
    chartTitle: L("Production overview", "نمای کلی تولید"),
    chartSub: L("Print jobs and new customers over the selected range", "سفارش‌های چاپ و مشتریان جدید در بازهٔ انتخابی"),
    sparkMetric: L("New customers", "مشتریان جدید"),
    health: L("Production health", "سلامت تولید"),
  },
  kpis: [
    { id: "total", label: L("Customers", "مشتریان"), format: "number", upIsGood: true, value: (s) => ({ value: s.total, previous: null }) },
    { id: "jobs", label: L("Jobs, {days} days", "سفارش‌ها، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.cur("primary"), previous: s.prev("primary") }) },
    { id: "items", label: L("Items printed, {days} days", "اقلام چاپ‌شده، {days} روز"), format: "compact", upIsGood: true, value: (s) => ({ value: s.cur("items"), previous: s.prev("items") }) },
    { id: "turnaround", label: L("Average turnaround", "میانگین زمان تحویل"), format: "hours", upIsGood: false, value: (s) => ({ value: s.cur("turnaround"), previous: s.prev("turnaround") }) },
  ],
  radar: [
    { label: L("On-time dispatch", "ارسال به‌موقع"), full: L("Jobs posted by the promised day", "سفارش‌هایی که تا روز وعده‌داده پست شدند"), base: 88, spread: 4 },
    { label: L("Reorders", "سفارش دوباره"), full: L("Customers who ordered again within 90 days", "مشتریانی که ظرف ۹۰ روز دوباره سفارش دادند"), base: 52, spread: 5 },
    { label: L("First-pass quality", "کیفیت در اولین چاپ"), full: L("Jobs printed without a reprint", "سفارش‌هایی که بدون چاپ دوباره انجام شدند"), base: 94, spread: 2 },
    { label: L("Proofs within 24h", "نمونهٔ زیر ۲۴ ساعت"), full: L("Proofs approved within a day", "نمونه‌هایی که ظرف یک روز تأیید شدند"), base: 71, spread: 6 },
  ],
  tops: [
    { label: L("Top product", "محصول اول"), unit: L("jobs", "سفارش"), scope: "range", of: "primary", share: 1, items: PRODUCTS },
    { label: L("Top paper stock", "کاغذ اول"), unit: L("jobs", "سفارش"), scope: "range", of: "primary", share: 1, items: PAPERS },
    { label: L("Top destination", "مقصد اول"), unit: L("parcels", "مرسوله"), scope: "allTime", of: "secondary", share: 2.1, items: CUSTOMER_CITIES.map((name, i) => ({ name, weight: [28, 14, 12, 10, 9, 8, 6, 5, 3, 2, 2, 1][i] })) },
  ],
  live: {
    online: { label: L("Customers online", "مشتریان آنلاین"), ofLabel: L("active this week", "فعال در این هفته"), share: 0.06 },
    today: { label: L("New customers today", "مشتریان جدید امروز"), ofLabel: L("this week", "این هفته") },
    lifetime: { label: L("Parcels posted", "مرسوله‌های ارسال‌شده"), sub: L("since launch", "از زمان راه‌اندازی"), stream: "parcels", format: "number" },
  },
  health: [
    { id: "intake", name: L("Order intake", "دریافت سفارش"), kind: "latency", base: 132, warn: 420, side: true, flaky: 0.04 },
    { id: "printqueue", name: L("Print queue", "صف چاپ"), kind: "queue", base: 18, warn: 90, side: true, flaky: 0.05 },
    { id: "labels", name: L("Shipping label API", "API برچسب ارسال"), kind: "latency", base: 245, warn: 800, side: true, flaky: 0.06 },
    { id: "presses", name: L("Presses online", "دستگاه‌های چاپ آنلاین"), kind: "nodes", base: 6, warn: 5, side: true, flaky: 0.07 },
    { id: "payments", name: L("Payments", "پرداخت"), kind: "latency", base: 286, warn: 900, flaky: 0.04 },
  ],
  incidents: [
    { title: L("Press 3 paused for maintenance", "توقف دستگاه ۳ برای سرویس"), service: "presses", daysAgo: 2, minutes: 140 },
    { title: L("Shipping labels failed to print", "خطا در چاپ برچسب ارسال"), service: "labels", daysAgo: 15, minutes: 36 },
    { title: L("Order uploads slow for large PDFs", "کندی بارگذاری سفارش برای PDFهای حجیم"), service: "intake", daysAgo: 38, minutes: 52 },
  ],
  growth: {
    cumulative: L("Customers over time", "روند مشتریان"),
    split: { title: L("New and returning customers", "مشتریان جدید و بازگشتی"), sub: L("Customers with a job each day", "مشتریانی که هر روز سفارشی داشتند"), fresh: L("New", "جدید"), returning: L("Returning", "بازگشتی") },
    funnel: {
      title: L("Order funnel", "قیف سفارش"),
      sub: L("From uploading a design to ordering again, this range", "از بارگذاری طرح تا سفارش دوباره، در این بازه"),
      steps: [L("Uploaded a design", "طرح بارگذاری کرد"), L("Approved the proof", "نمونه را تأیید کرد"), L("Paid", "پرداخت کرد"), L("Ordered again", "دوباره سفارش داد")],
      rates: [0.83, 0.9, 0.41],
    },
  },
  retention: {
    title: L("Weekly retention", "ماندگاری هفتگی"),
    sub: L("Share of each first-order week that ordered again in each later week", "سهمی از هر هفتهٔ اولین سفارش که در هفته‌های بعد دوباره سفارش داد"),
    curve: [0.88, 0.14, 0.06],
    distribution: {
      title: L("Jobs per customer", "سفارش به ازای هر مشتری"),
      sub: L("Customers in this range, by how many jobs they ordered", "مشتریان این بازه، بر اساس تعداد سفارش"),
      buckets: [L("1", "۱"), L("2", "۲"), L("3–5", "۳ تا ۵"), L("6+", "۶ و بیشتر")],
      weights: [61, 21, 13, 5],
    },
  },
  behaviour: {
    heat: L("Jobs", "سفارش‌ها"),
    segments: { title: L("Jobs by product", "سفارش‌ها بر اساس محصول"), sub: L("Share of jobs in this range", "سهم از سفارش‌های این بازه"), items: PRODUCTS },
    list: { title: L("Paper stocks used", "کاغذهای مصرفی"), sub: L("Jobs printed on each, this range", "سفارش چاپ‌شده روی هر کدام، در این بازه"), items: PAPERS },
  },
  entities: [
    {
      id: "jobs",
      path: "jobs",
      label: L("Jobs", "سفارش‌ها"),
      things: L("jobs", "سفارش‌ها"),
      icon: "package",
      count: 240,
      statuses: STAGE,
      filter: { column: "product", label: L("Product", "محصول") },
      sort: { column: "due", dir: "asc" },
      story: {
        proof: [ARTWORK, PROOF],
        printing: [ARTWORK, PROOF, APPROVED, PRINTING],
        finishing: [ARTWORK, PROOF, APPROVED, PRINTING, PACKED],
        posted: [ARTWORK, PROOF, APPROVED, PRINTING, PACKED, L("Posted, tracking number created", "پست شد و شمارهٔ رهگیری ساخته شد")],
      },
      columns: [
        { id: "job", label: L("Job", "سفارش"), kind: "code", gen: (_r, _row, c) => g.code("JOB", 7720, c.index, 1) },
        { id: "customer", label: L("Customer", "مشتری"), kind: "person", gen: (r) => g.person(r) },
        { id: "product", label: L("Product", "محصول"), kind: "enum", gen: (r) => g.weighted(r, PRODUCTS) },
        { id: "qty", label: L("Quantity", "تعداد"), kind: "number", gen: (r) => g.count(r, 250, 0.9, 1) },
        { id: "status", label: L("Stage", "مرحله"), kind: "status", gen: (r) => g.status(r, STAGE) },
        { id: "due", label: L("Due", "موعد"), kind: "due", gen: (r, _row, c) => g.ahead(r, c.now, 5), secondary: true },
      ],
    },
    {
      id: "customers",
      path: "customers",
      label: L("Customers", "مشتریان"),
      things: L("customers", "مشتریان"),
      icon: "heart",
      count: 200,
      statuses: CUSTOMER_TYPE,
      filter: { column: "city", label: L("City", "شهر") },
      sort: { column: "spend", dir: "desc" },
      trend: { label: L("Jobs per day", "سفارش در روز"), base: 1, total: "jobs" },
      span: { to: "last" },
      activity: [
        L("Uploaded {n} new designs", "{n} طرح تازه بارگذاری کرد"),
        L("Saved a reorder template", "یک الگوی سفارش دوباره ذخیره کرد"),
        L("Added a second delivery address", "نشانی تحویل دوم اضافه کرد"),
        L("Rated the last job five stars", "به سفارش قبلی پنج ستاره داد"),
      ],
      columns: [
        { id: "customer", label: L("Customer", "مشتری"), kind: "person", gen: (r, _row, c) => g.person(r, c.index) },
        { id: "city", label: L("City", "شهر"), kind: "enum", gen: (r) => g.pick(r, CUSTOMER_CITIES) },
        { id: "status", label: L("Type", "نوع"), kind: "status", gen: (r) => g.status(r, CUSTOMER_TYPE) },
        { id: "jobs", label: L("Jobs", "سفارش‌ها"), kind: "number", gen: (r) => g.count(r, 3, 0.9, 1) },
        { id: "spend", label: L("Spend", "مجموع خرید"), kind: "money", gen: (r, row) => Math.round(g.money(r, 46, 0.5) * (row.jobs as number) * 100) / 100 },
        { id: "last", label: L("Last job", "آخرین سفارش"), kind: "ago", gen: (r, _row, c) => g.ago(r, c.now, 90), secondary: true },
      ],
    },
  ],
};
