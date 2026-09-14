import { NextRequest, NextResponse } from "next/server";

type KdataEvent = {
  pgsggb?: string;
  groupId?: "apply" | "test" | "score" | "result";
  start?: string;
  end?: string;
  title?: string;
  title2?: string;
  examoprSeq?: number;
  url?: string;
};

const normalize = (value: string) =>
  value.toLocaleLowerCase("ko-KR").replace(/[\s._-]+/g, "");

const officialNames = [
  "빅데이터분석기사",
  "ADP",
  "ADsP",
  "SQLD",
  "SQLP",
  "DAP",
  "DAsP",
];

const aliases: Record<string, string[]> = {
  빅데이터분석기사: ["빅분기", "빅데이터 분석 기사", "데이터분석기사"],
  ADP: ["데이터분석전문가"],
  ADsP: ["ADSP", "데이터분석준전문가"],
  SQLD: ["SQL개발자"],
  SQLP: ["SQL전문가"],
  DAP: ["데이터아키텍처전문가"],
  DAsP: ["DASP", "데이터아키텍처준전문가"],
};

const resolveOfficialName = (requestedName: string) => {
  const keyword = normalize(requestedName);
  return officialNames.find((officialName) =>
    [officialName, ...(aliases[officialName] ?? [])].some((candidate) => {
      const normalizedCandidate = normalize(candidate);
      return (
        normalizedCandidate.includes(keyword) ||
        keyword.includes(normalizedCandidate)
      );
    }),
  );
};

const toOfficialDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const shifted = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
};

const scheduleLabel = (event: KdataEvent) => {
  const stage = event.pgsggb?.trim() ?? "";
  const labels = {
    apply: `${stage} 원서접수`,
    test: `${stage}시험`,
    score: `${stage} 사전점수 발표`,
    result: stage === "실기" ? "최종 결과 발표" : `${stage} 결과 발표`,
  };
  return event.groupId ? labels[event.groupId] : stage;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string };
    const requestedName = body.name?.trim().slice(0, 80);
    if (!requestedName) {
      return NextResponse.json(
        { error: "시험명을 입력해 주세요." },
        { status: 400 },
      );
    }

    const officialName = resolveOfficialName(requestedName);
    if (!officialName) {
      return NextResponse.json({
        found: false,
        sessions: [],
        note: "K-DATA에서 운영하는 시험명을 찾지 못했어요.",
      });
    }

    const year = Number(
      new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Seoul",
        year: "numeric",
      }).format(new Date()),
    );
    const start = new Date(`${year}-01-01T00:00:00+09:00`).getTime();
    const end = new Date(`${year + 1}-12-31T23:59:59+09:00`).getTime();
    const response = await fetch(
      `https://www.dataq.or.kr/www/events.dox?start=${start}&end=${end}`,
      {
        headers: {
          Accept: "application/json",
          Referer: "https://www.dataq.or.kr/www/main.do",
          "User-Agent": "Mozilla/5.0 PatrickJobHunt/1.0",
        },
        next: { revalidate: 21600 },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) throw new Error(`K-DATA responded ${response.status}`);

    const events = ((await response.json()) as KdataEvent[]).filter(
      (event) => event.title === officialName,
    );
    const grouped = new Map<string, KdataEvent[]>();
    events.forEach((event) => {
      const round = event.url?.match(/제\s*(\d+)\s*회/)?.[1];
      if (!round) return;
      grouped.set(round, [...(grouped.get(round) ?? []), event]);
    });

    const sessions = [...grouped.entries()]
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([round, roundEvents]) => ({
        id: `kdata-${normalize(officialName)}-${round}`,
        label: `제${round}회`,
        schedules: roundEvents
          .map((event) => {
            const startDate = toOfficialDate(event.start);
            const endDate = toOfficialDate(event.end);
            return {
              label: scheduleLabel(event),
              start: startDate,
              ...(event.groupId === "apply" && endDate !== startDate
                ? { end: endDate }
                : {}),
            };
          })
          .filter((schedule) => schedule.start)
          .sort((a, b) => a.start.localeCompare(b.start)),
      }))
      .filter((session) => session.schedules.length > 0);

    return NextResponse.json({
      found: sessions.length > 0,
      name: officialName,
      provider: "K-DATA 데이터자격시험",
      category:
        officialName === "빅데이터분석기사"
          ? "K-DATA 국가기술자격"
          : "K-DATA 데이터자격시험",
      recommendation: `${officialName} 공식 시험 일정을 불러왔어요.`,
      sourceUrl: "https://www.dataq.or.kr/www/accept/schedule.do",
      scheduleNotice:
        "K-DATA 공식 홈페이지에서 불러온 일정입니다. 접수 전 변경 공지를 확인해 주세요.",
      sessions,
      note:
        sessions.length > 0
          ? `${year}년 이후 공식 일정을 불러왔어요.`
          : "현재 공식 홈페이지에 발표된 회차별 일정이 없어요.",
    });
  } catch {
    return NextResponse.json(
      { error: "K-DATA 공식 시험일정을 불러오지 못했어요." },
      { status: 502 },
    );
  }
}
