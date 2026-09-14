import { NextRequest, NextResponse } from "next/server";
import {
  createStructuredResponse,
  OpenAIConfigError,
} from "../../../../lib/openai";

type TarotReading = {
  opening: string;
  cards: Array<{
    position: string;
    name: string;
    orientation: "정방향" | "역방향";
    message: string;
  }>;
  reading: string;
  actionSteps: string[];
  luckyHint: string;
  closing: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    opening: { type: "string" },
    cards: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          position: { type: "string" },
          name: { type: "string" },
          orientation: {
            type: "string",
            enum: ["정방향", "역방향"],
          },
          message: { type: "string" },
        },
        required: ["position", "name", "orientation", "message"],
      },
    },
    reading: { type: "string" },
    actionSteps: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    luckyHint: { type: "string" },
    closing: { type: "string" },
  },
  required: [
    "opening",
    "cards",
    "reading",
    "actionSteps",
    "luckyHint",
    "closing",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      question?: string;
      birthday?: string;
      company?: string;
      status?: string;
    };
    const question = body.question?.trim().slice(0, 500);
    if (!question) {
      return NextResponse.json(
        { error: "타로 선생님께 물어볼 질문을 적어주세요." },
        { status: 400 },
      );
    }

    const result = await createStructuredResponse<TarotReading>({
      name: "career_tarot_reading",
      maxOutputTokens: 1400,
      instructions:
        "당신은 경력 30년의 다정하고 유쾌한 한국어 타로 상담가다. 실제 타로 덱에서 서로 다른 카드 3장을 골라 현재·방해물·조언의 흐름으로 해석한다. 점술은 재미와 자기성찰을 위한 비유임을 전제로 하며 합격, 불합격, 연락 시점, 연봉 등을 확정적으로 예언하지 않는다. 불안을 조장하거나 의존을 유도하지 않고, 사용자가 통제할 수 있는 현실적인 취업 준비 행동으로 연결한다. 질문에 직접 답하되 따뜻하고 재치 있게 작성한다. 생일은 분위기를 맞추는 참고 정보일 뿐 성격이나 운명을 단정하는 근거로 쓰지 않는다.",
      input: JSON.stringify({
        request: "취업 고민을 3장 타로 리딩으로 풀어줘.",
        question,
        birthday: body.birthday?.slice(0, 10) || "입력하지 않음",
        currentApplication: body.company
          ? {
              company: body.company.slice(0, 80),
              status: body.status?.slice(0, 30) || "상태 미입력",
            }
          : "선택된 지원처 없음",
      }),
      schema,
    });

    return NextResponse.json({ ...result, model: "gpt-5.4-nano" });
  } catch (error) {
    const missingKey = error instanceof OpenAIConfigError;
    return NextResponse.json(
      {
        error: missingKey
          ? "OpenAI API 키가 없어요. 로컬은 .env.local에, 배포는 Vercel Settings → Environment Variables에 OPENAI_API_KEY를 등록해 주세요."
          : error instanceof Error
            ? error.message
            : "타로 카드를 펼치지 못했어요.",
        code: missingKey ? "MISSING_API_KEY" : "TAROT_READING_FAILED",
      },
      { status: missingKey ? 503 : 502 },
    );
  }
}
