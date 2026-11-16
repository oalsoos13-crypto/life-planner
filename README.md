# خطتي: تطبيق تخطيط الحياة

تطبيق ويب شخصي (PWA) بالعربي لتخطيط الحياة: «الاستراتيجية» و«التقرير الأسبوعي». مستخدم واحد، دخول بكلمة سر.

**الحالة:** المرحلة 1 (التقرير الأسبوعي) جاهزة. المراحل الجاية: (2) الاستراتيجية والنسب، (3) الربط والأتمتة، (4) الخريطة والتقارير والإشعارات.

## التقنيات
Next.js 15 (App Router) + TypeScript + Tailwind 4 + Prisma + PostgreSQL. خط Tajawal، RTL، وضع ليلي.

## النشر على Vercel (مجاناً)
1. على [vercel.com](https://vercel.com) اعمل **Add New → Project** واختار هالمستودع.
2. قبل ما تكبس Deploy، من **Storage** أضف قاعدة **Neon Postgres** واربطها بالمشروع (بتحط `DATABASE_URL` و `DATABASE_URL_UNPOOLED` لحالها).
3. بـ **Environment Variables** أضف:
   - `APP_PASSWORD`: كلمة السر الي بتدخل فيها.
   - `AUTH_SECRET`: أي نص طويل عشوائي.
4. Deploy. أول بناء بيعمل الجداول وبيحمّل الخطة الأولى لحالها (مرة وحدة بس).

## تشغيل محلي
```bash
cp .env.example .env   # وعدّل القيم
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## البيانات
- تصدير JSON (نسخة احتياطية كاملة) و Excel من صفحة الإعدادات، واسترجاع من JSON.
- نموذج البيانات بـ `prisma/schema.prisma` مصمّم لكل المراحل.
