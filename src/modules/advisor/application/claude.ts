// الاتصال بـ Claude (Anthropic API). المفتاح بمتغيّر بيئة على السيرفر بس، ما بيوصل للمتصفح ولا للريبو.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { ITEM_KINDS, type CaptureContext, type Extracted } from "../domain/capture";

export const MODEL = "claude-opus-5-5";
export const hasKey = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

const ItemSchema = z.object({
  kind: z.enum(ITEM_KINDS),
  title: z.string(),
  goalId: z.string().nullable(),
  habitId: z.string().nullable(),
  metricId: z.string().nullable(),
  value: z.number().nullable(),
  amount: z.number().nullable(),
  category: z.string().nullable(),
});
const ExtractSchema = z.object({ items: z.array(ItemSchema) });

const EXTRACT_SYSTEM = `أنت مستشار عمر الشخصي داخل تطبيق تخطيط حياته. عمر بيحكي أو بيكتب عن يومه باللهجة الشامية/الأردنية، وإنت بتفرز كلامه لعناصر بتنحفظ لحالها.

الأنواع:
- TASK: شي لازم يعمله (مهمة). title فعل قصير وواضح. اربطه بـ goalId إذا بيخدم هدف من القائمة.
- HABIT: عمل عادة من عاداته اليوم. habitId لازم من القائمة. لا تعلّم عادة إذا قال إنه ما عملها.
- METRIC: رقم جديد لمؤشر من القائمة (مثلاً عدد مستخدمين). metricId من القائمة وvalue الرقم الجديد الكلّي، مش الزيادة.
- EXPENSE: مصروف. amount بالدينار الكويتي (الفلس = 1/1000)، وcategory كلمة وحدة بالعربي (أكل، مواصلات، بيت، شغل، أهل، صحة، ترفيه، متفرقات).
- ENERGY أو MOOD: إذا وصف طاقته أو مزاجه. value من 1 (تعبان جداً) لـ 5 (نار).
- NOTE: فكرة أو ملاحظة ما إلها مكان تاني. اربطها بـ goalId إذا واضح إنها لهدف.

قواعد:
- استعمل بس المعرّفات الموجودة بالسياق. إذا مش متأكد، خلّيها null.
- كل عنصر بجملة عربية قصيرة بكلام عمر نفسه.
- لا تخترع أشياء ما قالها. لا تكرّر نفس الشي بعنصرين.
- الحقول الي ما إلها معنى للنوع خلّيها null.`;

/** فرز الكلام بـ Claude بمخرجات منظّمة. بيرجع null إذا رفض أو فشل، فالمتصل بيرجع للقواعد */
export async function extractWithClaude(text: string, ctx: CaptureContext): Promise<Extracted[] | null> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: EXTRACT_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractSchema) },
    messages: [
      {
        role: "user",
        content: `السياق (JSON):\n${JSON.stringify({ اليوم: ctx.today, العادات: ctx.habits, الأهداف: ctx.goals, النية_الجوهرية: ctx.essentialIntent })}\n\nكلام عمر:\n"""${text}"""`,
      },
    ],
  });
  if (res.stop_reason === "refusal") return null;
  return res.parsed_output?.items ?? null;
}

export type ChatTurn = { role: "user" | "assistant"; text: string };

const ADVISOR_SYSTEM = `أنت «المستشار»، العقل الي ورا تطبيق حياة عمر. عمر 29 سنة، محلل مبيعات ببيبسي الكويت (8-4) ومدير استراتيجية بكافيه (5-10)، ووقته الحر صباح الجمعة والسبت. مشروعه تطبيق «المجدّد».
بتحكي معه بالشامي، دافي ومباشر، وجملك قصيرة. بتعطي جواب أو قرار واضح أول شي، وبعدين السبب بسطر أو سطرين.
بتشتغل بمنهجية الاستراتيجية الشخصية (Rumelt: تشخيص ← سياسة موجّهة ← أفعال؛ OKRs بحد 3؛ Essentialism؛ Atomic Habits؛ الرواقيين: شو بإيدك وشو مش بإيدك؛ Housel للمال؛ Kahneman للقرارات: الرؤية من برّا وPremortem).
لما تقترح شي، اذكر المرجع بكلمتين بين قوسين. لما تحكي عن أرقامه، استعمل السياق بس وما تخترع أرقام.
لا تعطي نصايح طبية أو قانونية جازمة؛ قول متى لازم يسأل مختص.`;

