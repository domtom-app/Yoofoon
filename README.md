# Yoofoon

تطبيق ويب (PWA) مبني بـ Next.js 16 وReact 19 وTypeScript وTailwind CSS 4.

## التقنيات

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn + Base UI · Lucide ·
Supabase (قاعدة البيانات والتخزين) · Zod · Cloudflare Turnstile · Upstash Ratelimit ·
Vitest + Playwright · Sentry · ESLint · Vercel · npm

## التشغيل

```bash
npm install
cp .env.example .env.local   # ثم عبّئ المفاتيح
npm run dev
```

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل بيئة التطوير |
| `npm run build` / `npm start` | بناء الإنتاج وتشغيله |
| `npm run lint` | فحص ESLint |
| `npm run typecheck` | فحص TypeScript |
| `npm test` | اختبارات Vitest |
| `npm run test:e2e` | اختبارات Playwright |

## متغيرات البيئة

القائمة الكاملة في [.env.example](./.env.example).

## ملاحظات

- الواجهة عربية (`lang="ar"`, `dir="rtl"`) بخط Cairo؛ لا تستخدم `letter-spacing` على النص العربي.
- الـ service worker يعمل في وضع الإنتاج فقط.
- أضف مكوّنات shadcn بـ `npx shadcn@latest add <name>`.
