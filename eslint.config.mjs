import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // دوال اللياقة (Fundamentals): قاعدة الاعتمادية (Clean Architecture، ADR-002)
  {
    files: ["src/modules/*/domain/**/*.ts", "src/shared/kernel/**/*.ts", "src/platform/backup/format.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@prisma/client", "next", "next/*", "react", "react-dom", "@/lib/*", "@/app/*", "@/components/*", "@/shared/db"], message: "منطق المجال نقي: ما بيعرف قاعدة البيانات ولا الواجهة (ADR-002)" },
          { group: ["**/application/*", "**/queries", "**/server"], message: "المجال ما بيعتمد على الطبقات الي فوقه" },
        ],
      }],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/modules/*/domain/*", "@/modules/*/application/*"], message: "من برّا الوحدة: استورد من index أو server بس" }],
      }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
