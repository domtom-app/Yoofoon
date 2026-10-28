<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Yoofoon (يوفون) — ذاكرة المشروع

تطبيق PWA عربي RTL للموبايل أولاً: Next.js 16 (`cacheComponents`) + Supabase + Tailwind 4/shadcn (Base UI). المستخدم مصري ويتحدث بالعربية: رُدّ بالعربية وباختصار.

## قواعد المستخدم
- نصوص واجهة قليلة ومهنية؛ بلا بقايا تجارب؛ لا كود مكسور.
- RTL: انتبه للمسافات حول الأيقونات وأسهم select واستخدم `start`/`end`.
- اقترح واسأل عند الغموض دون إفراط (`ask_user`).
- بعد كل تعديل: `npx tsc --noEmit` و`npx eslint src` (وvitest أحياناً). المستخدم ينفّذ ملفات SQL بنفسه في Supabase SQL Editor؛ أتحقق بسكربت node يقرأ `.env.local` (لا تطبع المفاتيح).

## الميزات
- دخول بالهاتف+كلمة مرور (اختياري)، تصويت رئاسي وبرلماني (حسب الدائرة ونوافذ زمنية)، ملف شخصي، لوحة أدمن، وقسم «فيد واستفيد» (الإعلانات) في `/tips`.
- الهرمية: محافظة ← مركز ← دائرة. الأصوات مربوطة بالحساب، مع خيار «منشور للعامة».

## فيد واستفيد (الإعلانات)
- جداول `tips`, `tip_nominations` وview `tip_results` (الأعمدة تُضاف في النهاية فقط بسبب `create or replace view`): id, title, body, photo_path, approved, created_at, votes, governorate_id, center_id, district_id, link, offer, expires_at, user_id.
- الأدمن ينشئ إعلاناً معتمداً بلا `user_id`؛ إعلان المستخدم يحتاج موافقة، وأي تعديل منه يعيده للمراجعة.
- الترتيب: محافظتي أولاً، ثم «كل مصر»، ثم الباقي؛ وتثبيت أعلى 3 ترشيحاً في محافظتي (خلال 7 أيام).
- الانتهاء: العرض (خصم/مجاني) 15 يوماً؛ بلا عرض 7 أيام، أو 3 أيام إن زاد عدد إعلانات المحافظة عن 100. الحذف الفعلي يومياً عبر `/api/cron/purge-tips` (`CRON_SECRET` + `vercel.json`).
- الترشيح: لإعلانات محافظتي فقط، وحد 10 ترشيحات/24 ساعة، والإعلان غير المنتهي فقط.
- صفحة المعلن `/advertiser/[tipId]` (بمعرّف الإعلان لا المستخدم). الرقم يظهر فقط إن كان `profiles.phone_public=true`، وهو مخفي حتى عن صاحبه في الملف والقائمة إن لم يُعلَّم.
- بطاقات الإعلان في الملف (`AdvertCard owner`): النسبة والعدد في سطر واحد فوق الشريط، والوصف تحته بكتابة حرفاً حرفاً (حتى 6 أسطر)، وأزرار تعديل/حذف للمالك (`canManage` في `actions/tips.ts`).
- الشارات: «مجاني» (`bg-primary`) و«خصم» (`bg-secondary-foreground`) نص أبيض بلا أيقونة.
- ملفات أساسية: `src/lib/tips-data.ts`, `src/app/actions/tips.ts`, `src/components/{tips-section,advert-card,typewriter,advertiser-header,back-button,candidate-cards,profile-view,admin-tips,page-shell,main-menu}.tsx`.

## ملاحظات تقنية
- Next 16: كل ما يقرأ cookies/auth/Date داخل `<Suspense>` بعد `await connection()`؛ `params` وعد؛ `middleware` اسمه `proxy.ts`.
- الوصول للقاعدة عبر server actions بعميل service-role (`createAdminClient`)؛ RLS مفعّل. الصور في bucket عام `candidates`.
- Base UI Button كرابط: `render={<Link/>} nativeButton={false}`. قاعدة lint: `react-hooks/set-state-in-effect`.
- Windows PowerShell 5.1: لا `&&`؛ المجلدات ذات الأقواس تحتاج `[IO.Directory]::CreateDirectory`. بعد build احذف `.next` و`tsconfig.tsbuildinfo`.
- المهاجرات في `supabase/migrations` (آخرها `20261028140000_profile_phone_public.sql`، وكلها مطبّقة).

## المتبقي / مقترحات
- ضبط `CRON_SECRET` في Vercel (لم يتم بعد).
- التحقق بصرياً: زر العودة، صورة الإعلان 4:5، رأس المعلن، الكتابة حرفاً حرفاً، إخفاء الرقم، الشارات.
- التالي المتفق عليه: البند 6 زر «الإبلاغ عن إعلان مخالف»، ثم 7 إشعار المستخدم بنتيجة المراجعة.
- قرارات معلّقة: إبقاء «فيد واستفيد» في الرئيسية/البرلمان أم `/tips` فقط؛ صفحة لإعلانات الأدمن بلا مالك؛ توحيد تصميم بطاقات التصويت مع بطاقة الإعلان (نسبة/عدد في سطر).
- تنظيف بيانات التجربة؛ تجربة تغيير الرقم؛ تطبيق `PhotoField` على نماذج المرشحين/الأعضاء؛ إعادة تفعيل «منشور للعامة» للرئاسي إن لزم.
