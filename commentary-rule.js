/* =============================================================================
   المحرّك القاعدي للتعليق — يحوّل الأرقام إلى فقرة عربية دون أي خدمة خارجية.
   منطق: يفحص كل مؤشر مقابل عتباته، يصنّف الحالة، ويركّب جملاً قالبية.
   ============================================================================= */

function statusOf(value, thresholds) {
  if (!thresholds || value == null || isNaN(value)) return "normal";
  if (thresholds.danger != null && value >= thresholds.danger) return "danger";
  if (thresholds.warn != null && value >= thresholds.warn) return "warn";
  return "normal";
}

function fmt(v) {
  if (v == null || isNaN(v)) return "—";
  var n = Number(v);
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString("en-US");
  return (Math.round(n * 10) / 10).toString();
}

/* يبني تعليقاً لكل منظومة على حدة */
function commentForSystem(sys) {
  var parts = [];
  var flags = { danger: 0, warn: 0, normal: 0, missing: 0 };

  sys.metrics.forEach(function (m) {
    if (m.value == null || isNaN(m.value)) { flags.missing++; return; }
    var st = statusOf(m.value, m.thresholds);
    flags[st]++;
    if (st === "danger") {
      parts.push(m.label + " بلغ " + fmt(m.value) + " " + (m.unit || "") + " (تجاوز حدّ الخطر — يلزم تدخّل)");
    } else if (st === "warn") {
      parts.push(m.label + " عند " + fmt(m.value) + " " + (m.unit || "") + " (أعلى من المعتاد — يُنصح بالمراقبة)");
    }
  });

  var headline;
  if (flags.danger > 0) headline = "حالة حرجة";
  else if (flags.warn > 0) headline = "تتطلب مراقبة";
  else if (flags.normal > 0) headline = "ضمن الطبيعي";
  else headline = "لا توجد بيانات";

  var text;
  if (flags.danger > 0 || flags.warn > 0) {
    text = parts.join("؛ ") + ".";
  } else if (flags.normal > 0) {
    text = "جميع المؤشرات ضمن النطاق المعتاد.";
  } else {
    text = "لم تتوفّر قراءات لهذه المنظومة اليوم.";
  }

  return { id: sys.id, name: sys.name, status: headline, note: text, flags: flags };
}

/* يبني الملخّص التنفيذي العام أعلى التقرير */
function executiveSummary(systems) {
  var totalDanger = 0, totalWarn = 0, active = 0, offline = 0;
  systems.forEach(function (s) {
    var anyData = s.metrics.some(function (m) { return m.value != null && !isNaN(m.value); });
    if (anyData) active++; else offline++;
    s.metrics.forEach(function (m) {
      var st = statusOf(m.value, m.thresholds);
      if (st === "danger") totalDanger++;
      if (st === "warn") totalWarn++;
    });
  });

  var overall;
  if (totalDanger > 0) overall = "حالة حرجة تستدعي المتابعة الفورية";
  else if (totalWarn > 0) overall = "وضع مستقر مع مؤشرات تحتاج مراقبة";
  else overall = "الوضع العام مستقر وضمن المعدلات الطبيعية";

  var sentence = "تقرير الوضع الهيدروليكي: " + overall + ". ";
  sentence += "عدد المنظومات النشطة " + active + " من " + systems.length + ". ";
  if (totalDanger) sentence += "إنذارات حرجة: " + totalDanger + ". ";
  if (totalWarn) sentence += "تنبيهات مراقبة: " + totalWarn + ". ";
  if (!totalDanger && !totalWarn) sentence += "لا توجد إنذارات تشغيلية. ";

  return {
    overall: overall,
    activeCount: active,
    offlineCount: offline,
    dangerCount: totalDanger,
    warnCount: totalWarn,
    text: sentence.trim()
  };
}

module.exports = { commentForSystem, executiveSummary, statusOf, fmt };
