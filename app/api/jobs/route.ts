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
  const fullDate = text.match(/(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/);
  if (fullDate) {
    return `${fullDate[1]}-${fullDate[2].padStart(2, "0")}-${fullDate[3].padStart(2, "0")}`;
  }
  const match = text.match(/(\d{1,2})월\s*(\d{1,2})일(?:까지|마감)?/);
  if (match) {
    const year = new Date().getFullYear();
    return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  }
  const shortDate = text.match(
    /(?:~|마감\s*[:：]?\s*)(\d{1,2})[.\/-]\s*(\d{1,2})/,
  );
  if (shortDate) {
    const year = new Date().getFullYear();
    return `${year}-${shortDate[1].padStart(2, "0")}-${shortDate[2].padStart(2, "0")}`;
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
      source: hostname.includes("jasoseol.com")
        ? "자소설닷컴"
        : hostname.includes("saramin.co.kr")
          ? "사람인"
          : hostname.includes("jobkorea.co.kr")
            ? "잡코리아"
            : hostname.includes("wanted.co.kr")
              ? "원티드"
              : hostname.includes("catch.co.kr")
                ? "캐치"
                : textOf(item, "source") || hostname || provider,
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
    const jobSiteQuery = encodeURIComponent(
      `"${company}" 채용 (site:jasoseol.com OR site:saramin.co.kr OR site:jobkorea.co.kr OR site:wanted.co.kr OR site:catch.co.kr)`,
    );
    const officialQuery = encodeURIComponent(`"${company}" 공식 채용 공고`);
    const feeds = [
      {
        provider: "채용 사이트",
        url: `https://www.bing.com/search?format=rss&q=${jobSiteQuery}`,
      },
      {
        provider: "공식 채용",
        url: `https://www.bing.com/search?format=rss&q=${officialQuery}`,
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
    const recruitmentPlatformPattern =
      /jasoseol\.com|saramin\.co\.kr|jobkorea\.co\.kr|wanted\.co\.kr|catch\.co\.kr/i;
    const officialPattern = /career|careers|recruit|job|채용/i;
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
    }).format(new Date());
    const items = unique
      .filter(
        (item) =>
          (recruitmentPlatformPattern.test(item.link) ||
            officialPattern.test(item.link) ||
            /채용|공채|신입|인턴|career|recruit|jobs?/i.test(
              `${item.title} ${item.description}`,
            )) &&
          (!item.detectedDeadline ||
            item.detectedDeadline.localeCompare(today) >= 0),
      )
      .sort(
        (a, b) =>
          Number(recruitmentPlatformPattern.test(b.link)) -
            Number(recruitmentPlatformPattern.test(a.link)) ||
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
      fallbackUrl: `https://www.google.com/search?q=${encodeURIComponent(`"${company}" 채용 (site:jasoseol.com OR site:saramin.co.kr OR site:jobkorea.co.kr OR site:wanted.co.kr OR site:catch.co.kr)`)}`,
    });
  }
}
