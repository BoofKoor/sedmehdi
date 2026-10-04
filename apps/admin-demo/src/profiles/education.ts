/** Quillstone, an online academy: enrolments, lessons, completion, courses and teachers. */
import { g } from "@/data/gen";

import { BRANDS } from "./brands";
import type { BusinessProfile } from "./types";

const L = (en: string, fa: string) => ({ en, fa });

/** The catalogue, most studied first: the Courses table lists each once, the weights say how popular. */
const COURSES = [
  { name: L("Product Design Basics", "مبانی طراحی محصول"), weight: 22 },
  { name: L("Data Analysis with Python", "تحلیل داده با پایتون"), weight: 20 },
  { name: L("Spoken English B1", "مکالمهٔ انگلیسی B1"), weight: 17 },
  { name: L("Persian Calligraphy", "خوشنویسی فارسی"), weight: 12 },
  { name: L("Photography Fundamentals", "مبانی عکاسی"), weight: 11 },
  { name: L("Accounting for Founders", "حسابداری برای بنیان‌گذاران"), weight: 9 },
  { name: L("Web Development Bootcamp", "دورهٔ فشردهٔ توسعهٔ وب"), weight: 9 },
  { name: L("UX Writing", "نوشتن برای رابط کاربری"), weight: 8 },
  { name: L("Digital Marketing Essentials", "اصول بازاریابی دیجیتال"), weight: 8 },
  { name: L("Excel for Everyday Work", "اکسل برای کارهای روزمره"), weight: 7 },
  { name: L("Public Speaking", "سخنرانی در جمع"), weight: 7 },
  { name: L("Intro to Machine Learning", "آشنایی با یادگیری ماشین"), weight: 7 },
  { name: L("Mobile App Design", "طراحی اپلیکیشن موبایل"), weight: 6 },
  { name: L("SQL for Analysts", "SQL برای تحلیلگران"), weight: 6 },
  { name: L("Watercolour Painting", "نقاشی آبرنگ"), weight: 5 },
  { name: L("Creative Writing", "نویسندگی خلاق"), weight: 5 },
  { name: L("Video Editing", "تدوین ویدیو"), weight: 5 },
  { name: L("German A1", "آلمانی A1"), weight: 5 },
  { name: L("Music Theory", "تئوری موسیقی"), weight: 4 },
  { name: L("Interior Design Basics", "مبانی طراحی داخلی"), weight: 4 },
  { name: L("Project Management", "مدیریت پروژه"), weight: 4 },
  { name: L("Personal Finance", "مدیریت مالی شخصی"), weight: 4 },
  { name: L("Copywriting", "کپی‌رایتینگ"), weight: 3 },
  { name: L("Social Media Strategy", "استراتژی شبکه‌های اجتماعی"), weight: 3 },
  { name: L("Illustration for Beginners", "تصویرسازی برای تازه‌کارها"), weight: 3 },
  { name: L("Branding Workshop", "کارگاه برندسازی"), weight: 3 },
  { name: L("Spoken Arabic A1", "مکالمهٔ عربی A1"), weight: 2 },
  { name: L("Time Management", "مدیریت زمان"), weight: 2 },
];
/** The most studied seven: the "top course" card and the "most studied" list. */
const POPULAR = COURSES.slice(0, 7);

const TEACHERS = [
  { name: L("Roya S.", "رویا س."), weight: 14 },
  { name: L("Daniel K.", "دنیل ک."), weight: 12 },
  { name: L("Shirin M.", "شیرین م."), weight: 11 },
  { name: L("Pouya H.", "پویا ه."), weight: 9 },
];

const DEVICES = [
  { name: L("Phone", "گوشی"), weight: 54 },
  { name: L("Laptop", "لپ‌تاپ"), weight: 37 },
  { name: L("Tablet", "تبلت"), weight: 9 },
];

const STUDENT_STATUS = [
  { id: "active", label: L("Active", "فعال"), tone: "success" as const, weight: 58 },
  { id: "paused", label: L("Paused", "متوقف"), tone: "warning" as const, weight: 14 },
  { id: "completed", label: L("Completed", "به پایان رسانده"), tone: "brand" as const, weight: 22 },
  { id: "dropped", label: L("Dropped", "انصراف"), tone: "neutral" as const, weight: 6 },
];

