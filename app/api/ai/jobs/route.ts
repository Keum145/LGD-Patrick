import { NextRequest, NextResponse } from "next/server";
import {
  createStructuredResponse,
  OpenAIConfigError,
} from "../../../../lib/openai";
import { serverSupabase } from "../../../../lib/supabase-server";

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
      maxItems: 8,
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

const normalize = (value: string) =>
  value.toLocaleLowerCase("ko-KR").replace(/[\s._-]+/g, "");

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

    const cacheKey = `ai-jobs-v2:${normalize(company)}`;
    if (serverSupabase) {
      const { data: cached } = await serverSupabase
        .from("job_search_cache")
        .select("data")
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (cached?.data) {
        return NextResponse.json({
          company,
          ...(cached.data as AiJobResult),
          cache: { hit: true },
        });
      }
    }

    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
    }).format(new Date());
    const result = await createStructuredResponse<AiJobResult>({
      name: "active_job_listings",
      useWebSearch: true,
      maxOutputTokens: 1400,
      webSearchLocation: {
        country: "KR",
        city: "Seoul",
        region: "Seoul",
      },
      instructions:
        "당신은 한국 채용 공고 일정 검증 도우미다. 무료 채용 검색에서 마감일을 확인하지 못했을 때만 호출된다. 공식 기업 채용 페이지, 자소설닷컴, 사람인, 잡코리아, 원티드, 캐치를 우선 확인한다. 국내에서 현재 지원 가능한 공고는 고용형태나 경력 구분과 관계없이 반환한다. 날짜와 URL을 추측하지 않는다. 마감일을 원문에서 확인할 수 없으면 null로 둔다. 날짜는 YYYY-MM-DD 형식만 사용한다. 상시채용은 deadline을 null로 둔다.",
      input: `오늘은 ${today}(한국 시간)이다. '${company}'의 현재 지원 가능한 국내 채용 공고를 찾아 정확한 접수 시작일과 서류 마감일을 확인하라. 종료된 공고와 해외 공고, 단순 기업 뉴스는 제외하라.`,
      schema,
    });
    const verifiedResult: AiJobResult = {
      ...result,
      listings: result.listings.filter(
        (listing) => !listing.deadline || listing.deadline >= today,
      ),
    };

    let persisted = false;
    if (serverSupabase && verifiedResult.listings.length > 0) {
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
      const { error } = await serverSupabase.from("job_search_cache").upsert(
        {
          cache_key: cacheKey,
          normalized_company: normalize(company),
          data: verifiedResult,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "cache_key" },
      );
      persisted = !error;
    }

    return NextResponse.json({
      company,
      ...verifiedResult,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-nano",
      cache: { hit: false, persisted },
    });
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
