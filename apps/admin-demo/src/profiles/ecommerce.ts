/** Fernloft, an online home store: orders, revenue, average order value, customers. */
import { g } from "@/data/gen";
import { CUSTOMER_CITIES } from "@/data/names";

import { BRANDS } from "./brands";
import type { BusinessProfile } from "./types";

const L = (en: string, fa: string) => ({ en, fa });

const PRODUCTS = [
  { name: L("Linen throw blanket", "پتوی کتان"), weight: 24 },
  { name: L("Stoneware mug set", "ست ماگ سفالی"), weight: 21 },
  { name: L("Oak side table", "میز کناری بلوط"), weight: 15 },
  { name: L("Rattan floor lamp", "آباژور ایستادهٔ حصیری"), weight: 13 },
  { name: L("Wool cushion cover", "روکش کوسن پشمی"), weight: 11 },
  { name: L("Ceramic planter", "گلدان سرامیکی"), weight: 9 },
];

const CATEGORIES = [
  { name: L("Textiles", "منسوجات"), weight: 31 },
  { name: L("Kitchen", "آشپزخانه"), weight: 26 },
  { name: L("Lighting", "روشنایی"), weight: 17 },
  { name: L("Furniture", "مبلمان"), weight: 15 },
  { name: L("Plants and pots", "گیاه و گلدان"), weight: 11 },
];

const ORDER_STATUS = [
  { id: "paid", label: L("Paid", "پرداخت‌شده"), tone: "brand" as const, weight: 22 },
  { id: "packed", label: L("Packed", "بسته‌بندی‌شده"), tone: "info" as const, weight: 14 },
  { id: "shipped", label: L("Shipped", "ارسال‌شده"), tone: "warning" as const, weight: 18 },
  { id: "delivered", label: L("Delivered", "تحویل‌شده"), tone: "success" as const, weight: 42 },
  { id: "refunded", label: L("Refunded", "مرجوع‌شده"), tone: "neutral" as const, weight: 4 },
];

const SEGMENT = [
  { id: "new", label: L("New", "جدید"), tone: "info" as const, weight: 38 },
  { id: "returning", label: L("Returning", "بازگشتی"), tone: "brand" as const, weight: 48 },
  { id: "vip", label: L("VIP", "ویژه"), tone: "success" as const, weight: 14 },
];