const COURSE_STATUS = [
  { id: "open", label: L("Enrolling", "در حال ثبت‌نام"), tone: "success" as const, weight: 60 },
  { id: "running", label: L("In session", "در حال برگزاری"), tone: "brand" as const, weight: 30 },
  { id: "draft", label: L("Draft", "پیش‌نویس"), tone: "neutral" as const, weight: 10 },
];

export const education: BusinessProfile = {
  id: "education",
  brand: BRANDS.education,
  seed: 0xed0c47,
  currency: "USD",
  reference: "2026-10-01",
  launched: "2024-09-01",
  week: [0.94, 1.1, 1.08, 1.05, 1.0, 0.82, 0.74],
  hours: [1.6, 0.8, 0.4, 0.3, 0.3, 0.6, 2, 4.2, 5.4, 4.6, 3.8, 3.6, 4, 4.4, 4, 3.8, 4.6, 6.4, 8.6, 10.4, 10.8, 9.2, 6.4, 3.4],
  series: {
    primary: { label: L("Lessons completed", "درس‌های کامل‌شده"), unit: L("lessons", "درس"), base: 5180, growth: 0.44, noise: 0.06 },
    secondary: { label: L("New enrolments", "ثبت‌نام‌های جدید"), unit: L("students", "دانشجو"), base: 86, growth: 0.3, noise: 0.14 },
  },
  streams: {
    video: { from: "primary", ratio: 0.21, noise: 0.06 },
    certificates: { from: "secondary", ratio: 0.41, noise: 0.14 },
  },
  perActive: { day: 2.4, d7: 7.6, d90: 46 },
  copy: {
    chartTitle: L("Learning activity", "فعالیت آموزشی"),
    chartSub: L("Lessons completed and new enrolments over the selected range", "درس‌های کامل‌شده و ثبت‌نام‌های جدید در بازهٔ انتخابی"),
    sparkMetric: L("New enrolments", "ثبت‌نام‌های جدید"),
    health: L("Platform health", "سلامت پلتفرم"),
  },
  kpis: [
    { id: "total", label: L("Students", "دانشجویان"), format: "number", upIsGood: true, value: (s) => ({ value: s.total, previous: null }) },
    { id: "active", label: L("Active learners, {days} days", "یادگیرندگان فعال، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.active, previous: s.prevActive }) },
    { id: "lessons", label: L("Lessons completed, {days} days", "درس کامل‌شده، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.cur("primary"), previous: s.prev("primary") }) },
    {
      id: "perLearner",
      label: L("Lessons per learner", "درس به ازای هر یادگیرنده"),
      format: "decimal",
      upIsGood: true,
      value: (s) => ({ value: s.cur("primary") / Math.max(1, s.active), previous: s.prev("primary") / Math.max(1, s.prevActive) }),
    },
    { id: "certificates", label: L("Certificates issued, {days} days", "گواهی‌های صادرشده، {days} روز"), format: "number", upIsGood: true, value: (s) => ({ value: s.cur("certificates"), previous: s.prev("certificates") }) },
  ],
  radar: [
    { label: L("Completion", "تکمیل دوره"), full: L("Students who finished their course", "دانشجویانی که دوره را تمام کردند"), base: 58, spread: 5 },
    { label: L("Quiz pass rate", "قبولی آزمونک"), full: L("Quizzes passed on the first try", "آزمونک‌های قبول‌شده در اولین تلاش"), base: 76, spread: 4 },
    { label: L("Week-2 return", "بازگشت هفتهٔ دوم"), full: L("Came back to learn in their second week", "در هفتهٔ دوم برای یادگیری برگشتند"), base: 63, spread: 5 },
    { label: L("Attendance", "حضور در کلاس زنده"), full: L("Seats filled in live sessions", "صندلی‌های پرشده در جلسه‌های زنده"), base: 69, spread: 6 },
  ],
  tops: [
    { label: L("Top course", "دورهٔ اول"), unit: L("lessons", "درس"), scope: "range", of: "primary", share: 0.55, items: POPULAR },
    { label: L("Top teacher", "مدرس برتر"), unit: L("students", "دانشجو"), scope: "allTime", of: "secondary", share: 0.42, items: TEACHERS },
    { label: L("Top device", "دستگاه اول"), unit: L("lessons", "درس"), scope: "range", of: "primary", share: 1, items: DEVICES },
  ],
  live: {
    online: { label: L("Learners online", "یادگیرندگان آنلاین"), ofLabel: L("active this week", "فعال در این هفته"), share: 0.09 },
    today: { label: L("Enrolments today", "ثبت‌نام‌های امروز"), ofLabel: L("this week", "این هفته") },
    lifetime: { label: L("Video hours watched", "ساعت ویدیوی تماشاشده"), sub: L("since launch", "از زمان راه‌اندازی"), stream: "video", format: "compact" },
  },
  health: [
    { id: "video", name: L("Video streaming", "پخش ویدیو"), kind: "latency", base: 96, warn: 350, side: true, flaky: 0.05 },
    { id: "lms", name: L("Course API", "API دوره‌ها"), kind: "latency", base: 74, warn: 260, side: true, flaky: 0.03 },
    { id: "quiz", name: L("Quiz engine", "موتور آزمونک"), kind: "latency", base: 58, warn: 220, side: true, flaky: 0.03 },
    { id: "email", name: L("Email delivery", "تحویل ایمیل"), kind: "percent", base: 99.2, warn: 97, side: true, flaky: 0.03 },
    { id: "live", name: L("Live classrooms", "کلاس‌های زنده"), kind: "nodes", base: 8, warn: 7, flaky: 0.05 },
  ],
  incidents: [
    { title: L("Buffering on evening video lessons", "توقف‌های پخش در درس‌های ویدیویی عصر"), service: "video", daysAgo: 5, minutes: 33 },
    { title: L("Quiz results saved late", "ذخیرهٔ دیرهنگام نتیجهٔ آزمونک‌ها"), service: "quiz", daysAgo: 21, minutes: 17 },
    { title: L("One live classroom server restarted", "راه‌اندازی دوبارهٔ یکی از سرورهای کلاس زنده"), service: "live", daysAgo: 46, minutes: 12 },
  ],
  growth: {
    cumulative: L("Students over time", "روند دانشجویان"),
    split: { title: L("New and returning learners", "یادگیرندگان جدید و بازگشتی"), sub: L("People who completed a lesson each day", "کسانی که هر روز درسی را تمام کردند"), fresh: L("New", "جدید"), returning: L("Returning", "بازگشتی") },
    funnel: {
      title: L("Learning funnel", "قیف یادگیری"),
      sub: L("From enrolling to finishing a course, this range", "از ثبت‌نام تا پایان دوره، در این بازه"),
      steps: [L("Enrolled", "ثبت‌نام کرد"), L("Started a lesson", "درسی را شروع کرد"), L("Finished week one", "هفتهٔ اول را تمام کرد"), L("Completed the course", "دوره را تمام کرد")],
      rates: [0.86, 0.69, 0.47],
    },
  },
  retention: {
    title: L("Weekly retention", "ماندگاری هفتگی"),
    sub: L("Share of each enrolment week that completed a lesson in each later week", "سهمی از هر هفتهٔ ثبت‌نام که در هفته‌های بعد درسی را تمام کرد"),
    curve: [0.86, 0.64, 0.41],
    distribution: {
      title: L("Lessons per learner", "درس به ازای هر یادگیرنده"),
      sub: L("Learners in this range, by how many lessons they completed", "یادگیرندگان این بازه، بر اساس تعداد درس"),
      buckets: [L("1–2", "۱ تا ۲"), L("3–5", "۳ تا ۵"), L("6–10", "۶ تا ۱۰"), L("11+", "۱۱ و بیشتر")],
      weights: [26, 31, 26, 17],
    },
  },
  behaviour: {
    heat: L("Lessons completed", "درس‌های کامل‌شده"),
    segments: { title: L("Lessons by device", "درس‌ها بر اساس دستگاه"), sub: L("Share of lessons in this range", "سهم از درس‌های این بازه"), items: DEVICES },
    list: { title: L("Most studied courses", "پرمخاطب‌ترین دوره‌ها"), sub: L("Lessons completed in this range", "درس کامل‌شده در این بازه"), items: POPULAR },
  },
  entities: [
    {
      id: "students",
      path: "students",
      label: L("Students", "دانشجویان"),
      things: L("students", "دانشجویان"),
      icon: "graduation",
      count: 240,
      statuses: STUDENT_STATUS,
      filter: { column: "course", label: L("Course", "دوره") },
      sort: { column: "last", dir: "desc" },
      trend: { label: L("Lessons per day", "درس در روز"), base: 2 },
      span: { from: "enrolled", to: "last" },
      activity: [
        L("Completed lesson {n}", "درس {n} را تمام کرد"),
        L("Passed a quiz", "در یک آزمونک قبول شد"),
        L("Joined a live session", "در یک جلسهٔ زنده شرکت کرد"),
        L("Asked a question in the forum", "در انجمن سؤالی پرسید"),
      ],
      columns: [
        { id: "student", label: L("Student", "دانشجو"), kind: "person", gen: (r, _row, c) => g.person(r, c.index) },
        { id: "course", label: L("Course", "دوره"), kind: "enum", gen: (r) => g.weighted(r, COURSES) },
        // Completed is 100% and nothing else is; a paused or dropped student has not been back for a while;
        // and the enrolment comes before the last lesson, by at least as long as the progress took.
        { id: "progress", label: L("Progress", "پیشرفت"), kind: "progress", gen: (r) => (r.next() < 0.2 ? 100 : g.pct(r, 3, 97, 0)) },
        {
          id: "status",
          label: L("Status", "وضعیت"),
          kind: "status",
          gen: (r, row) => (row.progress === 100 ? "completed" : g.statusAmong(r, STUDENT_STATUS, ["active", "paused", "dropped"])),
        },
        {
          id: "last",
          label: L("Last lesson", "آخرین درس"),
          kind: "ago",
          gen: (r, row, c) =>
            row.status === "dropped" ? g.agoBetween(r, c.now, 30, 120) : row.status === "paused" ? g.agoBetween(r, c.now, 10, 45) : row.status === "completed" ? g.agoBetween(r, c.now, 0, 60) : g.agoBetween(r, c.now, 0, 6),
        },
        {
          id: "enrolled",
          label: L("Enrolled", "ثبت‌نام"),
          kind: "ago",
          gen: (r, row, c) => {
            const since = (c.now.getTime() - (row.last as number)) / 86_400_000;
            return g.agoBetween(r, c.now, since + 1 + (row.progress as number) * 0.9, since + 30 + (row.progress as number) * 2.4);
          },
          secondary: true,
        },
      ],
    },
    {
      id: "courses",
      path: "courses",
      label: L("Courses", "دوره‌ها"),
      things: L("courses", "دوره‌ها"),
      icon: "book",
      count: COURSES.length,
      statuses: COURSE_STATUS,
      filter: { column: "teacher", label: L("Teacher", "مدرس") },
      sort: { column: "students", dir: "desc" },
      trend: { label: L("Lessons completed per day", "درس کامل‌شده در روز"), base: 12, per: "students" },
      quiet: ["draft"],
      activity: [
        L("Published lesson {n}", "درس {n} منتشر شد"),
        L("Added a downloadable worksheet", "یک کاربرگ قابل دانلود اضافه شد"),
        L("Answered {n} forum questions", "به {n} سؤال انجمن پاسخ داده شد"),
        L("Scheduled a live session", "یک جلسهٔ زنده زمان‌بندی شد"),
      ],
      columns: [
        { id: "course", label: L("Course", "دوره"), kind: "enum", gen: (_r, _row, c) => COURSES[c.index % COURSES.length].name },
        { id: "teacher", label: L("Teacher", "مدرس"), kind: "enum", gen: (r) => g.weighted(r, TEACHERS) },
        // The catalogue's last three are still drafts: no students, so no completion and no rating yet.
        { id: "status", label: L("Status", "وضعیت"), kind: "status", gen: (r, _row, c) => (c.index >= COURSES.length - 3 ? "draft" : g.statusAmong(r, COURSE_STATUS, ["open", "running"])) },
        // In step with the catalogue's weights, so the most studied courses on the dashboard lead this table too.
        {
          id: "students",
          label: L("Students", "دانشجویان"),
          kind: "number",
          gen: (r, row, c) => (row.status === "draft" ? 0 : g.count(r, COURSES[c.index % COURSES.length].weight * 58, 0.18, 20)),
        },
        { id: "completion", label: L("Completion", "تکمیل"), kind: "percent", gen: (r, row) => (row.status === "draft" ? null : g.pct(r, 38, 81)) },
        { id: "rating", label: L("Rating", "امتیاز"), kind: "rating", gen: (r, row) => (row.status === "draft" ? null : g.rating(r)), secondary: true },
      ],
    },
  ],
};
