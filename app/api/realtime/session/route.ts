import { NextRequest, NextResponse } from "next/server";

const ALLOWED_MODELS = new Set(["gpt-realtime-2.1", "gpt-realtime-2.1-mini"]);
const ANSWER_VALUES = ["strongly_agree", "agree", "neutral", "disagree", "strongly_disagree", "skip"];

const proposalTool = {
  type: "function",
  name: "propose_answer",
  description: "現在の質問への回答候補を、ユーザーの発言だけから提案する。候補者や政党を推薦しない。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      question_id: { type: "string" },
      answer: { type: "string", enum: ANSWER_VALUES },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      evidence_summary: { type: "string", maxLength: 180 },
    },
    required: ["question_id", "answer", "confidence", "evidence_summary"],
  },
};

function buildInstructions(question: { id: string; title: string; prompt: string; sourcePack?: { summary?: string } }): string {
  return [
    "あなたはオシセンの中立的なAI音声インタビュアーです。候補者・政党を推薦せず、利用者自身の考えを整理します。",
    "候補者名、政党名、候補者の回答、一致度、投票先はこのセッションに存在しません。推測してはいけません。",
    "賛成と慎重の論点を同じ具体性で説明し、与えられた背景以外の事実を断定しません。",
    "利用者の知識不足・判断保留と、政策への中立的な意見を区別します。曖昧なときだけ短い確認質問を一つ行います。",
    "十分な発言が得られたら、propose_answerを一度呼び出します。確信度が0.75未満なら、先に短い確認を行います。",
    `現在の質問ID: ${question.id}`,
    `質問タイトル: ${question.title}`,
    `質問文: ${question.prompt}`,
    `事前確認済みの背景: ${question.sourcePack?.summary ?? "なし"}`,
  ].join("\n");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEYが未設定です。ローカルUIはデモモードで利用できます。" },
      { status: 503 },
    );
  }

  let body: {
    sdp?: unknown;
    model?: unknown;
    question?: { id?: unknown; title?: unknown; prompt?: unknown; sourcePack?: { summary?: unknown } };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "不正なJSONです。" }, { status: 400 });
  }

  const sdp = typeof body.sdp === "string" ? body.sdp : "";
  const model = typeof body.model === "string" ? body.model : "";
  const question = body.question;
  if (!sdp || sdp.length > 1_000_000 || !ALLOWED_MODELS.has(model) || !question) {
    return NextResponse.json({ error: "セッション設定が不正です。" }, { status: 400 });
  }

  const questionData = {
    id: typeof question.id === "string" ? question.id.slice(0, 100) : "current-question",
    title: typeof question.title === "string" ? question.title.slice(0, 300) : "現在の質問",
    prompt: typeof question.prompt === "string" ? question.prompt.slice(0, 1000) : "",
    sourcePack: {
      summary: typeof question.sourcePack?.summary === "string" ? question.sourcePack.summary.slice(0, 1000) : "",
    },
  };

  const upstream = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sdp,
      session: {
        type: "realtime",
        model,
        output_modalities: ["audio"],
        instructions: buildInstructions(questionData),
        tools: [proposalTool],
        tool_choice: "auto",
        audio: {
          input: { turn_detection: { type: "server_vad", threshold: 0.5, silence_duration_ms: 650 } },
        },
      },
    }),
  });

  const responseBody = await upstream.text();
  const headers = new Headers({
    "content-type": upstream.headers.get("content-type") ?? "application/sdp",
    "cache-control": "no-store",
  });
  const location = upstream.headers.get("location");
  if (location) headers.set("x-realtime-call-location", location);
  return new NextResponse(responseBody, { status: upstream.status, headers });
}
