# وكيل التقرير اليومي — لوحة قيادة الوزير

وكيل يعمل تلقائياً كل صباح، يقرأ بيانات منظوماتك (Firebase + Google Sheets)، يلخّص المؤشرات، يولّد تعليقاً عربياً، ويكتب `daily-report.json`. لوحة الوزير تقرأ هذا الملف وتعرض بطاقة "تقرير اليوم".

## الملفات
```
scripts/config.js           ← الوحيد الذي تملؤه: مصادرك ومؤشراتك
scripts/agent.js            ← السكربت الرئيسي (لا حاجة لتعديله)
scripts/commentary-rule.js  ← محرّك التعليق القاعدي (مجاني)
.github/workflows/daily-report.yml ← الجدولة اليومية
daily-report.example.json   ← مثال للشكل الناتج
```

## خطوات التشغيل

### 1) ضع الملفات في مستودع لوحة الوزير
انسخ مجلد `scripts/`، ومجلد `.github/`، و`package.json` إلى جذر مستودع `wazir-console` (نفس مكان `index.html`).

### 2) املأ مصادرك في `scripts/config.js`
لكل منظومة، عدّل الخانات المعلّمة بـ `TODO`:
- **Firebase**: ضع `firebaseUrl` ومسار كل مؤشر في `path`.
- **Google Sheets**: انشُر الشيت كـ CSV (File ← Share ← Publish to web ← اختر CSV)، وضع الرابط في `sheetCsvUrl` واسم العمود في `column`.
- اضبط `thresholds` (warn/danger) لكل مؤشر تريد تلوين حالته.

### 3) فعّل التشغيل التلقائي
الملف `.github/workflows/daily-report.yml` يعمل يومياً 6 صباحاً بتوقيت القاهرة. لا يحتاج إعداداً إضافياً — يكتب التقرير ويحفظه في المستودع تلقائياً.

لتجربته فوراً: من تبويب **Actions** في المستودع ← اختر "التقرير اليومي للوزير" ← **Run workflow**.

### 4) (اختياري) ترقية التعليق إلى ذكاء Claude
في `config.js` غيّر `commentary.mode` إلى `"claude"`، ثم في المستودع:
Settings ← Secrets and variables ← Actions ← New repository secret
بالاسم `ANTHROPIC_API_KEY` وقيمته مفتاحك. عند الفشل يرجع تلقائياً للمحرّك القاعدي.

## تشغيل محلي للاختبار
```
node scripts/agent.js
```
ينتج `daily-report.json` في المجلد الحالي.

## ملاحظات
- المؤشرات بدون مصدر (type:"none" أو خانات فارغة) تُتجاهَل بهدوء ولا تكسر التقرير.
- بطاقة "تقرير اليوم" في اللوحة تعمل عبر HTTP (GitHub Pages)؛ لا تظهر عند فتح الملف محلياً بـ file:// بسبب قيود المتصفح.
- لتغيير موعد التشغيل، عدّل سطر `cron` في ملف الـ workflow (بتوقيت UTC).
