import { NextRequest, NextResponse } from "next/server";
import {
  createStructuredResponse,
  OpenAIConfigError,
} from "../../../../lib/openai";

type AiJobResult = {
  listings: Array<{
    title: string;
    url: string;
    source: string;
    startDate: string | null;
    deadline: string | null;
    confidence: "높음" | "보통" | "낮음";
    evidence: string;
  }>;
  note: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    listings: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          source: { type: "string" },
          startDate: { type: ["string", "null"] },
          deadline: { type: ["string", "null"] },
          confidence: { type: "string", enum: ["높음", "보통", "낮음"] },
          evidence: { type: "string" },
        },
        required: [
          "title",
          "url",
          "source",
          "startDate",
          "deadline",
          "confidence",
          "evidence",
        ],
      },
    },
    note: { type: "string" },
  },
  required: ["listings", "note"],
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { company?: string };
    const company = body.company?.trim().slice(0, 80);
    if (!company) {
      return NextResponse.json(
        { error: "회사명을 입력해 주세요." },
        { status: 400 },
      );
    }

    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
    }).format(new Date());
    const result = await createStructuredResponse<AiJobResult>({
      name: "active_job_listings",
      useWebSearch: true,
      maxOutputTokens: 1400,
      instructions:
        "당신은 한국 채용 공고 검증 도우미다. 공식 기업 채용 페이지와 신뢰할 수 있는 채용 플랫폼을 우선 검색한다. 현재 지원 가능한 공고만 반환하고, 날짜나 URL을 추측하지 않는다. 마감일을 원문에서 확인할 수 없으면 null로 둔다. 날짜는 YYYY-MM-DD 형식만 사용한다. 상시채용은 deadline을 null로 둔다.",
      input: `오늘은 ${today}(한국 시간)이다. '${company}'의 현재 지원 가능한 신입·인턴·주니어 채용 공고를 찾아라. 공고 제목, 원문 URL, 게시처, 접수 시작일, 정확한 서류 마감일, 신뢰도와 날짜 근거를 반환하라. 종료된 공고와 단순 기업 뉴스는 제외하라.`,
      schema,
    });

    return NextResponse.json({ company, ...result, model: "gpt-5.4-nano" });
  } catch (error) {
    const missingKey = error instanceof OpenAIConfigError;
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI 검색에 실패했습니다.",
        code: missingKey ? "MISSING_API_KEY" : "AI_SEARCH_FAILED",
      },
      { status: missingKey ? 503 : 502 },
    );
  }
}
