/**
 * Nodemill, a cloud and VPS host: servers delivered, orders, recurring revenue and churn.
 *
 * Every KPI is read from the same streams, so the figures agree with one another and with the
 * charts: the servers running are the servers delivered minus the servers deleted since launch,
 * MRR is those servers at the average monthly price, AOV is revenue over orders, and churn is the
 * customers lost in the window over the customers there were when it began.
 */
import { g } from "@/data/gen";
import { DATACENTERS } from "@/data/names";

import { BRANDS } from "./brands";
import type { BusinessProfile, GenContext, WindowStats } from "./types";

const L = (en: string, fa: string) => ({ en, fa });
const DAY = 86_400_000;

/** Plans: product names, Latin in both languages, and their monthly price. */
const PLANS = [
  { name: L("Cloud S", "Cloud S"), weight: 34, price: 5.9 },
  { name: L("Cloud M", "Cloud M"), weight: 30, price: 11.9 },
  { name: L("Cloud L", "Cloud L"), weight: 17, price: 23.9 },
  { name: L("Cloud XL", "Cloud XL"), weight: 8, price: 47.9 },
  { name: L("Dedicated D1", "Dedicated D1"), weight: 7, price: 89 },
  { name: L("GPU G1", "GPU G1"), weight: 4, price: 189 },
];
/** The weighted average monthly price of a server: what MRR is counted at. */
const AVG_PRICE = PLANS.reduce((s, p) => s + p.price * p.weight, 0) / PLANS.reduce((s, p) => s + p.weight, 0);

const DC = DATACENTERS.slice(0, 8);
const DC_WEIGHTS = [26, 21, 15, 10, 9, 8, 6, 5];
const SITES = DC.map((d, i) => ({ name: d.name, weight: DC_WEIGHTS[i] }));

const CUSTOMER_TYPES = [
  { name: L("Individual", "شخصی"), weight: 52 },
  { name: L("Business", "شرکتی"), weight: 38 },
  { name: L("Reseller", "نماینده فروش"), weight: 10 },
];

const SERVER_STATUS = [
  { id: "running", label: L("Running", "در حال اجرا"), tone: "success" as const, weight: 86 },
  { id: "provisioning", label: L("Provisioning", "در حال راه‌اندازی"), tone: "info" as const, weight: 4 },
  { id: "suspended", label: L("Suspended", "معلق"), tone: "warning" as const, weight: 10 },
];

const CUSTOMER_STATUS = [
  { id: "active", label: L("Active", "فعال"), tone: "success" as const, weight: 78 },
  { id: "pastdue", label: L("Past due", "معوق"), tone: "warning" as const, weight: 9 },
  { id: "cancelled", label: L("Cancelled", "لغو شده"), tone: "neutral" as const, weight: 13 },
];

/** Servers running: delivered minus deleted, since launch (or at the end of an earlier window). */
const running = (s: WindowStats, back = 0) => s.life("primary", back) - s.life("deleted", back);
/** Customers kept: signed up minus lost. */
const kept = (s: WindowStats, back = 0) => s.life("secondary", back) - s.life("lost", back);
/** Monthly churn: customers lost in a window over the customers at its start, scaled to 30 days. */
const churn = (lost: number, base: number, days: number) => (base > 0 ? (lost / base) * (30 / days) * 100 : 0);

/** A server's name: its datacenter's code and a number, "fra-0142". */
const serverName = (c: GenContext, code: string) => `${code.toLowerCase()}-${String(1000 + ((c.index * 389 + 57) % 9000)).padStart(4, "0")}`;

