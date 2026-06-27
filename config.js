/* =============================================================================
   إعدادات وكيل التقرير اليومي — لوحة قيادة الوزير
   هذا هو الملف الوحيد الذي تحتاج تعديله لربط مصادرك الفعلية.
   املأ الخانات المعلّمة بـ "TODO". الباقي يعمل تلقائياً.
   ============================================================================= */

module.exports = {

  /* ---------------------------------------------------------------------------
     1) مصادر البيانات لكل منظومة
     ---------------------------------------------------------------------------
     لكل تطبيق: حدّد type ثم بيانات الوصول.
       type:"firebase"  → يقرأ من Firebase RTDB عبر REST
       type:"sheet"     → يقرأ من Google Sheet منشور كـ CSV
       type:"none"      → لا مصدر بعد (يُتجاهَل بهدوء)

     لكل مصدر "metrics": تعريف المؤشرات التي نريد سحبها.
       key   : اسم المؤشر داخل التقرير
       path  : (firebase) مسار القيمة داخل قاعدة البيانات، مثل "kpis/waterLevel"
       column: (sheet) اسم العمود في الـ CSV
       agg   : كيفية التلخيص لو القيمة سلسلة: "last" | "max" | "min" | "avg" | "count"
       unit  : وحدة العرض
       thresholds: { warn: رقم, danger: رقم } لتلوين الحالة (اختياري)
  --------------------------------------------------------------------------- */
  sources: [

    {
      id: "nile",
      name: "التوأم الرقمي للنيل",
      type: "firebase",                                    // TODO: غيّرها لو المصدر مختلف
      firebaseUrl: "",                                     // TODO: مثال "https://nile-xxxx-default-rtdb.firebaseio.com"
      metrics: [
        { key: "discharge", label: "التصرف اللحظي", path: "kpis/discharge", agg: "last", unit: "م³/ث", thresholds: { warn: 3000, danger: 3500 } },
        { key: "stations",  label: "محطات متصلة",   path: "kpis/stationsOnline", agg: "last", unit: "محطة" }
      ]
    },

    {
      id: "ismailia_new",
      name: "ترعة الإسماعيلية الجديدة",
      type: "firebase",                                    // TODO
      firebaseUrl: "",                                     // TODO
      metrics: [
        { key: "waterLevel", label: "منسوب أمامي", path: "kpis/waterLevel", agg: "last", unit: "م", thresholds: { warn: 16.2, danger: 16.6 } }
      ]
    },

    {
      id: "ismailia_old",
      name: "ترعة الإسماعيلية القديمة",
      type: "none",                                        // TODO: فعّلها عند الجاهزية
      firebaseUrl: "",
      metrics: []
    },

    {
      id: "suez",
      name: "التوأم الرقمي لترعة السويس",
      type: "firebase",                                    // TODO
      firebaseUrl: "",                                     // TODO
      metrics: [
        { key: "flow", label: "تصرف منيِّف", path: "kpis/manyefFlow", agg: "last", unit: "م³/ث" }
      ]
    },

    {
      id: "giza",
      name: "لوحة ري الجيزة",
      type: "sheet",                                       // TODO: غيّرها لو مختلفة
      sheetCsvUrl: "",                                     // TODO: رابط Google Sheet المنشور كـ CSV (File→Share→Publish to web→CSV)
      metrics: [
        { key: "complaints", label: "شكاوى اليوم", column: "complaints_today", agg: "last", unit: "بلاغ" },
        { key: "shifts",     label: "مناوبات نشطة", column: "active_shifts", agg: "last", unit: "وردية" }
      ]
    },

    {
      id: "tired",
      name: "سجل الترع المتعبة",
      type: "sheet",                                       // TODO
      sheetCsvUrl: "",                                     // TODO
      metrics: [
        { key: "registered", label: "ترع مسجّلة", column: "canal_id", agg: "count", unit: "ترعة" }
      ]
    }

  ],

  /* ---------------------------------------------------------------------------
     2) محرّك التعليق
     mode: "rule"  → محرّك قاعدي مجاني (الافتراضي)
           "claude"→ تعليق ذكي عبر Claude API (يتطلب سر ANTHROPIC_API_KEY)
  --------------------------------------------------------------------------- */
  commentary: {
    mode: "rule",                                          // بدّلها لـ "claude" لاحقاً
    claudeModel: "claude-opus-4-8"
  },

  /* ---------------------------------------------------------------------------
     3) إعدادات عامة
  --------------------------------------------------------------------------- */
  output: {
    file: "daily-report.json",                             // يُكتب في جذر الـ repo، واللوحة تقرأه
    timezone: "Africa/Cairo"
  }
};