export const ecommerce: BusinessProfile = {
  id: "ecommerce",
  brand: BRANDS.ecommerce,
  seed: 0xfe41f7,
  currency: "USD",
  reference: "2026-10-01",
  launched: "2024-06-18",
  week: [1.22, 0.9, 0.93, 0.96, 1.0, 1.06, 1.16],
  hours: [1.4, 0.8, 0.5, 0.4, 0.4, 0.6, 1.2, 2.6, 4, 5, 5.6, 6.2, 7.4, 6.8, 5.8, 5.6, 6, 6.8, 8, 9.6, 10.4, 9.6, 7, 3.6],
  series: {
    primary: { label: L("Orders", "سفارش‌ها"), unit: L("orders", "سفارش"), base: 418, growth: 0.36, noise: 0.09 },
    secondary: { label: L("New customers", "مشتریان جدید"), unit: L("customers", "مشتری"), base: 162, growth: 0.28, noise: 0.12 },
  },
  streams: {
    revenue: { from: "primary", ratio: 67.4, noise: 0.07 },
  },
  perActive: { day: 1.04, d7: 1.12, d90: 1.9 },
  copy: {
    chartTitle: L("Sales overview", "نمای کلی فروش"),
    chartSub: L("Orders and new customers over the selected range", "سفارش‌ها و مشتریان جدید در بازهٔ انتخابی"),
    sparkMetric: L("New customers", "مشتریان جدید"),
    health: L("Store health", "سلامت فروشگاه"),
  },
  kpis: [
    { id: "total", label: L("Customers", "مشتریان"), format: "number", upIsGood: true, value: (s) => ({ value: s.total, previous: null }) },
    { id: "orders", label: L("Orders, {days} days", "سفارش‌ها، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.cur("primary"), previous: s.prev("primary") }) },
    { id: "revenue", label: L("Revenue, {days} days", "درآمد، {days} روز"), format: "money", upIsGood: true, value: (s) => ({ value: s.cur("revenue"), previous: s.prev("revenue") }) },
    {
      id: "aov",
      label: L("Average order value", "میانگین ارزش سفارش"),
      format: "money",
      upIsGood: true,
      value: (s) => ({ value: s.cur("revenue") / Math.max(1, s.cur("primary")), previous: s.prev("revenue") / Math.max(1, s.prev("primary")) }),
    },
  ],
  radar: [
    { label: L("Checkout", "تکمیل خرید"), full: L("Carts that reached a paid order", "سبدهایی که به سفارش پرداخت‌شده رسیدند"), base: 64, spread: 5 },
    { label: L("Repeat purchase", "خرید دوباره"), full: L("Customers who ordered again within 60 days", "مشتریانی که ظرف ۶۰ روز دوباره خریدند"), base: 46, spread: 5 },
    { label: L("On-time delivery", "تحویل به‌موقع"), full: L("Orders delivered by the promised date", "سفارش‌هایی که تا تاریخ وعده‌داده تحویل شدند"), base: 91, spread: 3 },
    { label: L("Positive reviews", "نظرهای مثبت"), full: L("Reviews of four stars or more", "نظرهای چهار ستاره و بیشتر"), base: 83, spread: 4 },
  ],
  tops: [
    { label: L("Top product", "پرفروش‌ترین کالا"), unit: L("orders", "سفارش"), scope: "range", of: "primary", share: 0.42, items: PRODUCTS },
    { label: L("Top category", "دستهٔ اول"), unit: L("orders", "سفارش"), scope: "range", of: "primary", share: 1, items: CATEGORIES },
    { label: L("Top city", "شهر اول"), unit: L("customers", "مشتری"), scope: "allTime", of: "secondary", share: 1, items: CUSTOMER_CITIES.map((name, i) => ({ name, weight: [30, 13, 11, 9, 9, 7, 5, 4, 4, 3, 3, 2][i] })) },
  ],
  live: {
    online: { label: L("Shoppers online", "خریداران آنلاین"), ofLabel: L("buyers this week", "خریداران این هفته"), share: 0.11 },
    today: { label: L("New customers today", "مشتریان جدید امروز"), ofLabel: L("this week", "این هفته") },
    lifetime: { label: L("Gross sales", "فروش ناخالص"), sub: L("since launch", "از زمان راه‌اندازی"), stream: "revenue", format: "money" },
  },
  health: [
    { id: "storefront", name: L("Storefront", "ویترین فروشگاه"), kind: "latency", base: 148, warn: 450, side: true, flaky: 0.04 },
    { id: "checkout", name: L("Checkout", "پرداخت سبد"), kind: "latency", base: 212, warn: 600, side: true, flaky: 0.04 },
    { id: "payments", name: L("Payment gateway", "درگاه پرداخت"), kind: "latency", base: 304, warn: 900, side: true, flaky: 0.06 },
    { id: "inventory", name: L("Inventory sync", "همگام‌سازی موجودی"), kind: "queue", base: 6, warn: 60, side: true, flaky: 0.05 },
    { id: "images", name: L("Image CDN", "سرور تصاویر"), kind: "latency", base: 38, warn: 160, flaky: 0.02 },
  ],
  incidents: [
    { title: L("Slow checkout on mobile for one region", "کندی پرداخت روی موبایل در یک منطقه"), service: "checkout", daysAgo: 3, minutes: 26 },
    { title: L("Payment gateway timeouts", "قطعی‌های کوتاه درگاه پرداخت"), service: "payments", daysAgo: 19, minutes: 41 },
    { title: L("Stock counts lagged behind the warehouse", "عقب‌ماندن موجودی از انبار"), service: "inventory", daysAgo: 34, minutes: 95 },
  ],
  growth: {
    cumulative: L("Customers over time", "روند مشتریان"),
    split: { title: L("New and returning buyers", "خریداران جدید و بازگشتی"), sub: L("People who ordered each day", "کسانی که هر روز سفارش دادند"), fresh: L("New", "جدید"), returning: L("Returning", "بازگشتی") },
    funnel: {
      title: L("Purchase funnel", "قیف خرید"),
      sub: L("From a first visit to a second order, this range", "از اولین بازدید تا سفارش دوم، در این بازه"),
      steps: [L("New customers", "مشتری جدید"), L("Added to cart", "به سبد افزود"), L("Ordered", "سفارش داد"), L("Ordered again", "دوباره سفارش داد")],
      rates: [0.71, 0.64, 0.38],
    },
  },
  retention: {
    title: L("Weekly retention", "ماندگاری هفتگی"),
    sub: L("Share of each first-order week that ordered again in each later week", "سهمی از هر هفتهٔ اولین خرید که در هفته‌های بعد دوباره خرید"),
    curve: [0.9, 0.16, 0.07],
    distribution: {
      title: L("Orders per customer", "سفارش به ازای هر مشتری"),
      sub: L("Buyers in this range, by how many orders they placed", "خریداران این بازه، بر اساس تعداد سفارش"),
      buckets: [L("1", "۱"), L("2", "۲"), L("3–4", "۳ تا ۴"), L("5+", "۵ و بیشتر")],
      weights: [58, 24, 12, 6],
    },
  },
  behaviour: {
    heat: L("Orders", "سفارش‌ها"),
    segments: { title: L("Orders by category", "سفارش‌ها بر اساس دسته"), sub: L("Share of orders in this range", "سهم از سفارش‌های این بازه"), items: CATEGORIES },
    list: { title: L("Best sellers", "پرفروش‌ها"), sub: L("Orders in this range", "سفارش در این بازه"), items: PRODUCTS },
  },
  entities: [
    {
      id: "orders",
      path: "orders",
      label: L("Orders", "سفارش‌ها"),
      things: L("orders", "سفارش‌ها"),
      icon: "cart",
      count: 260,
      statuses: ORDER_STATUS,
      filter: { column: "category", label: L("Category", "دسته") },
      sort: { column: "placed", dir: "desc" },
      trend: { label: L("Page views per day", "بازدید در روز"), base: 14 },
      activity: [
        L("Shipping label printed", "برچسب ارسال چاپ شد"),
        L("Customer opened the tracking link", "مشتری لینک رهگیری را باز کرد"),
        L("Gift note added", "یادداشت هدیه اضافه شد"),
        L("Payment captured", "مبلغ برداشت شد"),
      ],
      columns: [
        { id: "order", label: L("Order", "سفارش"), kind: "code", gen: (_r, _row, c) => g.code("ORD", 48213, c.index, 2) },
        { id: "customer", label: L("Customer", "مشتری"), kind: "person", gen: (r) => g.person(r) },
        { id: "category", label: L("Category", "دسته"), kind: "enum", gen: (r) => g.weighted(r, CATEGORIES), secondary: true },
        { id: "items", label: L("Items", "اقلام"), kind: "number", gen: (r) => g.count(r, 2, 0.6, 1) },
        { id: "total", label: L("Total", "مبلغ"), kind: "money", gen: (r, row) => Math.round(g.money(r, 34, 0.45) * (row.items as number) * 100) / 100 },
        { id: "status", label: L("Status", "وضعیت"), kind: "status", gen: (r) => g.status(r, ORDER_STATUS) },
        { id: "placed", label: L("Placed", "ثبت"), kind: "ago", gen: (_r, _row, c) => c.now.getTime() - c.index * 0.26 * 3_600_000 - 600_000 },
      ],
    },
    {
      id: "customers",
      path: "customers",
      label: L("Customers", "مشتریان"),
      things: L("customers", "مشتریان"),
      icon: "heart",
      count: 240,
      statuses: SEGMENT,
      filter: { column: "city", label: L("City", "شهر") },
      sort: { column: "spend", dir: "desc" },
      trend: { label: L("Visits per day", "بازدید در روز"), base: 1 },
      activity: [
        L("Saved {n} items to a wishlist", "{n} کالا را به فهرست علاقه‌مندی افزود"),
        L("Left a five-star review", "یک نظر پنج‌ستاره گذاشت"),
        L("Opened the newsletter", "خبرنامه را باز کرد"),
        L("Updated the delivery address", "نشانی تحویل را به‌روز کرد"),
      ],
      columns: [
        { id: "customer", label: L("Customer", "مشتری"), kind: "person", gen: (r) => g.person(r) },
        { id: "city", label: L("City", "شهر"), kind: "enum", gen: (r) => g.pick(r, CUSTOMER_CITIES) },
        { id: "status", label: L("Segment", "بخش"), kind: "status", gen: (r) => g.status(r, SEGMENT) },
        { id: "orders", label: L("Orders", "سفارش‌ها"), kind: "number", gen: (r) => g.count(r, 3, 0.8, 1) },
        { id: "spend", label: L("Lifetime value", "ارزش کل"), kind: "money", gen: (r, row) => Math.round(g.money(r, 70, 0.4) * (row.orders as number) * 100) / 100 },
        { id: "last", label: L("Last order", "آخرین سفارش"), kind: "ago", gen: (r, _row, c) => g.ago(r, c.now, 120), secondary: true },
      ],
    },
  ],
};