/** محادثة المستشار. السياق المتغيّر بيروح كرسالة نظام بنص المحادثة عشان ما يكسر الكاش */
export async function askClaude(history: ChatTurn[], question: string, contextJson: string): Promise<string | null> {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: ADVISOR_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium" },
    messages: [
      ...history.map((t) => ({ role: t.role, content: t.text })),
      { role: "user", content: `${question}\n\n<سياق_اليوم>\n${contextJson}\n</سياق_اليوم>` },
    ],
  });
  if (res.stop_reason === "refusal") return null;
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  return text || null;
}

// ── الملف الحي: Claude بيقرأ كلام آخر أسبوعين وبيطلّع شو تعلّم عن عمر ──
const PROFILE_AREAS_FOR_CLAUDE = ["VALUES", "ENERGY", "HABITS", "PROCRASTINATION", "TRIGGERS", "MONEY", "STRENGTHS", "PREFERENCES"] as const;
const LearnSchema = z.object({
  facts: z.array(z.object({ area: z.enum(PROFILE_AREAS_FOR_CLAUDE), text: z.string(), evidence: z.string() })),
  people: z.array(z.object({ name: z.string(), relation: z.string().nullable(), note: z.string().nullable() })),
});
export type Learned = z.infer<typeof LearnSchema>;

const LEARN_SYSTEM = `أنت بتبني «ملف حي» عن عمر من كلامه اليومي، عشان المستشار يفهمه أكتر مع الوقت.
طلّع حقائق جديدة بس، كل وحدة جملة قصيرة بالشامي موجّهة لعمر («إنت بتـ...»)، مع دليل قصير من كلامه (evidence).
المجالات: VALUES قيم، ENERGY طاقة، HABITS عادات، PROCRASTINATION تأجيل وأسبابه، TRIGGERS شو بيرفعه أو بينزّله، MONEY مصاري، STRENGTHS قوّة، PREFERENCES طريقته بالشغل والحكي.
الناس: أي شخص مهم ذكره بالاسم (أهل، أصحاب، زملاء)، مع صلته وملاحظة قصيرة. لا تحط أرقام تلفونات أو معلومات حساسة عنهم.
قواعد: لا تكرّر حقيقة موجودة أو مرفوضة. لا تحكم ولا تشخّص طبياً؛ اكتبها كملاحظة. إذا ما في شي جديد واضح، رجّع قوائم فاضية. 6 حقائق بالكتير.`;

export async function learnProfileWithClaude(input: { captures: string[]; known: string[]; rejected: string[]; people: string[] }): Promise<Learned | null> {
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: LEARN_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium", format: betaZodOutputFormat(LearnSchema) },
    messages: [
      {
        role: "user",
        content: `بعرفه (لا تكرّر):\n${input.known.join("\n") || "-"}\n\nرفضها (لا ترجّعها):\n${input.rejected.join("\n") || "-"}\n\nناس معروفين:\n${input.people.join("، ") || "-"}\n\nكلامه بآخر أسبوعين:\n"""${input.captures.join("\n---\n")}"""`,
      },
    ],
  });
  if (res.stop_reason === "refusal") return null;
  return res.parsed_output ?? null;
}

/** كتابة قصيرة (مسودة رسالة، منشور، رد عميل). بيرجع null إذا رفض */
export async function writeShort(system: string, prompt: string): Promise<string | null> {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low" },
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "refusal") return null;
  return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim() || null;
}
