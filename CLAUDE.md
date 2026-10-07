# sed.mehdi: دستور کار Claude در این ریپو

## پروژه
- پورتفولیوی Mehdi روی sedmehdi.com. سایت با Astro 7 ساخته می‌شود و خروجی‌اش استاتیک است. زبان سایت انگلیسی است و به اسم واقعی Mehdi منتشر می‌شود.
- دموی Spindle Admin Kit در `apps/admin-demo/` است: React، Vite، Tailwind و hash routing. روی سایت در مسیر `/lab/admin/` بالا می‌آید.
- ریپو عمومی است. هیچ راز، IP سرور، دامنهٔ پنل، دادهٔ واقعی کاربر یا اطلاعات شخصی وارد آن نشود.
- کار در چت Claude با ریپوی وصل‌شده انجام می‌شود. تغییر فقط از راه branch و PR وارد می‌شود و merge با خود Mehdi است.

## کار با Mehdi
- **زبان:** فارسی و مستقیم. کد، مسیرها و پیام کامیت انگلیسی باشند.
- **برنامه قبل از اجرا:** اول برنامه بده، بعد با تأیید Mehdi قدم‌به‌قدم اجرا کن. برای هر تصمیم طراحی سه گزینه بساز.
- **اجرا به‌جای استدلال:** هر چه قابل اجراست، اجرا کن. چیزی را که می‌شود اجرا کرد، از روی استدلال ادعا نکن.
- **تست غیر vacuous:** هر تست اول روی وضعیت خراب اجرا شود و شکست بخورد، بعد رفع بیاید.
- **ادعا با شماره‌خط:** هر ادعا با فایل و شماره‌خط بیاید. برای موردی که باگ نیست، دلیلش را با «باگ نیست، چون…» بنویس.
- **اعمال:** برای هر تغییر بگو اعمالش چه لازم دارد: merge، build، DNS یا کلیک در Settings.
- **مخالفت:** اگر نتیجه از داده جلوتر رفته یا فرض Mehdi غلط است، همان لحظه و صریح مخالفت کن.
- **دستورهای سرور:** مقدارها کامل و literal باشند، بدون placeholder. هر مقداری که نداری را بپرس.
- **وقت عمل:** وقتی موقع اقدام است، قدم‌های دقیق را به ترتیب بده، نه فهرست گزینه‌ها.
- **انتقال گفتگو:** نزدیک خلاصه شدن گفتگو، بدون اینکه بخواهد، یک فایل markdown انتقال بده.

## محتوا (تصمیم‌های Mehdi)
- **DUMMY CONTENT:** بخش‌هایی که این برچسب را دارند (About، ایمیل، تلگرام، تجربه‌ها، مهارت‌ها در `src/data/site.ts` و `public/resume.pdf`) فعلاً می‌مانند. هر وقت Mehdi گفت، عوض شوند.
- **GozarX:** کلمهٔ VPN مجاز است. هر چه دربارهٔ کد GozarX گفته می‌شود باید با ریپوی github.com/BoofKoor/GozarX بخواند. آن ریپو لایسنس ندارد، پس open source نامیده نمی‌شود.
- **دموی ادمین:** عمداً از VPN جداست. کسب‌وکار پیش‌فرضش Nodemill (هاستینگ) است و هیچ واژهٔ VPN در آن نمی‌ماند. بررسی `words` و تست واحد RETIRED این را نگه می‌دارند.

## هویت بصری (تأییدشده؛ هر تغییر با تأیید Mehdi)
- **شش‌ضلعی:** فقط در پس‌زمینه و خود لوگو. رابط کاربری گوشه‌گرد است و رنگ‌هایش ملایم.
- **کورال:**
  - `--color-tint: #EA5555` برای گرافیک، متن درشت و نقطهٔ لوگوتایپ.
  - متن کوچک کورال و لینک‌ها در تم روشن `#C9393C` است (تأیید اکتبر ۲۰۲۶)، در تم تیره `#EA5555`.
  - با Increase Contrast در تم روشن `#B8282B` و در تم تیره `#FF8080`.
- **توکن‌ها:** نقش‌های رنگ به سبک Apple HIG در `src/styles/tokens.css` هستند. مقدار خام رنگ در CSS نیاید.
- **فونت:** DM Sans، self-host در `public/fonts/`. DM Mono فقط برای کد است.
- **دسترس‌پذیری:**
  - کنتراست AA روی پس‌زمینهٔ واقعی: ۴٫۵ برای متن و ۳ برای اجزای غیرمتنی.
  - هدف لمسی ۴۴px.
  - احترام به Reduce Motion، Increase Contrast و Dark Mode.
- **دسکتاپ:** پشتهٔ چسبان کارت‌ها.
- **گوشی (≤720px):** کاروسل، tab bar شیشه‌ای، و facts به‌شکل کاشی.
- تغییر گوشی نباید دسکتاپ را عوض کند و برعکس.

