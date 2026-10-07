/** Loopdesk, a team-workspace SaaS: sign-ups, activation, paid conversions and churn. */
import { g } from "@/data/gen";
import { REGIONS } from "@/data/names";

import { BRANDS } from "./brands";
import type { BusinessProfile, GenContext } from "./types";

const L = (en: string, fa: string) => ({ en, fa });

const PLANS = [
  { name: L("Free", "رایگان"), weight: 38 },
  { name: L("Team", "تیمی"), weight: 34 },
  { name: L("Business", "تجاری"), weight: 20 },
  { name: L("Enterprise", "سازمانی"), weight: 8 },
];

const ACCOUNT_STATUS = [
  { id: "onboarding", label: L("Onboarding", "در حال راه‌اندازی"), tone: "info" as const, weight: 18 },
  { id: "active", label: L("Active", "فعال"), tone: "success" as const, weight: 64 },
  { id: "pastdue", label: L("Past due", "معوق"), tone: "warning" as const, weight: 8 },
  { id: "churned", label: L("Churned", "لغو شده"), tone: "neutral" as const, weight: 10 },
];

const INVOICE_STATUS = [
  { id: "paid", label: L("Paid", "پرداخت‌شده"), tone: "success" as const, weight: 70 },
  { id: "open", label: L("Open", "باز"), tone: "info" as const, weight: 18 },
  { id: "overdue", label: L("Overdue", "سررسید گذشته"), tone: "danger" as const, weight: 7 },
  { id: "refunded", label: L("Refunded", "بازپرداخت‌شده"), tone: "neutral" as const, weight: 5 },
];

// An invoice's story, step by step (`story` on the invoices table).
const SENT = L("Invoice sent to the billing contact", "صورت‌حساب برای مسئول پرداخت ارسال شد");
const PDF = L("Invoice PDF downloaded", "PDF صورت‌حساب دانلود شد");
const PAID = L("Paid by card", "با کارت پرداخت شد");

/** When invoice row `index` was issued: one every ~9 hours, newest first. */
const issuedAt = (c: GenContext) => c.now.getTime() - c.index * 0.37 * 86_400_000 - 3_600_000;

const INTEGRATIONS = [
  { name: L("Calendar sync", "همگام‌سازی تقویم"), weight: 31 },
  { name: L("Chat bridge", "پل گفتگو"), weight: 26 },
  { name: L("Git sync", "همگام‌سازی گیت"), weight: 19 },
  { name: L("Email in", "ورود از ایمیل"), weight: 14 },
  { name: L("Webhooks", "وب‌هوک‌ها"), weight: 10 },
];

const PRICE: Record<string, number> = { Free: 0, Team: 12, Business: 24, Enterprise: 42 };

