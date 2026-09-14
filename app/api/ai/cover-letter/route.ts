import { NextRequest, NextResponse } from "next/server";
import {
  createStructuredResponse,
  OpenAIConfigError,
} from "../../../../lib/openai";

type CoverLetterResult = {
  headline: string;
  strategy: string;
  matches: Array<{
    experience: string;
    connection: string;
    proofToEmphasize: string;
  }>;
  draft: string;
  cautions: string[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    strategy: { type: "string" },
    matches: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          experience: { type: "string" },
          connection: { type: "string" },
          proofToEmphasize: { type: "string" },
        },
        required: ["experience", "connection", "proofToEmphasize"],
      },
    },
    draft: { type: "string" },
    cautions: { type: "array", maxItems: 3, items: { type: "string" } },
  },
  required: ["headline", "strategy", "matches", "draft", "cautions"],
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      company?: string;
      listingTitle?: string;
      listingDescription?: string;
      experiences?: Array<{
        tag: string;
        title: string;
        description: string;
      }>;
    };
    const company = body.company?.trim().slice(0, 80);
    const experiences = (body.experiences ?? []).slice(0, 20);
    if (!company || !experiences.length) {
      return NextResponse.json(
        { error: "회사와 경험 정보가 필요합니다." },
        { status: 400 },
      );
    }

    const result = await createStructuredResponse<CoverLetterResult>({
      name: "cover_letter_recommendation",
      maxOutputTokens: 1500,
      instructions:
        "당신은 한국 취업 준비생의 자소서 코치다. 제공된 경험에 있는 사실만 사용한다. 수치, 성과, 직무, 역할을 새로 만들지 않는다. 정보가 부족한 부분은 사용자가 보완해야 할 항목으로 명시한다. 결과는 구체적이고 간결한 한국어로 작성한다.",
      input: JSON.stringify({
        request:
          "회사와 공고에 적합한 경험을 골라 연결 논리와 자소서 초안을 작성해줘.",
        company,
        listingTitle: body.listingTitle?.slice(0, 200) || "공고명 미입력",
        listingDescription:
          body.listingDescription?.slice(0, 1500) || "공고 설명 미입력",
        experiences: experiences.map((item) => ({
          tag: item.tag.slice(0, 30),
          title: item.title.slice(0, 200),
          description: item.description.slice(0, 500),
        })),
      }),
      schema,
    });

    return NextResponse.json({ ...result, model: "gpt-5.4-nano" });
  } catch (error) {
    const missingKey = error instanceof OpenAIConfigError;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI 추천에 실패했습니다.",
        code: missingKey ? "MISSING_API_KEY" : "AI_RECOMMENDATION_FAILED",
      },
      { status: missingKey ? 503 : 502 },
    );
  }
}
