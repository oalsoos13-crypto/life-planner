#!/usr/bin/env node
// وكيل اللابتوب: بيسأل التطبيق كل دقيقة «شو في شغل؟»، وبيعطي المهمة لـ Claude Code جوّا مجلد شغلك.
// ملفاتك ما بتطلع من اللابتوب. للتطبيق بيرجع بس: الحالة + ملخّص قصير (والتطبيق بيشيل أي رقم منه).
// بدون مكتبات: Node 20+ و Claude Code (claude) مسجّل دخول.
//
// المتغيّرات:
//   LP_URL          رابط التطبيق، مثلاً https://your-app.vercel.app
//   LP_AGENT_TOKEN  نفس قيمة AGENT_TOKEN بإعدادات Vercel
//   WORK_ROOT       المجلد الأساسي لشغلك (الوكيل ما بيطلع برّاه)
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const { LP_URL, LP_AGENT_TOKEN, WORK_ROOT } = process.env;
if (!LP_URL || !LP_AGENT_TOKEN || !WORK_ROOT) {
  console.error("لازم LP_URL و LP_AGENT_TOKEN و WORK_ROOT");
  process.exit(1);
}
const ROOT = path.resolve(WORK_ROOT);
const POLL_MS = 60_000;
const JOB_TIMEOUT_MS = 25 * 60_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (p, body) =>
  fetch(new URL(p, LP_URL), { method: "POST", headers: { authorization: `Bearer ${LP_AGENT_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });

/** مجلد المهمة لازم يضل جوّا WORK_ROOT */
function folderFor(job) {
  const dir = path.resolve(ROOT, job.folder || ".");
  if (dir !== ROOT && !dir.startsWith(ROOT + path.sep)) throw new Error("المجلد برّا WORK_ROOT");
  mkdirSync(path.join(dir, ".lp-agent"), { recursive: true });
  return dir;
}

const RULES = `قواعد ثابتة:
- اشتغل بس جوّا هالمجلد. لا تحذف ولا تكتب فوق أي ملف أصلي؛ أي ملف جديد بتاريخ اليوم بآخر اسمه.
- ممنوع تبعت أي إيميل أو رسالة بهالمرحلة. إذا المهمة فيها إيميل: جهّزه كمسودة (Outlook عبر PowerShell COM إذا موجود، وإلا ملف .eml بالمجلد).
- اكتب تفاصيل المسودة (subject, to, cc, attachments, eml path إذا في) بملف .lp-agent/JOB_ID.json عشان مرحلة الإرسال.
- ملفات الشركة سرية: لا ترفع ولا تنسخ شي لبرّا اللابتوب.
- بالآخر اطبع سطرين بالضبط:
SUMMARY: جملة عربية قصيرة عن شو عملت، بدون أي أرقام أو أسماء عملاء أو بيانات حساسة
STATUS: READY_FOR_APPROVAL (إذا في شي بدّه ينبعت) أو DONE (إذا خلص وما في إرسال) أو FAILED`;

function promptFor(job) {
  if (job.phase === "SEND")
    return `عمر وافق على إرسال مسودة المهمة «${job.title}». اقرأ .lp-agent/${job.id}.json، وابعت نفس المسودة بالضبط بدون أي تعديل (من Outlook Drafts حسب الـ subject، أو الـ .eml). إذا ما لقيتها، لا تبعت شي.
بالآخر اطبع:
SUMMARY: جملة قصيرة بدون أرقام
STATUS: DONE أو FAILED`;
  return `إنت وكيل عمر على لابتوبه. المهمة: «${job.title}» (${job.kind}).
التعليمات:
${job.instructions}

${RULES.replaceAll("JOB_ID", job.id)}`;
}

function runClaude(prompt, cwd) {
  return new Promise((resolve) => {
    // البرومبت بيروح على stdin عشان ما نتعب بالـ quoting على ويندوز
    const child = spawn("claude", ["-p", "--output-format", "text", "--permission-mode", "acceptEdits", "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash"], {
      cwd,
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    const timer = setTimeout(() => { child.kill(); resolve({ out: out + "\nSTATUS: FAILED", code: -1 }); }, JOB_TIMEOUT_MS);
    child.stdout.on("data", (d) => { out += d; process.stdout.write(d); });
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => { clearTimeout(timer); resolve({ out, code }); });
    child.on("error", (e) => { clearTimeout(timer); resolve({ out: `SUMMARY: ما قدرت أشغّل Claude Code\nSTATUS: FAILED\n${e.message}`, code: -1 }); });
    child.stdin.end(prompt);
  });
}

function parse(out, phase) {
  const status = out.match(/^STATUS:\s*(READY_FOR_APPROVAL|DONE|FAILED)\s*$/m)?.[1] ?? "FAILED";
  const summary = out.match(/^SUMMARY:\s*(.+)$/m)?.[1]?.trim() ?? null;
  // بمرحلة الإرسال ما في «جاهز للموافقة» تاني
  return { report: phase === "SEND" && status === "READY_FOR_APPROVAL" ? "FAILED" : status, summary };
}

async function tick() {
  const res = await api("/api/agent/next");
  if (res.status === 401) throw new Error("التوكن غلط: تأكد إنه نفس AGENT_TOKEN بـ Vercel");
  if (!res.ok) return false;
  const { job } = await res.json();
  if (!job) return false;
  console.log(`\n▶ ${job.phase} · ${job.title}`);
  let report = "FAILED", summary = null;
  try {
    const { out } = await runClaude(promptFor(job), folderFor(job));
    ({ report, summary } = parse(out, job.phase));
  } catch (e) {
    summary = e instanceof Error ? e.message : "خطأ";
  }
  const r = await api(`/api/agent/jobs/${job.id}`, { report, summary });
  console.log(`■ ${report} (${r.status})`);
  return true;
}

console.log(`وكيل خطتي شغّال على ${ROOT}. Ctrl+C للإيقاف.`);
for (;;) {
  let worked = false;
  try {
    worked = await tick();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
  }
  if (!worked) await sleep(POLL_MS);
}