export const saas: BusinessProfile = {
  id: "saas",
  brand: BRANDS.saas,
  seed: 0x10e9d5,
  currency: "USD",
  reference: "2026-10-01",
  launched: "2024-11-04",
  week: [0.42, 1.08, 1.12, 1.1, 1.08, 0.96, 0.4],
  hours: [1, 0.7, 0.5, 0.5, 0.6, 1, 2.2, 4.5, 7.5, 9.6, 10.2, 10, 9, 9.4, 9.8, 9.6, 8.8, 7, 5, 4, 3.4, 2.8, 2, 1.4],
  series: {
    primary: { label: L("Active users", "کاربران فعال"), unit: L("users", "کاربر"), base: 3380, growth: 0.48, noise: 0.05 },
    secondary: { label: L("New sign-ups", "ثبت‌نام‌های جدید"), unit: L("sign-ups", "ثبت‌نام"), base: 39, growth: 0.32, noise: 0.16 },
  },
  streams: {
    conversions: { from: "secondary", ratio: 0.19, noise: 0.22 },
    churn: { from: "secondary", ratio: 0.055, noise: 0.35 },
    revenue: { from: "primary", ratio: 0.42, noise: 0.04 },
  },
  perActive: { day: 1, d7: 3.1, d90: 19 },
  copy: {
    chartTitle: L("Activity overview", "نمای کلی فعالیت"),
    chartSub: L("Daily active users and new sign-ups over the selected range", "کاربران فعال روزانه و ثبت‌نام‌های جدید در بازهٔ انتخابی"),
    sparkMetric: L("New sign-ups", "ثبت‌نام‌های جدید"),
    health: L("Platform health", "سلامت پلتفرم"),
  },
  kpis: [
    { id: "total", label: L("Workspaces", "فضاهای کاری"), format: "number", upIsGood: true, value: (s) => ({ value: s.total, previous: null }) },
    { id: "active", label: L("Active users, {days} days", "کاربران فعال، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.active, previous: s.prevActive }) },
    { id: "paid", label: L("Paid conversions, {days} days", "تبدیل به اشتراک پولی، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.cur("conversions"), previous: s.prev("conversions") }) },
    { id: "churn", label: L("Churned workspaces, {days} days", "فضاهای کاری لغوشده، {days} روز"), format: "number", upIsGood: false, value: (s) => ({ value: s.cur("churn"), previous: s.prev("churn") }) },
    // Revenue per paying workspace: the window's revenue at a monthly rate, over the workspaces paying
    // at its end (converted minus churned since launch).
    {
      id: "arpa",
      label: L("Revenue per account, monthly", "درآمد ماهانه به ازای هر حساب"),
      format: "money",
      upIsGood: true,
      value: (s) => ({
        value: (s.cur("revenue") * 30) / s.days / Math.max(1, s.life("conversions") - s.life("churn")),
        previous: (s.prev("revenue") * 30) / s.days / Math.max(1, s.life("conversions", 1) - s.life("churn", 1)),
      }),
    },
  ],
  radar: [
    { label: L("Free to paid", "رایگان به پولی"), full: L("Sign-ups in this range that became paid workspaces", "ثبت‌نام‌های این بازه که پولی شدند"), base: 62, spread: 6 },
    { label: L("Activation", "فعال‌سازی"), full: L("Invited a teammate in the first week", "در هفتهٔ اول هم‌تیمی دعوت کردند"), base: 71, spread: 5 },
    { label: L("Net retention", "ماندگاری خالص"), full: L("Revenue kept from last period's workspaces", "درآمد حفظ‌شده از فضاهای کاری دورهٔ قبل"), base: 84, spread: 4 },
    { label: L("Adoption", "پذیرش ویژگی‌ها"), full: L("Weekly users of three or more features", "کاربران هفتگی سه ویژگی یا بیشتر"), base: 57, spread: 6 },
  ],
  tops: [
    { label: L("Top plan", "پلن اول"), unit: L("workspaces", "فضای کاری"), scope: "allTime", of: "secondary", share: 1, items: PLANS },
    { label: L("Top region", "منطقهٔ اول"), unit: L("active users", "کاربر فعال"), scope: "range", of: "primary", share: 0.3, items: REGIONS.map((name, i) => ({ name, weight: [36, 28, 16, 13, 7][i] })) },
    { label: L("Top integration", "یکپارچه‌سازی اول"), unit: L("workspaces", "فضای کاری"), scope: "allTime", of: "secondary", share: 0.6, items: INTEGRATIONS },
  ],
  live: {
    online: { label: L("Online now", "آنلاین الان"), ofLabel: L("active this week", "فعال در این هفته"), share: 0.16 },
    today: { label: L("Sign-ups today", "ثبت‌نام‌های امروز"), ofLabel: L("this week", "این هفته") },
    lifetime: { label: L("Monthly recurring revenue", "درآمد ماهانهٔ تکرارشونده"), sub: L("last 30 days", "۳۰ روز گذشته"), stream: "revenue", format: "money", window: 30 },
  },
  health: [
    { id: "api", name: L("Public API", "API عمومی"), kind: "latency", base: 112, warn: 300, side: true, flaky: 0.05 },
    { id: "db", name: L("Database", "پایگاه داده"), kind: "latency", base: 9, warn: 40, side: true, flaky: 0.02 },
    { id: "queue", name: L("Job queue", "صف کارها"), kind: "queue", base: 14, warn: 120, side: true, flaky: 0.04 },
    { id: "email", name: L("Email delivery", "تحویل ایمیل"), kind: "percent", base: 99.4, warn: 97, side: true, flaky: 0.03 },
    { id: "search", name: L("Search index", "نمایهٔ جستجو"), kind: "latency", base: 64, warn: 250, flaky: 0.03 },
    { id: "files", name: L("File storage", "ذخیره‌سازی فایل"), kind: "latency", base: 138, warn: 400, flaky: 0.02 },
  ],
  incidents: [
    { title: L("Delayed notification emails", "تأخیر در ایمیل‌های اعلان"), service: "email", daysAgo: 6, minutes: 47 },
    { title: L("Search results missing new items", "نتایج جستجو موارد جدید را نشان نمی‌داد"), service: "search", daysAgo: 23, minutes: 64 },
    { title: L("Job queue backlog during a migration", "انباشت صف کارها هنگام مهاجرت"), service: "queue", daysAgo: 52, minutes: 18 },
  ],
  growth: {
    cumulative: L("Workspaces over time", "روند فضاهای کاری"),
    split: { title: L("New and returning users", "کاربران جدید و بازگشتی"), sub: L("People active each day", "کاربران فعال هر روز"), fresh: L("New", "جدید"), returning: L("Returning", "بازگشتی") },
    funnel: {
      title: L("Sign-up funnel", "قیف ثبت‌نام"),
      sub: L("From signing up to paying, this range", "از ثبت‌نام تا پرداخت، در این بازه"),
      steps: [L("Signed up", "ثبت‌نام کرد"), L("Created a project", "پروژه ساخت"), L("Invited the team", "تیم را دعوت کرد"), L("Paid", "پرداخت کرد")],
      rates: [0.81, 0.58, 0.44],
    },
  },
  retention: {
    title: L("Weekly retention", "ماندگاری هفتگی"),
    sub: L("Share of each signup week still active in each later week", "سهمی از هر هفتهٔ ثبت‌نام که در هفته‌های بعد فعال ماند"),
    curve: [0.88, 0.71, 0.54],
    distribution: {
      title: L("Active days per user", "روزهای فعال هر کاربر"),
      sub: L("Active users in this range, by how many days they used Loopdesk", "کاربران فعال این بازه، بر اساس تعداد روزهای استفاده"),
      buckets: [L("1 day", "۱ روز"), L("2–3 days", "۲ تا ۳ روز"), L("4–6 days", "۴ تا ۶ روز"), L("7+ days", "۷ روز و بیشتر")],
      weights: [22, 28, 27, 23],
    },
  },
  behaviour: {
    heat: L("Active users", "کاربران فعال"),
    segments: { title: L("Users by plan", "کاربران بر اساس پلن"), sub: L("Share of active users in this range", "سهم از کاربران فعال این بازه"), items: PLANS },
    list: { title: L("Most used integrations", "پرکاربردترین یکپارچه‌سازی‌ها"), sub: L("Active users who used each one", "کاربران فعالی که از هر کدام استفاده کردند"), items: INTEGRATIONS },
  },
  entities: [
    {
      id: "accounts",
      path: "accounts",
      label: L("Accounts", "حساب‌ها"),
      things: L("accounts", "حساب‌ها"),
      icon: "building",
      // One row per company in the pool: an account list that repeats a name reads as made up.
      count: 60,
      statuses: ACCOUNT_STATUS,
      filter: { column: "plan", label: L("Plan", "پلن") },
      sort: { column: "mrr", dir: "desc" },
      trend: { label: L("Active seats per day", "صندلی فعال در روز"), base: 9, cap: "seats" },
      span: { from: "created" },
      quiet: ["churned"],
      activity: [
        L("Added {n} seats", "{n} صندلی اضافه کرد"),
        L("Connected a new integration", "یک یکپارچه‌سازی جدید وصل کرد"),
        L("Exported a report", "یک گزارش خروجی گرفت"),
        L("Changed the billing email", "ایمیل صورت‌حساب را عوض کرد"),
      ],
      columns: [
        { id: "account", label: L("Account", "حساب"), kind: "text", gen: (_r, _row, c) => g.companyAt(c.index) },
        { id: "plan", label: L("Plan", "پلن"), kind: "enum", gen: (r) => g.weighted(r, PLANS) },
        { id: "status", label: L("Status", "وضعیت"), kind: "status", gen: (r) => g.status(r, ACCOUNT_STATUS) },
        { id: "seats", label: L("Seats", "صندلی‌ها"), kind: "number", gen: (r) => g.count(r, 11, 0.8, 1) },
        {
          id: "mrr",
          label: L("MRR", "درآمد ماهانه"),
          kind: "money",
          digits: 0,
          // An account still onboarding and a churned one bring in nothing.
          gen: (_r, row) => {
            if (row.status === "onboarding" || row.status === "churned") return 0;
            const plan = row.plan as { en: string };
            return (PRICE[plan.en] ?? 12) * (row.seats as number);
          },
        },
        // An account onboarding is at most two weeks old; anything else is older than one.
        { id: "created", label: L("Created", "ایجاد"), kind: "ago", gen: (r, row, c) => (row.status === "onboarding" ? g.agoBetween(r, c.now, 0, 14) : g.agoBetween(r, c.now, 20, 600)), secondary: true },
      ],
    },
    {
      id: "invoices",
      path: "invoices",
      label: L("Invoices", "صورت‌حساب‌ها"),
      things: L("invoices", "صورت‌حساب‌ها"),
      icon: "receipt",
      count: 260,
      statuses: INVOICE_STATUS,
      filter: { column: "status", label: L("Status", "وضعیت") },
      sort: { column: "issued", dir: "desc" },
      span: { from: "issued" },
      story: {
        open: [SENT, PDF],
        paid: [SENT, PDF, PAID],
        overdue: [SENT, L("Payment attempt failed", "تلاش پرداخت ناموفق بود"), L("Reminder sent to the billing contact", "یادآوری برای مسئول صورت‌حساب ارسال شد")],
        refunded: [SENT, PAID, L("Refund issued", "مبلغ بازپرداخت شد")],
      },
      columns: [
        { id: "invoice", label: L("Invoice", "صورت‌حساب"), kind: "code", gen: (_r, _row, c) => g.code("INV", 20460, c.index, 1) },
        { id: "account", label: L("Account", "حساب"), kind: "text", gen: (r) => g.company(r) },
        { id: "amount", label: L("Amount", "مبلغ"), kind: "money", gen: (r) => g.money(r, 260, 0.8) },
        // Overdue (or refunded) only once the due date has passed; before it, paid or still open.
        {
          id: "status",
          label: L("Status", "وضعیت"),
          kind: "status",
          gen: (r, _row, c) => g.statusAmong(r, INVOICE_STATUS, issuedAt(c) + 14 * 86_400_000 < c.now.getTime() ? ["paid", "overdue", "refunded"] : ["paid", "open"]),
        },
        { id: "issued", label: L("Issued", "صدور"), kind: "ago", gen: (_r, _row, c) => issuedAt(c) },
        { id: "due", label: L("Due", "سررسید"), kind: "due", gen: (_r, row) => (row.issued as number) + 14 * 86_400_000, secondary: true },
      ],
    },
  ],
};