export const hosting: BusinessProfile = {
  id: "hosting",
  brand: BRANDS.hosting,
  seed: 0x9e5d17,
  currency: "USD",
  reference: "2026-10-01",
  launched: "2021-03-15",
  week: [0.66, 1.1, 1.14, 1.12, 1.1, 1.02, 0.72],
  hours: [2.2, 1.6, 1.2, 1, 1, 1.4, 2.4, 4, 5.8, 7, 7.6, 7.8, 7.4, 7.6, 7.8, 7.6, 7, 6.2, 5.2, 4.6, 4.2, 3.8, 3.2, 2.6],
  series: {
    primary: { label: L("Servers delivered", "سرورهای تحویل‌شده"), unit: L("servers", "سرور"), base: 118, growth: 0.42, noise: 0.11 },
    secondary: { label: L("New customers", "مشتریان جدید"), unit: L("customers", "مشتری"), base: 21, growth: 0.3, noise: 0.15 },
  },
  streams: {
    // An order delivers 1.28 servers on average.
    orders: { from: "primary", ratio: 0.78, noise: 0.06 },
    revenue: { from: "primary", ratio: 30.1, noise: 0.08 },
    // Most servers are deleted again: hourly cloud servers, rebuilds and upgrades replace them.
    deleted: { from: "primary", ratio: 0.86, noise: 0.04 },
    lost: { from: "secondary", ratio: 0.48, noise: 0.18 },
    price: { from: "primary", ratio: AVG_PRICE, noise: 0.012, kind: "level" },
    bandwidth: { from: "primary", ratio: 4.6e11, noise: 0.09 },
  },
  perActive: { day: 1.6, d7: 2.4, d90: 6.5 },
  spark: "primary",
  copy: {
    chartTitle: L("Deliveries overview", "نمای کلی تحویل"),
    chartSub: L("Servers delivered and new customers over the selected range", "سرورهای تحویل‌شده و مشتریان جدید در بازهٔ انتخابی"),
    sparkMetric: L("Servers delivered", "سرورهای تحویل‌شده"),
    health: L("Platform health", "سلامت پلتفرم"),
  },
  kpis: [
    { id: "servers", label: L("Active servers", "سرورهای فعال"), format: "number", upIsGood: true, scope: "now", value: (s) => ({ value: running(s), previous: null }) },
    { id: "orders", label: L("New orders, {days} days", "سفارش‌های جدید، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.cur("orders"), previous: s.prev("orders") }) },
    {
      id: "mrr",
      label: L("MRR", "درآمد ماهانهٔ تکرارشونده"),
      format: "money",
      upIsGood: true,
      value: (s) => ({ value: running(s) * s.cur("price"), previous: running(s, 1) * s.prev("price") }),
    },
    {
      id: "aov",
      label: L("Average order value", "میانگین ارزش سفارش"),
      format: "money",
      upIsGood: true,
      value: (s) => ({ value: s.cur("revenue") / Math.max(1, s.cur("orders")), previous: s.prev("revenue") / Math.max(1, s.prev("orders")) }),
    },
    {
      id: "churn",
      label: L("Churn, monthly", "ریزش ماهانه"),
      format: "percent",
      upIsGood: false,
      value: (s) => ({ value: churn(s.cur("lost"), kept(s, 1), s.days), previous: churn(s.prev("lost"), kept(s, 2), s.days) }),
    },
  ],
  radar: [
    { label: L("Auto-provisioning", "تحویل خودکار"), full: L("Servers delivered without a manual step", "سرورهایی که بدون دخالت دستی تحویل شدند"), base: 98.6, spread: 0.6 },
    { label: L("Renewals", "تمدید"), full: L("Servers renewed at the end of their term", "سرورهایی که در پایان دوره تمدید شدند"), base: 87, spread: 2.5 },
    { label: L("SLA met", "رعایت SLA"), full: L("Servers within their 99.9% uptime SLA", "سرورهایی که در SLA دسترس‌پذیری ۹۹٫۹٪ ماندند"), base: 99.2, spread: 0.4 },
    { label: L("Tickets in 24h", "تیکت زیر ۲۴ ساعت"), full: L("Support tickets resolved within 24 hours", "تیکت‌های پشتیبانی که ظرف ۲۴ ساعت حل شدند"), base: 91, spread: 2.2 },
  ],
  tops: [
    { label: L("Top datacenter", "دیتاسنتر اول"), unit: L("servers", "سرور"), scope: "range", of: "primary", share: 1, items: SITES },
    { label: L("Top plan", "پلن اول"), unit: L("servers", "سرور"), scope: "range", of: "primary", share: 1, items: PLANS },
    {
      label: L("Top customer", "مشتری اول"),
      unit: L("servers", "سرور"),
      scope: "allTime",
      of: "primary",
      share: 0.0042,
      items: [
        { name: L("Northbeam Energy", "Northbeam Energy"), weight: 9 },
        { name: L("Lumen Robotics", "Lumen Robotics"), weight: 7 },
        { name: L("Indigo Freight", "Indigo Freight"), weight: 6 },
      ],
    },
  ],
  live: {
    online: { label: L("Servers online", "سرورهای آنلاین"), ofLabel: L("active servers", "سرور فعال"), share: 0.986, of: (s) => running(s), steady: true, jitter: 0.002 },
    today: { label: L("Orders today", "سفارش‌های امروز"), ofLabel: L("this week", "این هفته"), stream: "orders" },
    lifetime: { label: L("Bandwidth used", "پهنای باند مصرفی"), sub: L("last 30 days", "۳۰ روز گذشته"), stream: "bandwidth", format: "bytes", window: 30 },
  },
  health: [
    { id: "provisioning", name: L("Provisioning API", "API تحویل سرور"), kind: "latency", base: 142, warn: 400, side: true, flaky: 0.05 },
    { id: "billing", name: L("Billing", "صورت‌حساب"), kind: "latency", base: 96, warn: 300, side: true, flaky: 0.03 },
    { id: "dns", name: L("DNS", "DNS"), kind: "latency", base: 21, warn: 80, side: true, flaky: 0.02 },
    { id: "monitoring", name: L("Monitoring probes", "کاوشگرهای پایش"), kind: "nodes", base: 8, warn: 7, side: true, flaky: 0.05 },
    { id: "hypervisors", name: L("Hypervisor hosts", "میزبان‌های مجازی‌ساز"), kind: "nodes", base: 64, warn: 62, flaky: 0.06 },
    { id: "backups", name: L("Backup queue", "صف پشتیبان‌گیری"), kind: "queue", base: 12, warn: 120, flaky: 0.04 },
  ],
  incidents: [
    { title: L("Slow provisioning in one datacenter", "کندی تحویل سرور در یک دیتاسنتر"), service: "provisioning", daysAgo: 5, minutes: 41 },
    { title: L("Billing webhooks retried after a deploy", "تکرار وب‌هوک‌های صورت‌حساب پس از یک استقرار"), service: "billing", daysAgo: 19, minutes: 14 },
    { title: L("DNS changes propagated slowly", "انتشار کند تغییرات DNS"), service: "dns", daysAgo: 33, minutes: 27 },
  ],
  growth: {
    cumulative: L("Customers over time", "روند مشتریان"),
    split: { title: L("New and returning customers", "مشتریان جدید و بازگشتی"), sub: L("Customers who ordered each day", "مشتریانی که هر روز سفارش دادند"), fresh: L("New", "جدید"), returning: L("Returning", "بازگشتی") },
    funnel: {
      title: L("Order funnel", "قیف سفارش"),
      sub: L("From signing up to a second server, this range", "از ثبت‌نام تا سرور دوم، در این بازه"),
      steps: [L("Signed up", "ثبت‌نام"), L("Placed an order", "سفارش داد"), L("Server delivered", "سرور تحویل شد"), L("Ordered again", "دوباره سفارش داد")],
      rates: [0.62, 0.97, 0.36],
    },
  },
  retention: {
    title: L("Weekly retention", "ماندگاری هفتگی"),
    sub: L("Share of each signup week still running a server in each later week", "سهمی از هر هفتهٔ ثبت‌نام که در هفته‌های بعد هنوز سرور فعال داشت"),
    curve: [0.9, 0.78, 0.64],
    distribution: {
      title: L("Servers per customer", "سرور به ازای هر مشتری"),
      sub: L("Active customers in this range, by how many servers they run", "مشتریان فعال این بازه، بر اساس تعداد سرورهایشان"),
      buckets: [L("1", "۱"), L("2–3", "۲ تا ۳"), L("4–9", "۴ تا ۹"), L("10+", "۱۰ و بیشتر")],
      weights: [46, 31, 16, 7],
    },
  },
  behaviour: {
    heat: L("Servers delivered", "سرورهای تحویل‌شده"),
    segments: { title: L("Servers by plan", "سرورها بر اساس پلن"), sub: L("Share of servers delivered in this range", "سهم از سرورهای تحویل‌شدهٔ این بازه"), items: PLANS },
    list: { title: L("Busiest datacenters", "شلوغ‌ترین دیتاسنترها"), sub: L("Servers delivered in this range", "سرورهای تحویل‌شده در این بازه"), items: SITES.slice(0, 6) },
  },
  entities: [
    {
      id: "servers",
      path: "servers",
      label: L("Servers", "سرورها"),
      things: L("servers", "سرورها"),
      icon: "server",
      count: 240,
      statuses: SERVER_STATUS,
      filter: { column: "datacenter", label: L("Datacenter", "دیتاسنتر") },
      // Renewals first, the overdue ones (suspended) at the top.
      sort: { column: "renews", dir: "asc" },
      trend: { label: L("Bandwidth per day, GB", "پهنای باند روزانه، گیگابایت"), base: 38 },
      span: { from: "created" },
      quiet: ["suspended"],
      activity: [
        L("Snapshot taken", "از سرور اسنپ‌شات گرفته شد"),
        L("Backup completed in {n} minutes", "پشتیبان‌گیری در {n} دقیقه انجام شد"),
        L("Kernel patched and rebooted", "هسته وصله و راه‌اندازی دوباره شد"),
        L("Firewall rule added", "یک قانون فایروال اضافه شد"),
      ],
      columns: [
        // The datacenter is drawn first, inside the name: "fra-0142" is in Frankfurt.
        { id: "server", label: L("Server", "سرور"), kind: "code", gen: (r, _row, c) => serverName(c, r.weighted(DC, (d) => DC_WEIGHTS[DC.indexOf(d)]).code) },
        { id: "plan", label: L("Plan", "پلن"), kind: "enum", gen: (r) => g.weighted(r, PLANS) },
        { id: "datacenter", label: L("Datacenter", "دیتاسنتر"), kind: "enum", gen: (_r, row) => (DC.find((d) => String(row.server).startsWith(d.code.toLowerCase())) ?? DC[0]).name },
        { id: "status", label: L("Status", "وضعیت"), kind: "status", gen: (r) => g.status(r, SERVER_STATUS) },
        // Provisioning: ordered within the last two hours. Suspended: an old server whose renewal lapsed.
        {
          id: "created",
          label: L("Created", "ساخت"),
          kind: "ago",
          gen: (r, row, c) =>
            row.status === "provisioning" ? c.now.getTime() - r.int(2, 110) * 60_000 : row.status === "suspended" ? g.agoBetween(r, c.now, 45, 900) : g.agoBetween(r, c.now, 1, 1600),
          secondary: true,
        },
        // A server renews every 30 days from its creation; a suspended one is 3 to 20 days past due.
        {
          id: "renews",
          label: L("Renews", "تمدید"),
          kind: "due",
          gen: (r, row, c) => {
            const now = c.now.getTime();
            if (row.status === "suspended") return now - (3 + r.next() * 17) * DAY;
            const created = row.created as number;
            const cycles = Math.floor((now - created) / (30 * DAY)) + 1;
            return created + cycles * 30 * DAY;
          },
        },
        { id: "customer", label: L("Customer", "مشتری"), kind: "text", gen: (r) => g.company(r), secondary: true },
      ],
    },
    {
      id: "customers",
      path: "customers",
      label: L("Customers", "مشتریان"),
      things: L("customers", "مشتریان"),
      icon: "users",
      count: 240,
      statuses: CUSTOMER_STATUS,
      filter: { column: "type", label: L("Type", "نوع") },
      sort: { column: "spend", dir: "desc" },
      // Bandwidth scales with the servers a customer runs: 38 GB a day for each.
      trend: { label: L("Bandwidth per day, GB", "پهنای باند روزانه، گیگابایت"), base: 3800, per: "servers" },
      span: { from: "since" },
      quiet: ["cancelled"],
      activity: [
        L("Ordered {n} servers", "{n} سرور سفارش داد"),
        L("Paid an invoice", "یک صورت‌حساب را پرداخت کرد"),
        L("Opened a support ticket", "یک تیکت پشتیبانی باز کرد"),
        L("Added an SSH key", "یک کلید SSH اضافه کرد"),
      ],
      columns: [
        { id: "customer", label: L("Customer", "مشتری"), kind: "person", gen: (r, _row, c) => g.person(r, c.index) },
        { id: "type", label: L("Type", "نوع"), kind: "enum", gen: (r) => g.weighted(r, CUSTOMER_TYPES) },
        { id: "status", label: L("Status", "وضعیت"), kind: "status", gen: (r) => g.status(r, CUSTOMER_STATUS) },
        // A cancelled customer runs nothing; a reseller runs many.
        {
          id: "servers",
          label: L("Servers", "سرورها"),
          kind: "number",
          gen: (r, row) => (row.status === "cancelled" ? 0 : g.count(r, { Individual: 1.6, Business: 4, Reseller: 18 }[(row.type as { en: string }).en] ?? 2, 0.6, 1)),
        },
        {
          id: "spend",
          label: L("Monthly spend", "هزینهٔ ماهانه"),
          kind: "money",
          gen: (r, row) => Math.round((row.servers as number) * AVG_PRICE * (0.7 + r.next() * 0.6) * 100) / 100,
        },
        { id: "since", label: L("Customer since", "مشتری از"), kind: "ago", gen: (r, _row, c) => g.agoBetween(r, c.now, 20, 1990), secondary: true },
        // The last order falls after they joined: recent for an active customer, long ago for one who left.
        {
          id: "last",
          label: L("Last order", "آخرین سفارش"),
          kind: "ago",
          gen: (r, row, c) => {
            const drawn = row.status === "cancelled" ? g.agoBetween(r, c.now, 60, 400) : row.status === "pastdue" ? g.agoBetween(r, c.now, 20, 200) : g.agoBetween(r, c.now, 0, 90);
            return Math.max(row.since as number, drawn);
          },
        },
      ],
    },
  ],
};