## ساختار
- **پروژه‌ها:** `src/content/projects/*.md`. front matter مشخصات را نگه می‌دارد (`order`، `accent`، `logo`، `cover`، `demo`) و بدنهٔ فایل خود کیس‌استادی است.
- **عددهای Spindle:** عددهای «The numbers» در `src/content/projects/spindle.md` را بررسی `numbers` در `check_admin_demo.py` با build مقایسه می‌کند. بعد از تغییر تست‌ها یا باندل به‌روزشان کن.
- **دمو:** هر کسب‌وکار یک `BusinessProfile` در `apps/admin-demo/src/profiles/` است. داده‌ها ساختگی و seeded هستند. عددهای «امروز» با ساعت رشد می‌کنند، پس برای مقایسهٔ دو بارگذاری ساعت را ثابت کن (`page.clock.set_fixed_time`).

## دستورها
- `npm ci`، بعد `npm run build`: سایت را می‌سازد و دمو را در `dist/lab/admin/`.
- `npm run test:demo`: type check و تست‌های واحد دمو.
- `npm run single-file`: فایل `preview/sed-mehdi-preview.html` را می‌سازد.
  - فقط `astro build` اجرا می‌کند و `dist/lab/admin/` را پاک می‌کند. بعد از آن دوباره `npm run build` بزن.
- `npm run demo:single`: فایل `preview/spindle-admin-demo.html` را می‌سازد.
- **QA در `scripts/qa/`:**
  - اول سرور را بالا بیاور: `python3 scripts/qa/serve.py dist 4321 &`
  - `python3 scripts/qa/check_site.py http://localhost:4321 LABEL`
  - `python3 scripts/qa/check_admin_demo.py http://localhost:4321 [--prove] [--only a,b]`
  - `python3 scripts/qa/audit.py http://localhost:4321 [--demo] --widths W --themes T --json out.json`
    - هر عرض در هر تم یک تکه است. نتیجهٔ تکه‌ها را با `--merge` جمع بزن.
  - `python3 scripts/qa/check_single.py "$PWD/preview/sed-mehdi-preview.html" "$PWD/dist"`
  - `python3 scripts/qa/check_single_phone.py "$PWD/preview/sed-mehdi-preview.html"`
  - `python3 scripts/qa/check_demo_single.py "$PWD/preview/spindle-admin-demo.html" [--prove]`
- **زمان اجرا:** هر اسکریپت ۱ تا ۵ دقیقه طول می‌کشد. هر کدام را در فرمان جدا اجرا کن، با سقف حدود ۳۰۰ ثانیه. `--prove` کامل دمو بیش از ۱۰ دقیقه است، پس با `--only` گروه‌گروه اجرا شود.
- **کد خروج:** همهٔ اسکریپت‌ها روی خطا با کد ۱ خارج می‌شوند.

## درس‌های اجرایی (هر کدام یک باگ واقعی بوده)
- **ارتفاع درصدی در grid یا flex:** فقط وقتی کار می‌کند که track یا ارتفاع ظرف معین باشد. ردیف `auto` ارتفاع نامعین دارد.
- **متن aria-hidden:** اگر روی صفحه دیده می‌شود، کنتراستش هم سنجیده شود.
- **کنتراست روی گرادیان:** پس‌زمینهٔ گرادیان `backgroundColor` را شفاف گزارش می‌کند، پس stopهای گرادیان را بخوان.
- **هندسهٔ عنصر scale‌شده:** با `rect.width / offsetWidth` به transform آگاه باش.
- **ناحیهٔ کلیک:** padding عمودی روی عنصر inline به ردیف بعد نفوذ می‌کند. همپوشانی ناحیهٔ کلیک را بسنج.
- **متن لاتین داخل فارسی:** شناسه، کد یا دامنه باید با `dir="ltr"` و `unicode-bidi: isolate` جدا شود، وگرنه `@` و `-` جابه‌جا می‌شوند.
- **منتظر ماندن بعد از کلیک:** بعد از کلیکی که صفحه را عوض می‌کند، منتظر آدرس جدید بمان (`wait_for_url`)، نه `wait_for_load_state`. صفحهٔ قدیم از قبل idle است.
- **`pkill -f "<الگو>"`:** اگر الگو در خط فرمان خود شل باشد، شل را هم می‌کشد. از `[s]erve` یا PID استفاده کن.
- **blur شیشه:** Chromium هدلس آن را کامل رندر نمی‌کند. شیشه را روی دستگاه واقعی قضاوت کن.
- **Markdown در Astro 7:** پردازشگر Sätteri است. افزونه را از راه integration و `processor.options.hastPlugins` اضافه کن، نه با `rehypePlugins`.

## انتشار
- **GitHub Pages:** push به `main` فایل `.github/workflows/deploy.yml` را اجرا می‌کند (Node 22) و `dist/` منتشر می‌شود.
- **دامنه:** sedmehdi.com در Settings › Pages › Custom domain ست شده است. Actions فایل `public/CNAME` را نادیده می‌گیرد.
- **DNS در Porkbun:**
  - چهار رکورد A و چهار رکورد AAAA گیت‌هاب روی ریشه.
  - CNAME برای `www` به `boofkoor.github.io`.
  - TXT تأیید دامنه (`_github-pages-challenge-boofkoor`) که باید بماند.
  - MX فعلاً ندارد.
- **کامیت نشوند:** `dist/` و `preview/`.
- **سرور شخصی:** `Dockerfile`، `nginx.conf` و `docker-compose.yml` برای بعد نگه داشته شده‌اند. اگر روزی لازم شد، روی یک VPS جدا باشد که کار دیگری ندارد.
