// الـ migrations والبيانات الأولية بتشتغل بس ببناء الإنتاج (أو محلياً).
// نسخ المعاينة على Vercel (Preview) ممكن تكون مربوطة بنفس قاعدة الإنتاج، فما بتلمسها.
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
if (env && env !== "production") {
  console.log(`[build] بيئة ${env}: تخطّي migrate و seed عشان ما ننلمس قاعدة الإنتاج.`);
  process.exit(0);
}
execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
