const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const normalizeCompanyName = (value: string) =>
  value
    .toLocaleLowerCase("ko-KR")
    .replace(/㈜|\(주\)|주식회사|[^a-z0-9가-힣]/g, "");

export type JobKoreaListing = {
  id: string;
  title: string;
  link: string;
  source: "잡코리아";
  pubDate: string;
  description: string;
  detectedDeadline: string | null;
  provider: "잡코리아 회사 공고";
  location: string;
  industry: string;
  experienceLevel: "신입" | "경력" | "무관";
};

export const parseJobKoreaCompanyJobs = (
  html: string,
  company: string,
): JobKoreaListing[] => {
  const decoded = html.replace(/\\"/g, '"').replace(/\\u0026/g, "&");
  const requestedCompany = normalizeCompanyName(company);
  const companyPattern =
    /"address":"([^"]*)","name":"([^"]+)"[\s\S]{0,1600}?"industry":"([^"]*)"[\s\S]{0,1600}?"jobInfos":\[([\s\S]*?)\]\}/g;
  const companyMatch = Array.from(decoded.matchAll(companyPattern)).find(
    (match) => normalizeCompanyName(match[2]) === requestedCompany,
  );
  if (!companyMatch) return [];

  const jobPattern =
    /"jobId":"([^"]+)"[\s\S]*?"title":"([^"]+)"[\s\S]*?"applicationEndAt":"([^"]+)"/g;
  return Array.from(companyMatch[4].matchAll(jobPattern)).map((match) => {
    const deadline = match[3].slice(0, 10);
    const alwaysHiring = Number(deadline.slice(0, 4)) >= 2060;
    const careerType = match[0].match(/"career":\{"type":"([^"]+)"/)?.[1];
    return {
      id: `jobkorea-${match[1]}`,
      title: decodeHtml(match[2]),
      link: `https://www.jobkorea.co.kr/Recruit/GI_Read/${match[1]}`,
      source: "잡코리아",
      pubDate: "",
      description: alwaysHiring
        ? "잡코리아에서 상시채용으로 확인된 공고예요."
        : "잡코리아 회사별 공고에서 마감일을 확인했어요.",
      detectedDeadline: alwaysHiring ? null : deadline,
      provider: "잡코리아 회사 공고",
      location: decodeHtml(companyMatch[1]).split(" ").slice(0, 2).join(" "),
      industry: decodeHtml(companyMatch[3]),
      experienceLevel:
        careerType === "1" ? "신입" : careerType === "2" ? "경력" : "무관",
    };
  });
};

export const fetchJobKoreaCompanyJobs = async (
  company: string,
  revalidate = 3600,
) => {
  const response = await fetch(
    `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(company)}`,
    {
      headers: { "User-Agent": "Mozilla/5.0 PatrickJobHunt/1.0" },
      next: { revalidate },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    throw new Error(`JobKorea responded ${response.status}`);
  }
  return parseJobKoreaCompanyJobs(await response.text(), company);
};
