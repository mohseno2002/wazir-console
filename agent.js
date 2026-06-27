/* =============================================================================
   وكيل التقرير اليومي — لوحة قيادة الوزير
   يقرأ مصادر البيانات (Firebase RTDB + Google Sheets)، يلخّص المؤشرات،
   يولّد تعليقاً، ويكتب daily-report.json في جذر المستودع.

   التشغيل محلياً:  node scripts/agent.js
   التشغيل سحابياً: عبر GitHub Actions (راجع .github/workflows/daily-report.yml)
   ============================================================================= */

"use strict";

var fs = require("fs");
var path = require("path");
var cfg = require("./config.js");
var ruleEngine = require("./commentary-rule.js");

/* ---------- أدوات مساعدة ---------- */

function nowCairo() {
  var d = new Date();
  var fmt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    timeZone: cfg.output.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  return { iso: d.toISOString(), display: fmt.format(d) };
}

function aggregate(values, how) {
  var nums = values.map(Number).filter(function (n) { return !isNaN(n); });
  if (how === "count") return values.length;
  if (nums.length === 0) return null;
  switch (how) {
    case "max": return Math.max.apply(null, nums);
    case "min": return Math.min.apply(null, nums);
    case "avg": return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
    case "last":
    default: return nums[nums.length - 1];
  }
}

/* ---------- قارئ Firebase RTDB عبر REST ---------- */
async function readFirebaseMetric(base, metricPath, how) {
  var url = base.replace(/\/+$/, "") + "/" + metricPath.replace(/^\/+/, "") + ".json";
  var res = await fetch(url);
  if (!res.ok) throw new Error("Firebase " + res.status);
  var data = await res.json();
  if (data == null) return null;
  if (typeof data === "object") {
    // إن كانت سلسلة زمنية (كائن مفاتيح) نطبّق التجميع
    var vals = Object.keys(data).map(function (k) { return data[k]; });
    return aggregate(vals, how || "last");
  }
  return Number(data);
}

/* ---------- قارئ Google Sheet (CSV منشور) ---------- */
function parseCSV(text) {
  var lines = text.replace(/\r/g, "").split("\n").filter(function (l) { return l.length; });
  if (!lines.length) return { header: [], rows: [] };
  var header = lines[0].split(",").map(function (h) { return h.trim(); });
  var rows = lines.slice(1).map(function (line) {
    var cells = line.split(",");
    var obj = {};
    header.forEach(function (h, i) { obj[h] = (cells[i] || "").trim(); });
    return obj;
  });
  return { header: header, rows: rows };
}

async function readSheet(url) {
  var res = await fetch(url);
  if (!res.ok) throw new Error("Sheet " + res.status);
  var text = await res.text();
  return parseCSV(text);
}

/* ---------- جمع مؤشرات منظومة واحدة ---------- */
async function collectSystem(src) {
  var out = { id: src.id, name: src.name, metrics: [], error: null };

  try {
    if (src.type === "firebase" && src.firebaseUrl) {
      for (var i = 0; i < src.metrics.length; i++) {
        var m = src.metrics[i];
        var val = null;
        try { val = await readFirebaseMetric(src.firebaseUrl, m.path, m.agg); }
        catch (e) { val = null; }
        out.metrics.push({ key: m.key, label: m.label, value: val, unit: m.unit || "", thresholds: m.thresholds || null });
      }
    } else if (src.type === "sheet" && src.sheetCsvUrl) {
      var sheet = await readSheet(src.sheetCsvUrl);
      src.metrics.forEach(function (m) {
        var col = sheet.rows.map(function (r) { return r[m.column]; }).filter(function (v) { return v != null && v !== ""; });
        var val = aggregate(col, m.agg);
        out.metrics.push({ key: m.key, label: m.label, value: val, unit: m.unit || "", thresholds: m.thresholds || null });
      });
    } else {
      // type:"none" أو مصدر غير مكتمل — مؤشرات فارغة بهدوء
      src.metrics.forEach(function (m) {
        out.metrics.push({ key: m.key, label: m.label, value: null, unit: m.unit || "", thresholds: m.thresholds || null });
      });
    }
  } catch (e) {
    out.error = String(e.message || e);
    src.metrics.forEach(function (m) {
      out.metrics.push({ key: m.key, label: m.label, value: null, unit: m.unit || "", thresholds: m.thresholds || null });
    });
  }

  return out;
}

/* ---------- التعليق: قاعدي أو Claude ---------- */
async function buildCommentary(systems, summary) {
  if (cfg.commentary.mode === "claude" && process.env.ANTHROPIC_API_KEY) {
    try { return await claudeCommentary(systems, summary); }
    catch (e) { /* في حال الفشل نرجع للقاعدي */ }
  }
  // افتراضي: قاعدي
  return {
    engine: "rule",
    summary: summary.text,
    perSystem: systems.map(function (s) { return ruleEngine.commentForSystem(s); })
  };
}

async function claudeCommentary(systems, summary) {
  var lines = systems.map(function (s) {
    var ms = s.metrics.map(function (m) { return m.label + "=" + (m.value == null ? "لا يوجد" : m.value) + (m.unit ? " " + m.unit : ""); }).join("، ");
    return "• " + s.name + ": " + (ms || "لا مؤشرات");
  }).join("\n");

  var prompt = "أنت محلل هيدروليكي. اكتب فقرة موجزة (3-4 جمل) بالعربية الفصحى تلخّص الوضع التشغيلي اليومي لقطاع الري بناءً على هذه القراءات، مع إبراز أي مؤشر يحتاج انتباه. لا تكرر الأرقام كلها، ركّز على الدلالة التشغيلية.\n\nالقراءات:\n" + lines;

  var res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: cfg.commentary.claudeModel || "claude-opus-4-8",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error("Claude " + res.status);
  var data = await res.json();
  var txt = (data.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n").trim();

  return {
    engine: "claude",
    summary: txt || summary.text,
    perSystem: systems.map(function (s) { return ruleEngine.commentForSystem(s); })
  };
}

/* ---------- التشغيل الرئيسي ---------- */
async function main() {
  var ts = nowCairo();
  console.log("⏱  بدء تجميع التقرير — " + ts.display);

  var systems = [];
  for (var i = 0; i < cfg.sources.length; i++) {
    var s = await collectSystem(cfg.sources[i]);
    var n = s.metrics.filter(function (m) { return m.value != null; }).length;
    console.log("  • " + s.name + ": " + n + "/" + s.metrics.length + " مؤشر" + (s.error ? " (خطأ: " + s.error + ")" : ""));
    systems.push(s);
  }

  var summary = ruleEngine.executiveSummary(systems);
  var commentary = await buildCommentary(systems, summary);

  var report = {
    generatedAt: ts.iso,
    generatedDisplay: ts.display,
    timezone: cfg.output.timezone,
    summary: summary,
    commentary: commentary,
    systems: systems.map(function (s) {
      return {
        id: s.id, name: s.name, error: s.error,
        metrics: s.metrics.map(function (m) {
          return {
            key: m.key, label: m.label, value: m.value, unit: m.unit,
            status: ruleEngine.statusOf(m.value, m.thresholds)
          };
        })
      };
    })
  };

  var outPath = path.join(process.cwd(), cfg.output.file);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log("✅ كُتب التقرير: " + outPath);
  console.log("   " + summary.text);
}

main().catch(function (e) {
  console.error("✖ فشل التشغيل:", e);
  process.exit(1);
});
