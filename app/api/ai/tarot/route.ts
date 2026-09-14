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

const tarotCardNames = new Set([
  "광대",
  "마법사",
  "여사제",
  "여황제",
  "황제",
  "교황",
  "연인",
  "전차",
  "힘",
  "은둔자",
  "운명의 수레바퀴",
  "정의",
  "매달린 사람",
  "죽음",
  "절제",
  "악마",
  "탑",
  "별",
  "달",
  "태양",
  "심판",
  "세계",
]);

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
      readingTarget?: "self" | "other";
      targetName?: string;
      company?: string;
      status?: string;
      selectedCards?: Array<{
        name?: string;
        orientation?: string;
      }>;
    };
    const question = body.question?.trim().slice(0, 500);
    const birthday = body.birthday?.trim().slice(0, 10) || "";
    const targetName = body.targetName?.trim().slice(0, 30) || "본인";
    if (!question) {
      return NextResponse.json(
        { error: "타로 선생님께 물어볼 질문을 적어주세요." },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return NextResponse.json(
        { error: "운세를 볼 사람의 생년월일을 입력해 주세요." },
        { status: 400 },
      );
    }
    const selectedCards = body.selectedCards?.map((card) => ({
      name: card.name?.trim() || "",
      orientation: card.orientation,
    }));
    const validCards =
      selectedCards?.length === 3 &&
      new Set(selectedCards.map((card) => card.name)).size === 3 &&
      selectedCards.every(
        (card) =>
          tarotCardNames.has(card.name) &&
          (card.orientation === "정방향" || card.orientation === "역방향"),
      );
    if (!selectedCards || !validCards) {
      return NextResponse.json(
        { error: "서로 다른 타로 카드 3장을 먼저 골라주세요." },
        { status: 400 },
      );
    }

    const result = await createStructuredResponse<TarotReading>({
      name: "career_tarot_reading",
      maxOutputTokens: 1400,
      instructions:
        "당신은 경력 30년의 다정하고 유쾌한 한국어 타로 상담가다. 사용자가 직접 고른 서로 다른 카드 3장을 제시된 순서와 정·역방향 그대로 현재·걸림돌·조언의 흐름으로 해석한다. 다른 카드로 교체하거나 방향을 바꾸지 않는다. 대상의 생년월일은 전통적인 운세 분위기를 더하는 참고 정보로만 사용하고, 출생 시간이 없으므로 정밀 사주라고 주장하지 않는다. 점술은 재미와 자기성찰을 위한 비유임을 전제로 하며 합격, 불합격, 연락 시점, 연봉 등을 확정적으로 예언하지 않는다. 불안을 조장하거나 의존을 유도하지 않고, 사용자가 통제할 수 있는 현실적인 취업 준비 행동으로 연결한다. 질문에 직접 답하되 따뜻하고 재치 있게 작성한다.",
      input: JSON.stringify({
        request: "내가 직접 고른 3장으로 취업 고민을 리딩해줘.",
        question,
        subject: {
          relationship: body.readingTarget === "other" ? "다른 사람" : "본인",
          name: targetName,
          birthday,
        },
        selectedCards: selectedCards.map((card, index) => ({
          position: ["현재", "걸림돌", "조언"][index],
          ...card,
        })),
        currentApplication: body.company
          ? {
              company: body.company.slice(0, 80),
              status: body.status?.slice(0, 30) || "상태 미입력",
            }
          : "선택된 지원처 없음",
      }),
      schema,
    });

    return NextResponse.json({
      ...result,
      cards: selectedCards.map((card, index) => ({
        ...result.cards[index],
        position: ["현재", "걸림돌", "조언"][index],
        name: card.name,
        orientation: card.orientation,
      })),
      model: "gpt-5.4-nano",
    });
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
