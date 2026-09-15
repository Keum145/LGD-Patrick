import { NextResponse } from "next/server";

type TodayIssue = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
};

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const textOf = (xml: string, tag: string) => {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return match
    ? decodeXml(match[1])
        .replace(/<[^>]+>/g, "")
        .trim()
    : "";
};

const parseNewsFeed = (xml: string): TodayIssue[] =>
  Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
    .map((match, index) => {
      const item = match[1];
      const source = textOf(item, "source") || "Google 뉴스";
      const rawTitle = textOf(item, "title");
      const sourceSuffix = ` - ${source}`;
      return {
        id: `today-issue-${index}-${textOf(item, "guid")}`,
        title: rawTitle.endsWith(sourceSuffix)
          ? rawTitle.slice(0, -sourceSuffix.length)
          : rawTitle,
        source,
        publishedAt: textOf(item, "pubDate"),
        url: textOf(item, "link"),
      };
    })
    .filter(
      (issue) =>
        issue.title &&
        issue.url &&
        /채용|취업|고용|일자리|인턴|신입|청년|인재/i.test(issue.title),
    )
    .filter(
      (issue, index, issues) =>
        issues.findIndex((candidate) => candidate.title === issue.title) ===
        index,
    )
    .slice(0, 10);

export async function GET() {
  try {
    const query = encodeURIComponent("(채용 OR 취업 OR 고용 OR 인턴) when:2d");
    const response = await fetch(
      `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`,
      {
        headers: { "User-Agent": "Mozilla/5.0 PatrickJobHunt/1.0" },
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!response.ok)
      throw new Error(`Google News responded ${response.status}`);
    const issues = parseNewsFeed(await response.text());
    if (!issues.length) throw new Error("No employment news");
    return NextResponse.json(
      { issues, updatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=10800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { issues: [], error: "오늘의 취업 이슈를 불러오지 못했어요." },
      { status: 503 },
    );
  }
}
