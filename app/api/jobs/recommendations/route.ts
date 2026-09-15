import { NextResponse } from "next/server";
import { fetchJobKoreaCompanyJobs } from "../../../../lib/jobkorea";
import { serverSupabase } from "../../../../lib/supabase-server";

export const maxDuration = 30;

type CompanyRecommendation = {
  name: string;
  sector: string;
  activeJobCount: number;
  nearestDeadline: string | null;
  daysLeft: number | null;
  sampleTitle: string;
  location: string;
  entryLevelCount: number;
  jobTitles: string[];
};

type RecommendationResult = {
  companies: CompanyRecommendation[];
  updatedAt: string;
  source: "잡코리아 회사 공고";
};

const candidates = [
  { name: "삼성전자", sector: "반도체·전자" },
  { name: "현대자동차", sector: "자동차" },
  { name: "SK하이닉스", sector: "반도체" },
  { name: "LG전자", sector: "전자" },
  { name: "한화에어로스페이스", sector: "방산·항공" },
  { name: "네이버", sector: "IT·플랫폼" },
  { name: "카카오", sector: "IT·플랫폼" },
  { name: "CJ제일제당", sector: "식품·바이오" },
  { name: "포스코", sector: "소재" },
  { name: "대한항공", sector: "항공" },
  { name: "신한은행", sector: "금융" },
  { name: "한국전력공사", sector: "공기업" },
] as const;

const cacheKey = "job-recommendations-v2";
const cacheHeaders = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
};

export async function GET() {
  if (serverSupabase) {
    const { data: cached } = await serverSupabase
      .from("job_search_cache")
      .select("data")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached?.data) {
      return NextResponse.json(
        { ...(cached.data as RecommendationResult), cache: { hit: true } },
        { headers: cacheHeaders },
      );
    }
  }

  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const todayTime = new Date(`${today}T00:00:00+09:00`).getTime();
  const results = await Promise.allSettled(
    candidates.map(async (candidate) => ({
      candidate,
      jobs: await fetchJobKoreaCompanyJobs(candidate.name),
    })),
  );
  const companies = results
    .flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      const activeJobs = result.value.jobs.filter(
        (job) => !job.detectedDeadline || job.detectedDeadline >= today,
      );
      if (!activeJobs.length) return [];
      const datedJobs = activeJobs
        .filter((job) => job.detectedDeadline)
        .sort((a, b) =>
          (a.detectedDeadline ?? "").localeCompare(b.detectedDeadline ?? ""),
        );
      const nearestDeadline = datedJobs[0]?.detectedDeadline ?? null;
      const daysLeft = nearestDeadline
        ? Math.max(
            0,
            Math.round(
              (new Date(`${nearestDeadline}T00:00:00+09:00`).getTime() -
                todayTime) /
                86_400_000,
            ),
          )
        : null;
      return [
        {
          name: result.value.candidate.name,
          sector: result.value.candidate.sector,
          activeJobCount: activeJobs.length,
          nearestDeadline,
          daysLeft,
          sampleTitle: datedJobs[0]?.title ?? activeJobs[0].title,
          location: activeJobs[0].location,
          entryLevelCount: activeJobs.filter(
            (job) =>
              job.experienceLevel === "신입" ||
              /신입|인턴|채용연계|academy|full-time opportunity/i.test(
                job.title,
              ),
          ).length,
          jobTitles: activeJobs.map((job) => job.title),
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(a.daysLeft === null) - Number(b.daysLeft === null) ||
        (a.daysLeft ?? Number.MAX_SAFE_INTEGER) -
          (b.daysLeft ?? Number.MAX_SAFE_INTEGER) ||
        b.activeJobCount - a.activeJobCount,
    );

  const payload: RecommendationResult = {
    companies,
    updatedAt: new Date().toISOString(),
    source: "잡코리아 회사 공고",
  };
  let persisted = false;
  if (serverSupabase && companies.length > 0) {
    const { error } = await serverSupabase.from("job_search_cache").upsert(
      {
        cache_key: cacheKey,
        normalized_company: "recommendations",
        data: payload,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "cache_key" },
    );
    persisted = !error;
  }

  return NextResponse.json(
    { ...payload, cache: { hit: false, persisted } },
    { headers: cacheHeaders },
  );
}
