-- هوية «فضاء ونجوم» (اختيار عمر، 20 نوفمبر 2026): الوضع الافتراضي صار ليلي (السما بالنجوم).
ALTER TABLE "Settings" ALTER COLUMN "theme" SET DEFAULT 'dark';
UPDATE "Settings" SET "theme" = 'dark';
