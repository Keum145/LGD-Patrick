import { NextRequest, NextResponse } from "next/server";

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const textOf = (xml: string, tag: string) => {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return match
    ? decodeXml(match[1])
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
};

const normalizePublishedAt = (value: string) => {
  const korean = value.match(
    /(?:일|월|화|수|목|금|토),?\s*(\d{1,2})\s*(\d{1,2})월\s*(\d{4})/,
  );
  if (!korean) return value;
  return new Date(
    Date.UTC(Number(korean[3]), Number(korean[2]) - 1, Number(korean[1])),
  ).toUTCString();
};

const detectDeadline = (text: string, publishedAt: string) => {
  const match = text.match(/(\d{1,2})월\s*(\d{1,2})일(?:까지|마감)?/);
  if (match) {
    const year = new Date().getFullYear();
    return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  }
  const dayOnly = text.match(/(?:^|\s)(\d{1,2})일까지/);
  if (!dayOnly || !publishedAt) return null;
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return null;
  return `${published.getFullYear()}-${String(published.getMonth() + 1).padStart(2, "0")}-${dayOnly[1].padStart(2, "0")}`;
};

const parseFeed = (xml: string, company: string, provider: string) =>
  Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match, index) => {
    const item = match[1];
    const title = textOf(item, "title");
    const description = textOf(item, "description");
    const pubDate = normalizePublishedAt(textOf(item, "pubDate"));
    const link = textOf(item, "link");
    let hostname = "";
    try {
      hostname = new URL(link).hostname.replace(/^www\./, "");
    } catch {
      hostname = provider;
    }
    return {
      id: `${provider}-${company}-${index}`,
      title,
      link,
      source: textOf(item, "source") || hostname || provider,
      pubDate,
      description: description.slice(0, 180),
      detectedDeadline: detectDeadline(`${title} ${description}`, pubDate),
      provider,
    };
  });

export async function GET(request: NextRequest) {
  const company = request.nextUrl.searchParams.get("company")?.trim();
  if (!company)
    return NextResponse.json(
      { error: "회사명을 입력해 주세요." },
      { status: 400 },
    );

  try {
    const query = encodeURIComponent(`${company} 채용 공고`);
    const feeds = [
      {
        provider: "웹 검색",
        url: `https://www.bing.com/search?format=rss&q=${query}`,
      },
      {
        provider: "채용 뉴스",
        url: `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`,
      },
    ];
    const responses = await Promise.allSettled(
      feeds.map(async (feed) => {
        const response = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0 PatrickJobHunt/1.0" },
          next: { revalidate: 1800 },
        });
        if (!response.ok)
          throw new Error(`${feed.provider} responded ${response.status}`);
        return parseFeed(await response.text(), company, feed.provider);
      }),
    );
    const merged = responses.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    const unique = Array.from(
      new Map(
        merged
          .filter((item) => item.title && item.link)
          .map((item) => [item.link, item]),
      ).values(),
    );
    const officialPattern = /career|careers|recruit|job|채용/i;
    const items = unique
      .sort(
        (a, b) =>
          Number(officialPattern.test(b.link)) -
            Number(officialPattern.test(a.link)) ||
          Number(Boolean(b.detectedDeadline)) -
            Number(Boolean(a.detectedDeadline)),
      )
      .slice(0, 12);
    if (!items.length) throw new Error("No results");
    return NextResponse.json({ company, items });
  } catch {
    return NextResponse.json({
      company,
      items: [],
      error: "실시간 결과를 불러오지 못했습니다.",
      fallbackUrl: `https://news.google.com/search?q=${encodeURIComponent(`${company} 채용 공고`)}&hl=ko&gl=KR&ceid=KR%3Ako`,
    });
  }
}
