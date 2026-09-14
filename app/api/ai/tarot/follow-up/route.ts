import { NextRequest, NextResponse } from "next/server";
import {
  createStructuredResponse,
  OpenAIConfigError,
} from "../../../../../lib/openai";

type FollowUpResponse = {
  answer: string;
  closing: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    closing: { type: "string" },
  },
  required: ["answer", "closing"],
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      question?: string;
      originalQuestion?: string;
      targetName?: string;
      birthday?: string;
      reading?: unknown;
      previousMessages?: Array<{
        role?: string;
        text?: string;
      }>;
    };
    const question = body.question?.trim().slice(0, 300);
    const birthday = body.birthday?.trim().slice(0, 10) || "";
    if (!question) {
      return NextResponse.json(
        { error: "이어 물어볼 질문을 적어주세요." },
        { status: 400 },
      );
    }
    if (!body.reading || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return NextResponse.json(
        { error: "첫 타로 해석 정보가 없어 후속 질문을 이어갈 수 없어요." },
        { status: 400 },
      );
    }

    const result = await createStructuredResponse<FollowUpResponse>({
      name: "career_tarot_follow_up",
      maxOutputTokens: 700,
      instructions:
        "당신은 경력 30년의 다정하고 유쾌한 한국어 타로 상담가다. 직전에 나온 세 장의 카드와 첫 해석을 유지하며 사용자의 후속 질문에 직접 답한다. 새로운 카드를 뽑았다고 말하거나 기존 카드의 이름·방향·의미를 임의로 바꾸지 않는다. 생년월일은 분위기를 더하는 참고 정보일 뿐 정밀 사주나 확정적 예언의 근거로 삼지 않는다. 합격 여부, 연락 시점, 연봉을 단정하지 말고 현실적으로 실행 가능한 취업 준비 행동으로 연결한다. 답변은 간결하지만 성의 있게 작성한다.",
      input: JSON.stringify({
        request: "이전 타로 리딩을 바탕으로 후속 질문에 답해줘.",
        subject: {
          name: body.targetName?.trim().slice(0, 30) || "본인",
          birthday,
        },
        originalQuestion: body.originalQuestion?.trim().slice(0, 500) || "",
        originalReading: JSON.stringify(body.reading).slice(0, 9000),
        previousConversation: (body.previousMessages ?? [])
          .slice(-6)
          .map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            text: message.text?.trim().slice(0, 1000) || "",
          })),
        followUpQuestion: question,
      }),
      schema,
    });

    return NextResponse.json({ ...result, model: "gpt-5.4-nano" });
  } catch (error) {
    const missingKey = error instanceof OpenAIConfigError;
    return NextResponse.json(
      {
        error: missingKey
          ? "OpenAI API 키가 없어 후속 질문에 답할 수 없어요."
          : error instanceof Error
            ? error.message
            : "후속 답변을 불러오지 못했어요.",
        code: missingKey ? "MISSING_API_KEY" : "TAROT_FOLLOW_UP_FAILED",
      },
      { status: missingKey ? 503 : 502 },
    );
  }
}
