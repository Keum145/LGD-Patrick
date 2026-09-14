"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  AlertCircle,
  Award,
  Bell,
  BookOpenText,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Clock3,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Newspaper,
  PencilLine,
  Plus,
  Search,
  Shell,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";

type EventKind = "서류 시작" | "서류 마감" | "인적성" | "1차 면접";
type ApplicationStatus =
  | "관심 있음"
  | "준비 중"
  | "지원 완료"
  | "서류 합격"
  | "인적성"
  | "면접"
  | "최종 합격"
  | "불합격";
type JobEvent = {
  id: string;
  applicationId: string;
  company: string;
  kind: EventKind;
  date: string;
  color: string;
};
type JobListing = {
  id: string;
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string;
  detectedDeadline: string | null;
  startDate?: string | null;
  confidence?: "높음" | "보통" | "낮음";
};
type SavedJob = {
  id: string;
  company: string;
  title: string;
  link: string;
  source: string;
  description: string;
  deadline: string | null;
  savedAt: string;
};
type Application = {
  id: string;
  jobId: string;
  company: string;
  title: string;
  link: string;
  description: string;
  deadline: string;
  status: ApplicationStatus;
  rejectionReason: string;
  retrospective: string;
};
type RetrospectiveRecord = {
  id: string;
  applicationId: string;
  company: string;
  jobTitle: string;
  title: string;
  rejectionReason: string;
  reflection: string;
  createdAt: string;
};
type CoverLetterRecommendation = {
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
type TarotChoice = {
  id: string;
  name: string;
  orientation: "정방향" | "역방향";
};
type TarotFollowUpMessage = {
  role: "user" | "assistant";
  text: string;
};

const tarotMajorArcana = [
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
] as const;

const shuffleTarotDeck = (): TarotChoice[] =>
  tarotMajorArcana
    .map((name) => ({ name, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 9)
    .map(({ name }, index) => ({
      id: `${name}-${Date.now()}-${index}`,
      name,
      orientation: Math.random() < 0.5 ? "정방향" : "역방향",
    }));
type Experience = [
  tag: string,
  title: string,
  description: string,
  color: string,
];
type ExamScheduleItem = {
  label: string;
  start: string;
  end?: string;
};
type ExamSession = {
  id: string;
  label: string;
  schedules: ExamScheduleItem[];
};
type CertificationDefinition = {
  id: string;
  name: string;
  aliases?: string[];
  category: string;
  recommendation: string;
  color: string;
  sourceUrl: string;
  scheduleNotice?: string;
  sessions: ExamSession[];
};
type CertificationPlan = {
  id: string;
  certificationId: string;
  sessionId: string;
  addedAt: string;
};
type CertificationCalendarEvent = {
  id: string;
  planId: string;
  certificationId: string;
  certification: string;
  session: string;
  label: string;
  date: string;
  color: string;
};
type UserWorkspace = {
  savedJobs?: SavedJob[];
  applications?: Array<Application & { statusHistory?: unknown }>;
  events?: JobEvent[];
  retrospectives?: RetrospectiveRecord[];
  certificationPlans?: CertificationPlan[];
  customCertifications?: CertificationDefinition[];
  experiences?: Experience[];
  birthday?: string;
};

const STATUS: ApplicationStatus[] = [
  "관심 있음",
  "준비 중",
  "지원 완료",
  "서류 합격",
  "인적성",
  "면접",
  "최종 합격",
  "불합격",
];
const engineerSessions: ExamSession[] = [
  {
    id: "engineer-1",
    label: "정기 기사 제1회",
    schedules: [
      { label: "필기 원서접수", start: "2026-01-12", end: "2026-01-15" },
      { label: "필기시험", start: "2026-01-30", end: "2026-03-03" },
      { label: "실기 원서접수", start: "2026-03-23", end: "2026-03-26" },
      { label: "실기시험", start: "2026-04-18", end: "2026-05-06" },
      { label: "최종 합격발표", start: "2026-06-12" },
    ],
  },
  {
    id: "engineer-2",
    label: "정기 기사 제2회",
    schedules: [
      { label: "필기 원서접수", start: "2026-04-20", end: "2026-04-23" },
      { label: "필기시험", start: "2026-05-09", end: "2026-05-29" },
      { label: "실기 원서접수", start: "2026-06-22", end: "2026-06-25" },
      { label: "실기시험", start: "2026-07-18", end: "2026-08-05" },
      { label: "최종 합격발표", start: "2026-09-11" },
    ],
  },
  {
    id: "engineer-3",
    label: "정기 기사 제3회",
    schedules: [
      { label: "필기 원서접수", start: "2026-07-20", end: "2026-07-23" },
      { label: "필기시험", start: "2026-08-07", end: "2026-09-01" },
      { label: "실기 원서접수", start: "2026-09-21", end: "2026-09-23" },
      { label: "실기시험", start: "2026-10-24", end: "2026-11-13" },
      { label: "최종 합격발표", start: "2026-12-18" },
    ],
  },
];
const historySessions: ExamSession[] = [
  ["77", "2026-01-06", "2026-01-13", "2026-02-07", "2026-02-20"],
  ["78", "2026-04-21", "2026-04-28", "2026-05-23", "2026-06-05"],
  ["79", "2026-07-07", "2026-07-14", "2026-08-09", "2026-08-21"],
  ["80", "2026-09-15", "2026-09-22", "2026-10-17", "2026-10-30"],
  ["81", "2026-11-03", "2026-11-10", "2026-11-28", "2026-12-11"],
].map(([round, registrationStart, registrationEnd, examDate, resultDate]) => ({
  id: `history-${round}`,
  label: `제${round}회`,
  schedules: [
    {
      label: "원서접수",
      start: registrationStart,
      end: registrationEnd,
    },
    { label: "시험일", start: examDate },
    { label: "합격자 발표", start: resultDate },
  ],
}));
const adspSessions: ExamSession[] = [
  ["48", "2026-01-05", "2026-01-09", "2026-02-07", "2026-03-06"],
  ["49", "2026-04-13", "2026-04-17", "2026-05-17", "2026-06-05"],
  ["50", "2026-07-06", "2026-07-10", "2026-08-08", "2026-08-28"],
  ["51", "2026-09-28", "2026-10-02", "2026-10-31", "2026-11-20"],
].map(([round, registrationStart, registrationEnd, examDate, resultDate]) => ({
  id: `adsp-${round}`,
  label: `제${round}회`,
  schedules: [
    { label: "원서접수", start: registrationStart, end: registrationEnd },
    { label: "시험일", start: examDate },
    { label: "합격자 발표", start: resultDate },
  ],
}));
const sqldSessions: ExamSession[] = [
  ["60", "2026-02-02", "2026-02-06", "2026-03-07", "2026-03-27"],
  ["61", "2026-04-27", "2026-05-01", "2026-05-31", "2026-06-19"],
  ["62", "2026-07-20", "2026-07-24", "2026-08-22", "2026-09-11"],
  ["63", "2026-10-12", "2026-10-16", "2026-11-14", "2026-12-04"],
].map(([round, registrationStart, registrationEnd, examDate, resultDate]) => ({
  id: `sqld-${round}`,
  label: `제${round}회`,
  schedules: [
    { label: "원서접수", start: registrationStart, end: registrationEnd },
    { label: "시험일", start: examDate },
    { label: "합격자 발표", start: resultDate },
  ],
}));
const certificationCatalog: CertificationDefinition[] = [
  {
    id: "information-processing-engineer",
    name: "정보처리기사",
    aliases: ["정처기"],
    category: "IT·소프트웨어",
    recommendation: "개발·IT 시스템 직무 준비에 추천",
    color: "#7f75d9",
    sourceUrl:
      "https://www.q-net.or.kr/crf021.do?gSite=Q&id=crf02101&scheType=03",
    sessions: engineerSessions,
  },
  {
    id: "electrical-engineer",
    name: "전기기사",
    category: "전기·전자",
    recommendation: "설비·전기·반도체 인프라 직무에 추천",
    color: "#e0a93a",
    sourceUrl:
      "https://www.q-net.or.kr/crf021.do?gSite=Q&id=crf02101&scheType=03",
    sessions: engineerSessions,
  },
  {
    id: "industrial-safety-engineer",
    name: "산업안전기사",
    category: "안전관리",
    recommendation: "제조·공정·안전 직무에 추천",
    color: "#e26f79",
    sourceUrl:
      "https://www.q-net.or.kr/crf021.do?gSite=Q&id=crf02101&scheType=03",
    sessions: engineerSessions,
  },
  {
    id: "quality-management-engineer",
    name: "품질경영기사",
    category: "생산·품질",
    recommendation: "반도체 공정·품질 직무에 추천",
    color: "#53a98b",
    sourceUrl:
      "https://www.q-net.or.kr/crf021.do?gSite=Q&id=crf02101&scheType=03",
    sessions: engineerSessions,
  },
  {
    id: "adsp",
    name: "ADsP 데이터분석 준전문가",
    aliases: ["ADSP", "데이터분석준전문가"],
    category: "데이터·분석",
    recommendation: "데이터 분석 입문과 공기업 데이터 직무에 추천",
    color: "#4e9eb5",
    sourceUrl: "https://www.dataq.or.kr/www/main.do",
    sessions: adspSessions,
  },
  {
    id: "sqld",
    name: "SQLD SQL 개발자",
    aliases: ["SQL개발자"],
    category: "데이터·SQL",
    recommendation: "데이터베이스·개발·데이터 직무에 추천",
    color: "#4f78bf",
    sourceUrl: "https://www.dataq.or.kr/www/main.do",
    sessions: sqldSessions,
  },
  {
    id: "adp",
    name: "ADP 데이터분석 전문가",
    aliases: ["데이터분석전문가"],
    category: "K-DATA 데이터·분석",
    recommendation: "고급 데이터 분석·모델링 역량을 증명하는 전문가 자격",
    color: "#357f91",
    sourceUrl: "https://www.dataq.or.kr/www/main.do",
    scheduleNotice:
      "K-DATA 공식 일정에서 필기·실기 회차를 확인한 뒤 예약한 시험일을 등록해 주세요.",
    sessions: [],
  },
  {
    id: "sqlp",
    name: "SQLP SQL 전문가",
    aliases: ["SQL전문가"],
    category: "K-DATA 데이터·SQL",
    recommendation: "SQL 튜닝과 데이터베이스 설계 심화 직무에 추천",
    color: "#3d67a6",
    sourceUrl: "https://www.dataq.or.kr/www/main.do",
    scheduleNotice:
      "K-DATA 공식 일정에서 SQLP 시행 회차를 확인한 뒤 시험일을 등록해 주세요.",
    sessions: [],
  },
  {
    id: "dap",
    name: "DAP 데이터아키텍처 전문가",
    aliases: ["데이터아키텍처전문가"],
    category: "K-DATA 데이터·아키텍처",
    recommendation: "데이터 모델링·표준화·아키텍처 직무에 추천",
    color: "#6267ad",
    sourceUrl: "https://www.dataq.or.kr/www/main.do",
    scheduleNotice:
      "K-DATA 공식 일정에서 DAP 시행 회차를 확인한 뒤 시험일을 등록해 주세요.",
    sessions: [],
  },
  {
    id: "dasp",
    name: "DAsP 데이터아키텍처 준전문가",
    aliases: ["DASP", "데이터아키텍처준전문가"],
    category: "K-DATA 데이터·아키텍처",
    recommendation: "데이터 모델링과 아키텍처 입문 직무에 추천",
    color: "#7774bd",
    sourceUrl: "https://www.dataq.or.kr/www/main.do",
    scheduleNotice:
      "K-DATA 공식 일정에서 DAsP 시행 회차를 확인한 뒤 시험일을 등록해 주세요.",
    sessions: [],
  },
  {
    id: "big-data-analysis-engineer",
    name: "빅데이터분석기사",
    aliases: ["빅분기", "BAE"],
    category: "K-DATA 국가기술자격",
    recommendation: "데이터 분석·AI·빅데이터 직무 준비에 추천",
    color: "#348c82",
    sourceUrl: "https://www.dataq.or.kr/www/main.do",
    scheduleNotice:
      "K-DATA 공식 일정에서 필기·실기 접수일을 확인한 뒤 준비할 회차를 등록해 주세요.",
    sessions: [],
  },
  {
    id: "computer-skills-level-1",
    name: "컴퓨터활용능력 1급",
    aliases: ["컴활1급", "컴활 1급", "컴퓨터활용능력1급"],
    category: "대한상공회의소·상시검정",
    recommendation: "사무·데이터 활용 직무에서 활용도가 높은 국가기술자격",
    color: "#d99045",
    sourceUrl: "https://license.korcham.net/co/examguide03.do?cd=0202&mm=21",
    scheduleNotice:
      "컴활은 시험장마다 개설일이 다른 상시검정입니다. 공식 접수처에서 날짜를 예약한 뒤 내 시험일을 등록해 주세요.",
    sessions: [],
  },
  {
    id: "computer-skills-level-2",
    name: "컴퓨터활용능력 2급",
    aliases: ["컴활2급", "컴활 2급", "컴퓨터활용능력2급"],
    category: "대한상공회의소·상시검정",
    recommendation: "기본적인 스프레드시트 활용 역량을 증명하는 국가기술자격",
    color: "#d79c5f",
    sourceUrl: "https://license.korcham.net/co/examguide03.do?cd=0202&mm=21",
    scheduleNotice:
      "컴활은 시험장마다 개설일이 다른 상시검정입니다. 공식 접수처에서 날짜를 예약한 뒤 내 시험일을 등록해 주세요.",
    sessions: [],
  },
  {
    id: "korean-history",
    name: "한국사능력검정시험",
    category: "공공·공기업",
    recommendation: "공기업·공공기관 지원 준비에 추천",
    color: "#bf7a52",
    sourceUrl: "https://www.historyexam.go.kr/pageLink.do?link=examSchedule",
    sessions: historySessions,
  },
];
const companies: Record<string, { accent: string; dates: string[] }> = {
  삼성전자: {
    accent: "#ff85a2",
    dates: ["2026-09-04", "2026-09-17", "2026-09-23", "2026-09-29"],
  },
  LG전자: {
    accent: "#9a8cff",
    dates: ["2026-09-08", "2026-09-19", "2026-09-25", "2026-10-02"],
  },
  카카오: {
    accent: "#edc75a",
    dates: ["2026-09-11", "2026-09-21", "2026-09-27", "2026-10-06"],
  },
};
const sampleExperienceTitles = new Set([
  "하이브리드 에너지 하베스팅 소자 연구",
  "서울대 ISRC 반도체 공정 실습",
  "성균관대 공정 교육",
  "Verilog 기반 행렬 곱셈 가속기 및 RISC-toy 시스템 구현",
  "용산구청 행정인턴 및 명동 의류매장 스태프",
]);
const sampleJobIds = new Set(
  Object.keys(companies).map((company) => `job-${company}`),
);
const sampleApplicationIds = new Set(
  Object.keys(companies).map((company) => `application-${company}`),
);
const kinds: EventKind[] = ["서류 시작", "서류 마감", "인적성", "1차 면접"];
const experienceColors: Record<string, string> = {
  논문: "#ffcad8",
  실습: "#c8f0df",
  교육: "#d9d2ff",
  프로젝트: "#ffe6a8",
  인턴: "#c9e9f4",
  대외활동: "#ffd4ae",
  자격증: "#d7efb5",
  기타: "#e5e1da",
};

const companyNews: Record<
  string,
  { title: string; source: string; date: string; url: string }[]
> = {
  삼성전자: [
    {
      title: "삼성전자 채용·인재 소식 모아보기",
      source: "Google 뉴스",
      date: "실시간 검색",
      url: "https://news.google.com/search?q=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90%20%EC%B1%84%EC%9A%A9&hl=ko&gl=KR&ceid=KR%3Ako",
    },
    {
      title: "반도체·AI 사업 최신 소식 확인하기",
      source: "삼성전자 뉴스룸",
      date: "공식 뉴스룸",
      url: "https://news.samsung.com/kr/",
    },
  ],
  LG전자: [
    {
      title: "LG전자 채용·인재 소식 모아보기",
      source: "Google 뉴스",
      date: "실시간 검색",
      url: "https://news.google.com/search?q=LG%EC%A0%84%EC%9E%90%20%EC%B1%84%EC%9A%A9&hl=ko&gl=KR&ceid=KR%3Ako",
    },
    {
      title: "LG전자 기술·제품 최신 소식 확인하기",
      source: "LiVE LG",
      date: "공식 뉴스룸",
      url: "https://live.lge.co.kr/",
    },
  ],
  카카오: [
    {
      title: "카카오그룹, AI·글로벌로 성장 기어 전환",
      source: "카카오",
      date: "2026.01.02",
      url: "https://www.kakaocorp.com/page/detail/11870?lang=KOR",
    },
    {
      title: "카카오 채용·인재 소식 모아보기",
      source: "Google 뉴스",
      date: "실시간 검색",
      url: "https://news.google.com/search?q=%EC%B9%B4%EC%B9%B4%EC%98%A4%20%EC%B1%84%EC%9A%A9&hl=ko&gl=KR&ceid=KR%3Ako",
    },
  ],
};

const companyResources: Record<string, { careers: string; homepage: string }> =
  {
    삼성전자: {
      careers: "https://www.samsungcareers.com/",
      homepage: "https://www.samsung.com/sec/",
    },
    LG전자: {
      careers: "https://recruit.lg.com/?locale=ko_KR",
      homepage: "https://www.lge.co.kr/",
    },
    SK하이닉스: {
      careers: "https://www.skcareers.com/",
      homepage: "https://www.skhynix.com/",
    },
    카카오: {
      careers: "https://careers.kakao.com/jobs",
      homepage: "https://www.kakaocorp.com/",
    },
    현대자동차: {
      careers: "https://talent.hyundai.com/",
      homepage: "https://www.hyundai.com/kr/ko",
    },
  };

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;
const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return dateKey(value.getFullYear(), value.getMonth(), value.getDate());
};
const patrickMessages = [
  {
    label: "뚱이의 오늘 한마디",
    title: "오늘은 공고 하나만 봐도 잘한 거야. 🌸",
    description: "천천히, 하나씩 해보자!",
    color: "#ff85a2",
  },
  {
    label: "오늘의 취업 동기",
    title: "완벽한 지원서보다 제출한 지원서가 한 걸음 더 앞이야. 🐚",
    description: "15분만 시작하면 다음 문장은 생각보다 쉽게 나와요.",
    color: "#6bb99c",
  },
  {
    label: "마음 충전 문장",
    title: "느린 날도 방향만 맞으면 충분히 전진하고 있어. 🌊",
    description: "남의 속도 대신 어제의 나와 비교해 봐요.",
    color: "#7f75d9",
  },
  {
    label: "오늘의 작은 미션",
    title: "공고 한 개를 열고 요구 역량 세 가지만 표시해 보자. ✏️",
    description: "작게 쪼갠 준비가 결국 면접 답변이 됩니다.",
    color: "#d69a3c",
  },
  {
    label: "뚱이의 응원",
    title: "탈락은 부족함의 증명이 아니라 방향을 다듬는 자료야. ⭐",
    description: "이번에 배운 한 줄을 다음 지원서에 꼭 가져가요.",
    color: "#e56f8a",
  },
];
const fortuneMessages = [
  {
    title: "연락 운이 반짝이는 날이에요. 📩",
    description: "메일함을 확인하고 미뤄둔 지원 한 건을 마무리해 보세요.",
  },
  {
    title: "집중력이 조용히 올라오는 날이에요. 🎯",
    description: "가장 어려운 자소서 문항을 25분만 붙잡아 보세요.",
  },
  {
    title: "경험을 연결하는 감각이 좋은 날이에요. 🐚",
    description: "조개함 경험 하나를 골라 성과를 숫자로 다듬어 보세요.",
  },
  {
    title: "새로운 기회를 발견할 가능성이 높아요. 🔎",
    description: "평소와 다른 직무 키워드로 공고를 한 번 검색해 보세요.",
  },
  {
    title: "말의 설득력이 살아나는 날이에요. 🎙️",
    description: "면접 답변 하나를 소리 내어 1분 안에 말해 보세요.",
  },
];

function Patrick() {
  return (
    <div
      className="patrick-scene group relative h-28 w-32 shrink-0"
      aria-label="뚱이 캐릭터 이미지"
    >
      <span className="patrick-bubble patrick-bubble-one absolute left-2 top-2 h-4 w-4 rounded-full border border-white/70 bg-[#a8e6cf]/55" />
      <span className="patrick-bubble patrick-bubble-two absolute right-0 top-8 h-2.5 w-2.5 rounded-full border border-white/70 bg-[#a8e6cf]/70" />
      <span className="patrick-sparkle absolute right-4 top-1 text-lg text-[#ffd56a]">
        ✦
      </span>
      <span className="patrick-shadow absolute bottom-1 left-1/2 h-3 w-20 -translate-x-1/2 rounded-[50%] bg-[#b98575]/15 blur-[2px]" />
      <img
        src="https://media.giphy.com/media/8WJw9kAG3wonu/giphy.gif"
        alt="깃발을 들고 신나 하는 뚱이"
        className="patrick-character patrick-giphy relative z-10 h-full w-full object-cover drop-shadow-[0_10px_12px_rgba(255,120,154,.24)]"
      />
      <a
        href="https://giphy.com/gifs/happy-excited-spongebob-squarepants-8WJw9kAG3wonu"
        target="_blank"
        rel="noreferrer"
        aria-label="GIPHY에서 뚱이 애니메이션 원본 보기"
        className="absolute bottom-0 right-1 z-20 rounded-full bg-black/35 px-1.5 py-0.5 text-[7px] font-bold text-white/90 backdrop-blur-sm"
      >
        via GIPHY
      </a>
    </div>
  );
}

export default function Home() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    birthday: "",
    email: "",
    password: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [syncState, setSyncState] = useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("idle");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const currentDateRef = useRef(currentDate);
  const [birthday, setBirthday] = useState("");
  const [birthdayDraft, setBirthdayDraft] = useState("");
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [patrickMessageIndex, setPatrickMessageIndex] = useState(0);
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [retrospectives, setRetrospectives] = useState<RetrospectiveRecord[]>(
    [],
  );
  const [certificationPlans, setCertificationPlans] = useState<
    CertificationPlan[]
  >([]);
  const [customCertifications, setCustomCertifications] = useState<
    CertificationDefinition[]
  >([]);
  const [certificationPlannerOpen, setCertificationPlannerOpen] =
    useState(false);
  const [certificationSearch, setCertificationSearch] = useState("");
  const [certificationHasSearched, setCertificationHasSearched] =
    useState(false);
  const [certificationLoading, setCertificationLoading] = useState(false);
  const [certificationError, setCertificationError] = useState("");
  const [showCustomCertificationForm, setShowCustomCertificationForm] =
    useState(false);
  const [customCertificationForm, setCustomCertificationForm] = useState({
    name: "",
    sessionLabel: "",
    registrationStart: "",
    registrationEnd: "",
    examDate: "",
    resultDate: "",
  });
  const [selectedCertificationId, setSelectedCertificationId] = useState(
    certificationCatalog[0].id,
  );
  const [jobDataReady, setJobDataReady] = useState(false);
  const [selected, setSelected] = useState<JobEvent | null>(null);
  const [tab, setTab] = useState<"detail" | "saved" | "shell">("detail");
  const [vaultTab, setVaultTab] = useState<"experiences" | "retrospectives">(
    "experiences",
  );
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(false);
  const [toastText, setToastText] = useState("오늘도 한 걸음 잘 해냈어요.");
  const [showWelcome, setShowWelcome] = useState(true);
  const [jobSearch, setJobSearch] = useState<{
    open: boolean;
    company: string;
    loading: boolean;
    items: JobListing[];
    error: string;
    fallbackUrl: string;
  }>({
    open: false,
    company: "",
    loading: false,
    items: [],
    error: "",
    fallbackUrl: "",
  });
  const [pickedListing, setPickedListing] = useState<JobListing | null>(null);
  const [deadline, setDeadline] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [showManualListing, setShowManualListing] = useState(false);
  const [stageEditor, setStageEditor] = useState(false);
  const [manualStageKind, setManualStageKind] = useState<"인적성" | "1차 면접">(
    "인적성",
  );
  const [manualStageDate, setManualStageDate] = useState("");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [experienceEditIndex, setExperienceEditIndex] = useState<number | null>(
    null,
  );
  const [experienceDeleteTarget, setExperienceDeleteTarget] = useState<{
    index: number;
    title: string;
  } | null>(null);
  const [experienceForm, setExperienceForm] = useState({
    tag: "프로젝트",
    title: "",
    description: "",
  });
  const [aiRecommendation, setAiRecommendation] = useState<{
    open: boolean;
    loading: boolean;
    error: string;
    data: CoverLetterRecommendation | null;
  }>({ open: false, loading: false, error: "", data: null });
  const [tarot, setTarot] = useState<{
    open: boolean;
    loading: boolean;
    error: string;
    data: TarotReading | null;
  }>({ open: false, loading: false, error: "", data: null });
  const [tarotQuestion, setTarotQuestion] = useState("");
  const [tarotDeck, setTarotDeck] = useState<TarotChoice[]>([]);
  const [tarotIsShuffling, setTarotIsShuffling] = useState(false);
  const tarotShuffleTimerRef = useRef<number | null>(null);
  const [selectedTarotCardIds, setSelectedTarotCardIds] = useState<string[]>(
    [],
  );
  const [tarotTarget, setTarotTarget] = useState<"self" | "other">("self");
  const [otherTarotPerson, setOtherTarotPerson] = useState({
    name: "",
    birthday: "",
  });
  const [tarotFollowUpQuestion, setTarotFollowUpQuestion] = useState("");
  const [tarotFollowUps, setTarotFollowUps] = useState<TarotFollowUpMessage[]>(
    [],
  );
  const [tarotFollowUpLoading, setTarotFollowUpLoading] = useState(false);
  const [tarotFollowUpError, setTarotFollowUpError] = useState("");
  const [tarotReadingContext, setTarotReadingContext] = useState<{
    question: string;
    targetName: string;
    birthday: string;
  } | null>(null);

  useEffect(() => {
    const refreshCurrentDate = () => {
      const next = new Date();
      const previous = currentDateRef.current;
      const dayChanged =
        dateKey(next.getFullYear(), next.getMonth(), next.getDate()) !==
        dateKey(
          previous.getFullYear(),
          previous.getMonth(),
          previous.getDate(),
        );
      currentDateRef.current = next;
      setCurrentDate(next);
      if (dayChanged) {
        setViewDate((visibleMonth) => {
          const wasViewingCurrentMonth =
            visibleMonth.getFullYear() === previous.getFullYear() &&
            visibleMonth.getMonth() === previous.getMonth();
          return wasViewingCurrentMonth
            ? new Date(next.getFullYear(), next.getMonth(), 1)
            : visibleMonth;
        });
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshCurrentDate();
    };
    const intervalId = window.setInterval(refreshCurrentDate, 60_000);
    window.addEventListener("focus", refreshCurrentDate);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshCurrentDate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data.user ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user ?? null);
        setAuthReady(true);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const messageCount = patrickMessages.length + (birthday ? 1 : 0);
    const intervalId = window.setInterval(() => {
      setPatrickMessageIndex((current) => (current + 1) % messageCount);
    }, 6500);
    return () => window.clearInterval(intervalId);
  }, [birthday]);

  useEffect(() => {
    if (!authUser || !supabase) {
      setJobDataReady(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    const loadWorkspace = async () => {
      setSyncState("loading");
      const { data, error } = await client
        .from("user_workspaces")
        .select("data")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncState("error");
        setAuthError(
          "개인 작업공간을 불러오지 못했어요. Supabase SQL 설정을 확인해 주세요.",
        );
        return;
      }

      let workspace = data?.data as UserWorkspace | undefined;
      if (!workspace) {
        try {
          const legacyWorkspace = window.localStorage.getItem(
            "patrick-job-workspace",
          );
          const legacyExperiences = window.localStorage.getItem(
            "patrick-job-experiences",
          );
          const legacyBirthday = window.localStorage.getItem(
            "patrick-job-birthday",
          );
          workspace = legacyWorkspace
            ? (JSON.parse(legacyWorkspace) as UserWorkspace)
            : {};
          if (legacyExperiences)
            workspace.experiences = JSON.parse(legacyExperiences);
          if (legacyBirthday) workspace.birthday = legacyBirthday;
        } catch {
          workspace = {};
        }
      }

      // Remove seed data from accounts that used an older version of the app.
      workspace = {
        ...workspace,
        savedJobs: workspace.savedJobs?.filter(
          (job) => job.source !== "샘플 공고" && !sampleJobIds.has(job.id),
        ),
        applications: workspace.applications?.filter(
          (application) => !sampleApplicationIds.has(application.id),
        ),
        events: workspace.events?.filter(
          (event) => !sampleApplicationIds.has(event.applicationId),
        ),
        experiences: workspace.experiences?.filter(
          ([, title]) => !sampleExperienceTitles.has(title),
        ),
      };

      if (workspace.savedJobs) setSavedJobs(workspace.savedJobs);
      if (workspace.applications) {
        setApplications(
          workspace.applications.map((savedApplication) => {
            const application = { ...savedApplication };
            delete application.statusHistory;
            return application;
          }),
        );
      }
      if (workspace.events) {
        setEvents(workspace.events);
        setSelected(workspace.events[0] ?? null);
      }
      if (workspace.retrospectives) setRetrospectives(workspace.retrospectives);
      if (workspace.certificationPlans)
        setCertificationPlans(workspace.certificationPlans);
      if (workspace.customCertifications)
        setCustomCertifications(workspace.customCertifications);
      if (workspace.experiences) setExperiences(workspace.experiences);
      const metadataBirthday = authUser.user_metadata.birth_date;
      const savedBirthday =
        workspace.birthday ||
        (typeof metadataBirthday === "string" ? metadataBirthday : "");
      if (savedBirthday) {
        workspace.birthday = savedBirthday;
        setBirthday(savedBirthday);
        setBirthdayDraft(savedBirthday);
      }
      setJobDataReady(true);
      setSyncState("saved");
    };
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!jobDataReady || !authUser || !supabase) return;
    const client = supabase;
    setSyncState("saving");
    const saveTimer = window.setTimeout(async () => {
      const workspace: UserWorkspace = {
        savedJobs,
        applications,
        events,
        retrospectives,
        certificationPlans,
        customCertifications,
        experiences,
        birthday,
      };
      const { error } = await client.from("user_workspaces").upsert({
        user_id: authUser.id,
        data: workspace,
        updated_at: new Date().toISOString(),
      });
      setSyncState(error ? "error" : "saved");
    }, 700);
    return () => window.clearTimeout(saveTimer);
  }, [
    authUser,
    birthday,
    savedJobs,
    applications,
    events,
    retrospectives,
    certificationPlans,
    customCertifications,
    experiences,
    jobDataReady,
  ]);
  const days = useMemo(() => {
    const y = viewDate.getFullYear(),
      m = viewDate.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, i) => {
      const d = i - first + 1;
      return d > 0 && d <= total ? dateKey(y, m, d) : null;
    });
  }, [viewDate]);
  const availableCertifications = useMemo(() => {
    const certifications = new Map<string, CertificationDefinition>();
    [...certificationCatalog, ...customCertifications].forEach(
      (certification) => certifications.set(certification.id, certification),
    );
    return Array.from(certifications.values());
  }, [customCertifications]);
  const certificationEvents = useMemo<CertificationCalendarEvent[]>(
    () =>
      certificationPlans.flatMap((plan) => {
        const certification = availableCertifications.find(
          (item) => item.id === plan.certificationId,
        );
        const session = certification?.sessions.find(
          (item) => item.id === plan.sessionId,
        );
        if (!certification || !session) return [];
        return session.schedules.flatMap((schedule, scheduleIndex) => {
          const startEvent: CertificationCalendarEvent = {
            id: `${plan.id}-${scheduleIndex}-start`,
            planId: plan.id,
            certificationId: certification.id,
            certification: certification.name,
            session: session.label,
            label: schedule.end ? `${schedule.label} 시작` : schedule.label,
            date: schedule.start,
            color: certification.color,
          };
          if (!schedule.end || schedule.end === schedule.start)
            return [startEvent];
          return [
            startEvent,
            {
              ...startEvent,
              id: `${plan.id}-${scheduleIndex}-end`,
              label: `${schedule.label} ${schedule.label.includes("접수") ? "마감" : "종료"}`,
              date: schedule.end,
            },
          ];
        });
      }),
    [availableCertifications, certificationPlans],
  );
  const selectedCertification =
    availableCertifications.find(
      (item) => item.id === selectedCertificationId,
    ) ?? availableCertifications[0];
  const filteredCertifications = useMemo(() => {
    if (!certificationHasSearched) return [];
    const keyword = certificationSearch
      .trim()
      .toLocaleLowerCase("ko-KR")
      .replaceAll(" ", "");
    if (!keyword) return [];
    return availableCertifications
      .filter((certification) =>
        `${certification.name}${certification.category}${certification.aliases?.join("") ?? ""}`
          .toLocaleLowerCase("ko-KR")
          .replaceAll(" ", "")
          .includes(keyword),
      )
      .sort((a, b) => {
        const aName = a.name.toLocaleLowerCase("ko-KR").replaceAll(" ", "");
        const bName = b.name.toLocaleLowerCase("ko-KR").replaceAll(" ", "");
        return Number(bName === keyword) - Number(aName === keyword);
      });
  }, [availableCertifications, certificationHasSearched, certificationSearch]);
  const selectedApplication = selected
    ? (applications.find(
        (application) => application.id === selected.applicationId,
      ) ?? null)
    : null;

  const searchCompany = async (name: string) => {
    if (!name.trim()) return;
    setJobSearch({
      open: true,
      company: name,
      loading: true,
      items: [],
      error: "",
      fallbackUrl: "",
    });
    setPickedListing(null);
    setDeadline("");
    setManualTitle("");
    setShowManualListing(false);
    try {
      const response = await fetch(
        `/api/jobs?company=${encodeURIComponent(name)}`,
      );
      const data = await response.json();
      setJobSearch({
        open: true,
        company: name,
        loading: false,
        items: data.items ?? [],
        error: data.error || "",
        fallbackUrl: data.fallbackUrl ?? "",
      });
    } catch {
      setJobSearch({
        open: true,
        company: name,
        loading: false,
        items: [],
        error: "검색 중 문제가 생겼어요.",
        fallbackUrl: `https://www.google.com/search?q=${encodeURIComponent(`"${name}" 채용 (site:jasoseol.com OR site:saramin.co.kr OR site:jobkorea.co.kr OR site:wanted.co.kr OR site:catch.co.kr)`)}`,
      });
    }
  };
  const addCompany = () => searchCompany(query.trim());
  const searchCertification = async (requestedName = certificationSearch) => {
    const name = requestedName.trim();
    if (!name) {
      setCertificationHasSearched(false);
      return;
    }

    setCertificationSearch(name);
    setCertificationHasSearched(true);
    setCertificationError("");
    const normalizedName = name.toLocaleLowerCase("ko-KR").replaceAll(" ", "");
    const matched = availableCertifications.find((certification) =>
      `${certification.name}${certification.category}${certification.aliases?.join("") ?? ""}`
        .toLocaleLowerCase("ko-KR")
        .replaceAll(" ", "")
        .includes(normalizedName),
    );

    const isKdataCertification = Boolean(
      matched?.sourceUrl.includes("dataq.or.kr"),
    );
    if (matched?.sessions.length && !isKdataCertification) {
      setSelectedCertificationId(matched.id);
      return;
    }

    if (matched) setSelectedCertificationId(matched.id);
    setCertificationLoading(true);
    try {
      const response = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as {
        found?: boolean;
        name?: string;
        provider?: string;
        category?: string;
        recommendation?: string;
        sourceUrl?: string;
        scheduleNotice?: string;
        sessions?: Array<{
          id: string;
          label: string;
          schedules: Array<{
            label: string;
            start: string;
            end: string | null;
          }>;
        }>;
        note?: string;
        error?: string;
        cache?: { hit?: boolean; persisted?: boolean };
      };
      if (!response.ok)
        throw new Error(data.error || "일정 검색에 실패했어요.");
      if (!data.found || !data.sessions?.length) {
        throw new Error(
          data.note || "공식 출처에서 발표된 회차별 일정을 찾지 못했어요.",
        );
      }

      const certificationId = matched?.id ?? `searched-${normalizedName}`;
      const discovered: CertificationDefinition = {
        id: certificationId,
        name: data.name || name,
        aliases: Array.from(new Set([...(matched?.aliases ?? []), name])),
        category:
          data.category || `${data.provider || "공식 시행기관"} 시험 일정`,
        recommendation:
          data.recommendation || "공식 발표된 시험 일정을 불러왔어요.",
        color: matched?.color ?? "#7669c8",
        sourceUrl: data.sourceUrl || matched?.sourceUrl || "",
        scheduleNotice: `${data.cache?.hit ? "DB에 저장된 일정을 불러왔어요. " : ""}${data.scheduleNotice || data.note || "공식 일정 검색 결과입니다."}`,
        sessions: data.sessions.map((session) => ({
          ...session,
          schedules: session.schedules.map((schedule) => ({
            label: schedule.label,
            start: schedule.start,
            ...(schedule.end ? { end: schedule.end } : {}),
          })),
        })),
      };
      setCustomCertifications((previous) => [
        ...previous.filter((item) => item.id !== certificationId),
        discovered,
      ]);
      setSelectedCertificationId(certificationId);
    } catch (error) {
      setCertificationError(
        error instanceof Error
          ? error.message
          : "공식 시험일정을 불러오지 못했어요.",
      );
    } finally {
      setCertificationLoading(false);
    }
  };
  const toggleCertificationPlan = (
    certification: CertificationDefinition,
    session: ExamSession,
  ) => {
    const existing = certificationPlans.find(
      (plan) =>
        plan.certificationId === certification.id &&
        plan.sessionId === session.id,
    );
    if (existing) {
      setCertificationPlans((prev) =>
        prev.filter((plan) => plan.id !== existing.id),
      );
      setToastText(`${certification.name} ${session.label} 일정을 뺐어요.`);
    } else {
      setCertificationPlans((prev) => [
        ...prev,
        {
          id: `certification-plan-${certification.id}-${session.id}`,
          certificationId: certification.id,
          sessionId: session.id,
          addedAt: new Date().toISOString(),
        },
      ]);
      const firstDate = new Date(`${session.schedules[0].start}T00:00:00`);
      setViewDate(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
      setToastText(`${certification.name} ${session.label} 일정을 담았어요 🏅`);
    }
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const openCustomCertificationForm = (name = "") => {
    setCustomCertificationForm((prev) => ({ ...prev, name }));
    setShowCustomCertificationForm(true);
  };
  const createCustomCertification = () => {
    const name = customCertificationForm.name.trim();
    if (!name || !customCertificationForm.examDate) return;
    const timestamp = Date.now();
    const certificationId = `custom-certification-${timestamp}`;
    const sessionId = `custom-session-${timestamp}`;
    const schedules: ExamScheduleItem[] = [
      ...(customCertificationForm.registrationStart
        ? [
            {
              label: "원서접수",
              start: customCertificationForm.registrationStart,
              end: customCertificationForm.registrationEnd || undefined,
            },
          ]
        : []),
      { label: "시험일", start: customCertificationForm.examDate },
      ...(customCertificationForm.resultDate
        ? [
            {
              label: "합격자 발표",
              start: customCertificationForm.resultDate,
            },
          ]
        : []),
    ];
    const certification: CertificationDefinition = {
      id: certificationId,
      name,
      category: "직접 등록",
      recommendation: "내가 직접 추가한 시험 일정",
      color: "#9a78c7",
      sourceUrl: "",
      sessions: [
        {
          id: sessionId,
          label:
            customCertificationForm.sessionLabel.trim() || "직접 등록 회차",
          schedules,
        },
      ],
    };
    setCustomCertifications((prev) => [...prev, certification]);
    setCertificationPlans((prev) => [
      ...prev,
      {
        id: `certification-plan-${certificationId}-${sessionId}`,
        certificationId,
        sessionId,
        addedAt: new Date().toISOString(),
      },
    ]);
    setSelectedCertificationId(certificationId);
    setShowCustomCertificationForm(false);
    setCertificationSearch(name);
    setCertificationHasSearched(true);
    setCustomCertificationForm({
      name: "",
      sessionLabel: "",
      registrationStart: "",
      registrationEnd: "",
      examDate: "",
      resultDate: "",
    });
    const examDate = new Date(`${customCertificationForm.examDate}T00:00:00`);
    setViewDate(new Date(examDate.getFullYear(), examDate.getMonth(), 1));
    setToastText(`${name} 일정을 직접 등록했어요 🏅`);
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const currentListing = () => {
    const title = pickedListing?.title ?? manualTitle.trim();
    if (!title) return null;
    return {
      company: jobSearch.company,
      title,
      link: pickedListing?.link ?? "",
      source: pickedListing?.source ?? "직접 등록",
      description: pickedListing?.description ?? "",
      deadline: deadline || null,
    };
  };
  const findSavedJob = (candidate: ReturnType<typeof currentListing>) => {
    if (!candidate) return undefined;
    return savedJobs.find((job) =>
      candidate.link
        ? job.link === candidate.link
        : job.company === candidate.company && job.title === candidate.title,
    );
  };
  const saveCurrentListing = () => {
    const candidate = currentListing();
    if (!candidate) return;
    const duplicate = findSavedJob(candidate);
    if (duplicate) {
      setToastText("이미 공고함에 담긴 공고예요 🐚");
    } else {
      setSavedJobs((prev) => [
        {
          id: `job-${Date.now()}`,
          ...candidate,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setToastText(`${candidate.company} 공고를 스크랩했어요 🔖`);
    }
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const startApplication = (job: SavedJob, closeSearch = false) => {
    if (!job.deadline) {
      setToastText("지원 시작 전에 서류 마감일을 입력해 주세요.");
      setToast(true);
      window.setTimeout(() => setToast(false), 3200);
      return;
    }
    const existing = applications.find(
      (application) => application.jobId === job.id,
    );
    if (existing) {
      const existingEvent = events.find(
        (event) => event.applicationId === existing.id,
      );
      if (existingEvent) setSelected(existingEvent);
      setTab("detail");
      setToastText("이미 지원을 시작한 공고예요.");
      setToast(true);
      window.setTimeout(() => setToast(false), 3200);
      return;
    }
    const company = job.company;
    const accent = companies[company]?.accent ?? "#78cbb1";
    const today = dateKey(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
    );
    const dates = [
      today <= job.deadline ? today : shiftDate(job.deadline, -14),
      job.deadline,
    ];
    const applicationId = `application-${Date.now()}`;
    const application: Application = {
      id: applicationId,
      jobId: job.id,
      company: job.company,
      title: job.title,
      link: job.link,
      description: job.description,
      deadline: job.deadline,
      status: "준비 중",
      rejectionReason: "",
      retrospective: "",
    };
    const newEvents: JobEvent[] = dates.map((date, i) => ({
      id: `${job.company}-${Date.now()}-${i}`,
      applicationId,
      company: job.company,
      kind: kinds[i],
      date,
      color: accent,
    }));
    setApplications((prev) => [application, ...prev]);
    setEvents((prev) => [...prev, ...newEvents]);
    setSelected(newEvents[1]);
    setTab("detail");
    setQuery("");
    if (closeSearch) setJobSearch((prev) => ({ ...prev, open: false }));
    const selectedDate = new Date(`${job.deadline}T00:00:00`);
    setViewDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
    setToastText(`${job.company} 지원 준비를 시작했어요 🌊`);
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const registerListing = () => {
    const candidate = currentListing();
    if (!candidate || !candidate.deadline) return;
    let job = findSavedJob(candidate);
    if (!job) {
      job = {
        id: `job-${Date.now()}`,
        ...candidate,
        savedAt: new Date().toISOString(),
      };
      setSavedJobs((prev) => [job!, ...prev]);
    } else if (job.deadline !== candidate.deadline) {
      job = { ...job, deadline: candidate.deadline };
      const updatedJob = job;
      setSavedJobs((prev) =>
        prev.map((item) => (item.id === updatedJob.id ? updatedJob : item)),
      );
    }
    startApplication(job, true);
  };
  const changeStatus = (status: ApplicationStatus) => {
    if (!selectedApplication || selectedApplication.status === status) return;
    setApplications((prev) =>
      prev.map((application) =>
        application.id === selectedApplication.id
          ? { ...application, status }
          : application,
      ),
    );
    if (status === "지원 완료") {
      setToastText("지원서 제출 완료 · 잠깐 숨 돌리고 다음 일정을 확인해요");
      setToast(true);
      window.setTimeout(() => setToast(false), 3600);
    } else if (status === "최종 합격") {
      setToastText("최종 합격 · 정말 멋지게 해냈어요!");
      setToast(true);
      window.setTimeout(() => setToast(false), 3600);
    }
  };
  const updateApplicationNotes = (
    field: "rejectionReason" | "retrospective",
    value: string,
  ) => {
    if (!selectedApplication) return;
    setApplications((prev) =>
      prev.map((application) =>
        application.id === selectedApplication.id
          ? { ...application, [field]: value }
          : application,
      ),
    );
  };
  const saveRetrospective = () => {
    if (!selectedApplication) return;
    if (
      !selectedApplication.rejectionReason.trim() &&
      !selectedApplication.retrospective.trim()
    ) {
      setToastText("탈락 사유나 회고를 먼저 적어주세요.");
      setToast(true);
      window.setTimeout(() => setToast(false), 3200);
      return;
    }
    const deadline = new Date(`${selectedApplication.deadline}T00:00:00`);
    const period = `${deadline.getFullYear()} ${deadline.getMonth() < 6 ? "상반기" : "하반기"}`;
    const previous = retrospectives.find(
      (record) => record.applicationId === selectedApplication.id,
    );
    const record: RetrospectiveRecord = {
      id: previous?.id ?? `retrospective-${Date.now()}`,
      applicationId: selectedApplication.id,
      company: selectedApplication.company,
      jobTitle: selectedApplication.title,
      title: `${period} ${selectedApplication.company} 회고록`,
      rejectionReason: selectedApplication.rejectionReason.trim(),
      reflection: selectedApplication.retrospective.trim(),
      createdAt: new Date().toISOString(),
    };
    setRetrospectives((prev) =>
      previous
        ? prev.map((item) => (item.id === previous.id ? record : item))
        : [record, ...prev],
    );
    setVaultTab("retrospectives");
    setTab("shell");
    setToastText(
      previous
        ? "회고록을 다시 정리했어요 📖"
        : "회고록을 조개함에 보관했어요 🐚",
    );
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const updateSavedJobDeadline = (jobId: string, value: string) => {
    setSavedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, deadline: value || null } : job,
      ),
    );
  };
  const deleteSavedJob = (jobId: string) => {
    if (applications.some((application) => application.jobId === jobId)) {
      setToastText("지원 중인 공고는 지원 기록을 먼저 정리해 주세요.");
    } else {
      setSavedJobs((prev) => prev.filter((job) => job.id !== jobId));
      setToastText("스크랩 공고를 정리했어요 🫧");
    }
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const deleteCompany = () => {
    if (!deleteTarget) return;
    const remaining = events.filter((event) => event.company !== deleteTarget);
    setEvents(remaining);
    setApplications((prev) =>
      prev.filter((application) => application.company !== deleteTarget),
    );
    setSelected(remaining[0] ?? null);
    setDeleteTarget(null);
    setToastText(`${deleteTarget}의 모든 일정을 정리했어요 🫧`);
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const addManualStage = () => {
    if (!selected || !selectedApplication || !manualStageDate) return;
    const added: JobEvent = {
      id: `${selected.company}-manual-${Date.now()}`,
      applicationId: selectedApplication.id,
      company: selected.company,
      kind: manualStageKind,
      date: manualStageDate,
      color: selected.color,
    };
    setEvents((prev) => [...prev, added]);
    setSelected(added);
    setStageEditor(false);
    setManualStageDate("");
    const stageDate = new Date(`${manualStageDate}T00:00:00`);
    setViewDate(new Date(stageDate.getFullYear(), stageDate.getMonth(), 1));
    setToastText(`${selected.company} ${manualStageKind} 일정을 추가했어요 ✍️`);
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const openExperienceCreate = () => {
    setExperienceEditIndex(null);
    setExperienceForm({ tag: "프로젝트", title: "", description: "" });
    setShowExperienceModal(true);
  };
  const openExperienceEdit = (index: number) => {
    const [tag, title, description] = experiences[index];
    setExperienceEditIndex(index);
    setExperienceForm({ tag, title, description });
    setShowExperienceModal(true);
  };
  const closeExperienceModal = () => {
    setShowExperienceModal(false);
    setExperienceEditIndex(null);
    setExperienceForm({ tag: "프로젝트", title: "", description: "" });
  };
  const saveExperience = () => {
    const title = experienceForm.title.trim();
    if (!title) return;
    const updatedExperience: Experience = [
      experienceForm.tag,
      title,
      experienceForm.description.trim() || "상세 내용을 천천히 채워보세요.",
      experienceColors[experienceForm.tag] ?? experienceColors.기타,
    ];
    setExperiences((prev) =>
      experienceEditIndex === null
        ? [updatedExperience, ...prev]
        : prev.map((experience, index) =>
            index === experienceEditIndex ? updatedExperience : experience,
          ),
    );
    const wasEditing = experienceEditIndex !== null;
    closeExperienceModal();
    setToastText(
      wasEditing
        ? "경험 기록을 새롭게 다듬었어요 ✏️"
        : "새로운 경험을 조개함에 담았어요 🐚",
    );
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const deleteExperience = () => {
    if (!experienceDeleteTarget) return;
    setExperiences((prev) =>
      prev.filter((_, index) => index !== experienceDeleteTarget.index),
    );
    setExperienceDeleteTarget(null);
    setToastText("경험을 조개함에서 꺼냈어요 🫧");
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const requestCoverLetter = async () => {
    if (!selected || !selectedApplication) return;
    setAiRecommendation({ open: true, loading: true, error: "", data: null });
    try {
      const response = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: selected.company,
          listingTitle: selectedApplication.title,
          listingDescription: selectedApplication.description,
          experiences: experiences.map(([tag, title, description]) => ({
            tag,
            title,
            description,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "AI 추천에 실패했습니다.");
      setAiRecommendation({ open: true, loading: false, error: "", data });
    } catch (error) {
      setAiRecommendation({
        open: true,
        loading: false,
        error:
          error instanceof Error ? error.message : "AI 추천에 실패했습니다.",
        data: null,
      });
    }
  };
  const openTarotRoom = () => {
    if (tarotShuffleTimerRef.current !== null) {
      window.clearTimeout(tarotShuffleTimerRef.current);
      tarotShuffleTimerRef.current = null;
    }
    setTarot({ open: true, loading: false, error: "", data: null });
    setTarotIsShuffling(false);
    setTarotDeck(shuffleTarotDeck());
    setSelectedTarotCardIds([]);
    setTarotFollowUps([]);
    setTarotFollowUpQuestion("");
    setTarotFollowUpError("");
    setTarotReadingContext(null);
  };
  const closeTarotRoom = () => {
    if (tarotShuffleTimerRef.current !== null) {
      window.clearTimeout(tarotShuffleTimerRef.current);
      tarotShuffleTimerRef.current = null;
    }
    setTarotIsShuffling(false);
    setTarot((previous) => ({ ...previous, open: false }));
  };
  const changeTarotTarget = (target: "self" | "other") => {
    setTarotTarget(target);
    setTarot((previous) => ({ ...previous, error: "", data: null }));
    setTarotFollowUps([]);
    setTarotFollowUpQuestion("");
    setTarotFollowUpError("");
    setTarotReadingContext(null);
  };
  const reshuffleTarotDeck = () => {
    if (tarot.loading || tarotIsShuffling) return;
    setTarot((previous) => ({ ...previous, error: "", data: null }));
    setTarotIsShuffling(true);
    setSelectedTarotCardIds([]);
    setTarotFollowUps([]);
    setTarotFollowUpQuestion("");
    setTarotFollowUpError("");
    setTarotReadingContext(null);
    tarotShuffleTimerRef.current = window.setTimeout(() => {
      setTarotDeck(shuffleTarotDeck());
      setTarotIsShuffling(false);
      tarotShuffleTimerRef.current = null;
    }, 720);
  };
  const toggleTarotCard = (cardId: string) => {
    if (tarot.loading || tarotIsShuffling) return;
    setTarot((previous) => ({ ...previous, error: "", data: null }));
    setTarotFollowUps([]);
    setTarotFollowUpError("");
    setTarotReadingContext(null);
    setSelectedTarotCardIds((previous) =>
      previous.includes(cardId)
        ? previous.filter((id) => id !== cardId)
        : previous.length < 3
          ? [...previous, cardId]
          : previous,
    );
  };
  const requestTarotReading = async () => {
    const question = tarotQuestion.trim();
    const targetBirthday =
      tarotTarget === "self" ? birthday : otherTarotPerson.birthday;
    const targetName =
      tarotTarget === "self"
        ? (authUser?.user_metadata.display_name as string | undefined) || "본인"
        : otherTarotPerson.name.trim();
    const selectedCards = selectedTarotCardIds
      .map((id) => tarotDeck.find((card) => card.id === id))
      .filter((card): card is TarotChoice => Boolean(card));
    if (
      !question ||
      selectedCards.length !== 3 ||
      !targetBirthday ||
      (tarotTarget === "other" && !targetName)
    )
      return;
    setTarot((previous) => ({
      ...previous,
      loading: true,
      error: "",
      data: null,
    }));
    try {
      const response = await fetch("/api/ai/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          birthday: targetBirthday,
          readingTarget: tarotTarget,
          targetName,
          company:
            tarotTarget === "self" ? selectedApplication?.company : undefined,
          status:
            tarotTarget === "self" ? selectedApplication?.status : undefined,
          selectedCards: selectedCards.map(({ name, orientation }) => ({
            name,
            orientation,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "타로 카드를 펼치지 못했어요.");
      setTarot({ open: true, loading: false, error: "", data });
      setTarotFollowUps([]);
      setTarotFollowUpQuestion("");
      setTarotFollowUpError("");
      setTarotReadingContext({
        question,
        targetName,
        birthday: targetBirthday,
      });
    } catch (error) {
      setTarot({
        open: true,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "타로 카드를 펼치지 못했어요.",
        data: null,
      });
    }
  };
  const requestTarotFollowUp = async () => {
    const question = tarotFollowUpQuestion.trim();
    if (
      !question ||
      !tarot.data ||
      !tarotReadingContext ||
      tarotFollowUpLoading
    )
      return;
    const nextUserMessage: TarotFollowUpMessage = {
      role: "user",
      text: question,
    };
    setTarotFollowUps((previous) => [...previous, nextUserMessage]);
    setTarotFollowUpQuestion("");
    setTarotFollowUpLoading(true);
    setTarotFollowUpError("");
    try {
      const response = await fetch("/api/ai/tarot/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          originalQuestion: tarotReadingContext.question,
          targetName: tarotReadingContext.targetName,
          birthday: tarotReadingContext.birthday,
          reading: tarot.data,
          previousMessages: tarotFollowUps.slice(-6),
        }),
      });
      const data = (await response.json()) as {
        answer?: string;
        closing?: string;
        error?: string;
      };
      if (!response.ok || !data.answer)
        throw new Error(data.error || "후속 답변을 불러오지 못했어요.");
      setTarotFollowUps((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `${data.answer}${data.closing ? `\n\n${data.closing}` : ""}`,
        },
      ]);
    } catch (error) {
      setTarotFollowUpError(
        error instanceof Error
          ? error.message
          : "후속 답변을 불러오지 못했어요.",
      );
    } finally {
      setTarotFollowUpLoading(false);
    }
  };
  const submitAuth = async () => {
    if (!supabase || !authForm.email.trim() || !authForm.password) return;
    setAuthLoading(true);
    setAuthError("");
    setAuthNotice("");
    if (authMode === "signup") {
      if (!authForm.name.trim()) {
        setAuthError("사용할 이름을 입력해 주세요.");
        setAuthLoading(false);
        return;
      }
      if (!authForm.birthday) {
        setAuthError("생년월일을 입력해 주세요.");
        setAuthLoading(false);
        return;
      }
      if (authForm.password.length < 6) {
        setAuthError("비밀번호는 6자 이상으로 만들어 주세요.");
        setAuthLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email.trim(),
        password: authForm.password,
        options: {
          data: {
            display_name: authForm.name.trim(),
            birth_date: authForm.birthday,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) setAuthError(error.message);
      else if (!data.session)
        setAuthNotice(
          "가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.",
        );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email.trim(),
        password: authForm.password,
      });
      if (error) setAuthError("이메일 또는 비밀번호를 다시 확인해 주세요.");
    }
    setAuthLoading(false);
  };
  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setJobDataReady(false);
    setSavedJobs([]);
    setApplications([]);
    setEvents([]);
    setSelected(null);
    setExperiences([]);
    setRetrospectives([]);
    setCertificationPlans([]);
    setCustomCertifications([]);
    setBirthday("");
    setBirthdayDraft("");
    setSyncState("idle");
  };
  const monthLabel = `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;
  const currentDateLabel = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 · ${["일", "월", "화", "수", "목", "금", "토"][currentDate.getDay()]}요일`;
  const todayKey = dateKey(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );
  const upcomingDeadlines = events
    .filter((event) => event.kind === "서류 마감" && event.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  const urgentDeadlines = upcomingDeadlines.filter(
    (event) =>
      (new Date(`${event.date}T00:00:00`).getTime() -
        new Date(`${todayKey}T00:00:00`).getTime()) /
        86400000 <=
      3,
  );
  const birthdaySeed = `${birthday}-${todayKey}`
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const fortune = fortuneMessages[birthdaySeed % fortuneMessages.length];
  const fortuneScore = 76 + (birthdaySeed % 23);
  const dailyMessages = birthday
    ? [
        {
          label: `오늘의 취업 운세 · ${fortuneScore}점`,
          title: fortune.title,
          description: fortune.description,
          color: "#7669c8",
        },
        ...patrickMessages,
      ]
    : patrickMessages;
  const activePatrickMessage =
    dailyMessages[patrickMessageIndex % dailyMessages.length];
  const saveBirthday = async () => {
    if (!birthdayDraft) return;
    if (supabase && authUser) {
      const { error } = await supabase.auth.updateUser({
        data: { birth_date: birthdayDraft },
      });
      if (error) {
        setAuthError(
          "생일을 계정에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
    }
    setBirthday(birthdayDraft);
    setPatrickMessageIndex(0);
    setBirthdayModalOpen(false);
    setToastText("생일을 저장했어요. 오늘의 취업 운세가 열렸어요 ⭐");
    setToast(true);
    window.setTimeout(() => setToast(false), 3200);
  };
  const selectedNews = selected
    ? [
        ...(companyNews[selected.company] ?? [
          {
            title: `${selected.company} 채용 관련 최신 뉴스`,
            source: "Google 뉴스",
            date: "실시간 검색",
            url: `https://news.google.com/search?q=${encodeURIComponent(`${selected.company} 채용`)}&hl=ko&gl=KR&ceid=KR%3Ako`,
          },
          {
            title: `${selected.company} 기업·산업 동향 살펴보기`,
            source: "Google 뉴스",
            date: "실시간 검색",
            url: `https://news.google.com/search?q=${encodeURIComponent(selected.company)}&hl=ko&gl=KR&ceid=KR%3Ako`,
          },
        ]),
        ...(selectedApplication?.link
          ? [
              {
                title: "등록한 채용 공고 원문 바로가기",
                source: "공고 원문",
                date: "지원 전 확인",
                url: selectedApplication.link,
              },
            ]
          : []),
        {
          title: `${selected.company} 채용 사이트 바로가기`,
          source: "공식 채용",
          date: "지원·공고 확인",
          url:
            companyResources[selected.company]?.careers ??
            `https://www.google.com/search?q=${encodeURIComponent(`${selected.company} 공식 채용 사이트`)}`,
        },
        {
          title: `${selected.company} 공식 홈페이지 바로가기`,
          source: "공식 홈페이지",
          date: "기업 정보 확인",
          url:
            companyResources[selected.company]?.homepage ??
            `https://www.google.com/search?q=${encodeURIComponent(`${selected.company} 공식 홈페이지`)}`,
        },
      ]
    : [];

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4ebd0]">
        <LoaderCircle className="animate-spin text-[#ff85a2]" size={32} />
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4ebd0] p-5 text-[#31363f]">
        <div className="w-full max-w-lg rounded-[32px] bg-white p-7 text-center paper-shadow md:p-9">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#ffedf2] text-3xl">
            ⭐
          </div>
          <p className="mt-5 text-xs font-extrabold text-[#ef6d86]">
            개인 계정 기능 준비 완료
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-.04em]">
            Supabase 연결이 필요해요
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#89847c]">
            회원가입과 사용자별 데이터 보호 코드는 준비됐습니다. 아래 두
            환경변수를 입력하면 로그인 화면이 바로 열려요.
          </p>
          <div className="mt-5 rounded-2xl bg-[#f7f3ff] p-4 text-left font-mono text-[11px] leading-6 text-[#655a9b]">
            NEXT_PUBLIC_SUPABASE_URL
            <br />
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[#9a958d]">
            프로젝트의 SQL Editor에서 <b>supabase/schema.sql</b>도 한 번
            실행해야 사용자별 저장소가 생성됩니다.
          </p>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4ebd0] p-5 text-[#31363f]">
        <div className="absolute left-[8%] top-[12%] text-6xl opacity-20">
          🫧
        </div>
        <div className="absolute bottom-[10%] right-[8%] text-7xl opacity-15">
          🐚
        </div>
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[36px] bg-white paper-shadow md:grid-cols-[.9fr_1.1fr]">
          <div className="relative hidden overflow-hidden bg-[#ffedf2] p-8 md:flex md:flex-col md:justify-between">
            <div>
              <div className="flex h-12 w-12 rotate-[-8deg] items-center justify-center rounded-2xl bg-[#ff85a2] text-2xl">
                ⭐
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-[-.05em]">
                뚱이랑 취뽀
              </h1>
              <p className="mt-3 text-sm font-bold leading-6 text-[#a36576]">
                공고부터 경험, 자격증 일정까지
                <br />내 취업 준비를 한곳에 안전하게.
              </p>
            </div>
            <Patrick />
          </div>
          <div className="p-6 md:p-10">
            <div className="mb-7 md:hidden">
              <p className="text-xl font-extrabold">⭐ 뚱이랑 취뽀</p>
            </div>
            <div className="flex rounded-2xl bg-[#f4f1eb] p-1">
              {(["login", "signup"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAuthMode(mode);
                    setAuthError("");
                    setAuthNotice("");
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition ${authMode === mode ? "bg-white text-[#31363f] shadow-sm" : "text-[#969087]"}`}
                >
                  {mode === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>
            <h2 className="mt-7 text-2xl font-extrabold tracking-[-.04em]">
              {authMode === "login"
                ? "다시 만나서 반가워요!"
                : "나만의 취뽀 바다 만들기"}
            </h2>
            <p className="mt-2 text-xs text-[#918c84]">
              {authMode === "login"
                ? "저장해 둔 일정을 이어서 준비해 볼까요?"
                : "가입하면 모든 기록이 내 계정에 따로 저장돼요."}
            </p>
            <div className="mt-6 space-y-3">
              {authMode === "signup" && (
                <>
                  <label className="block text-xs font-extrabold text-[#6f6a63]">
                    이름
                    <input
                      value={authForm.name}
                      onChange={(event) =>
                        setAuthForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="뚱이"
                      className="mt-1.5 w-full rounded-2xl border border-[#e5dfd6] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#ff85a2]"
                    />
                  </label>
                  <label className="block text-xs font-extrabold text-[#6f6a63]">
                    생년월일
                    <input
                      type="date"
                      value={authForm.birthday}
                      max={todayKey}
                      onChange={(event) =>
                        setAuthForm((prev) => ({
                          ...prev,
                          birthday: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-2xl border border-[#e5dfd6] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#ff85a2]"
                    />
                    <span className="mt-1.5 block text-[9px] font-medium leading-4 text-[#a49d94]">
                      오늘의 운세와 타로에 사용되며 내 계정에만 저장돼요.
                    </span>
                  </label>
                </>
              )}
              <label className="block text-xs font-extrabold text-[#6f6a63]">
                이메일
                <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-[#e5dfd6] bg-[#fffdfa] px-4 focus-within:border-[#ff85a2]">
                  <Mail size={15} className="text-[#aaa49b]" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={authForm.email}
                    onChange={(event) =>
                      setAuthForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="hello@example.com"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </label>
              <label className="block text-xs font-extrabold text-[#6f6a63]">
                비밀번호
                <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-[#e5dfd6] bg-[#fffdfa] px-4 focus-within:border-[#ff85a2]">
                  <LockKeyhole size={15} className="text-[#aaa49b]" />
                  <input
                    type="password"
                    autoComplete={
                      authMode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submitAuth();
                    }}
                    placeholder="6자 이상 입력"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </label>
            </div>
            {authError && (
              <p className="mt-4 rounded-xl bg-[#fff0f3] px-3 py-2.5 text-[11px] font-bold text-[#d75d75]">
                {authError}
              </p>
            )}
            {authNotice && (
              <p className="mt-4 rounded-xl bg-[#edf9f5] px-3 py-2.5 text-[11px] font-bold leading-5 text-[#4f917a]">
                {authNotice}
              </p>
            )}
            <button
              onClick={() => void submitAuth()}
              disabled={
                authLoading ||
                !authForm.email.trim() ||
                !authForm.password ||
                (authMode === "signup" &&
                  (!authForm.name.trim() || !authForm.birthday))
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff85a2] py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {authLoading && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              {authMode === "login"
                ? "로그인하고 이어서 준비하기"
                : "무료로 회원가입"}
            </button>
            <p className="mt-4 text-center text-[10px] leading-5 text-[#aaa49b]">
              비밀번호는 앱 코드나 DB에 저장하지 않고 인증 서비스가 안전하게
              처리합니다.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!jobDataReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4ebd0] p-5 text-[#31363f]">
        <div className="rounded-[28px] bg-white p-7 text-center paper-shadow">
          {syncState === "error" ? (
            <>
              <AlertCircle className="mx-auto text-[#e8667d]" size={30} />
              <p className="mt-3 text-sm font-extrabold">{authError}</p>
              <p className="mt-2 text-[11px] text-[#938e86]">
                supabase/schema.sql을 실행한 뒤 새로고침해 주세요.
              </p>
            </>
          ) : (
            <>
              <LoaderCircle className="mx-auto animate-spin text-[#ff85a2]" />
              <p className="mt-3 text-sm font-extrabold">
                내 취뽀 바다를 불러오는 중이에요
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen px-4 py-5 text-[#31363f] md:px-8 md:py-7">
      <header className="app-header mx-auto mb-6 flex max-w-[1480px] items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="brand-badge flex h-11 w-11 items-center justify-center rounded-2xl text-2xl">
            ⭐
          </div>
          <div>
            <h1 className="brand-title text-xl md:text-2xl">뚱이랑 취뽀</h1>
            <p className="text-xs font-medium text-[#92908a]">
              Patrick's Job Hunt · 느긋하게, 하지만 꾸준히
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-full bg-white/60 px-4 py-2 text-xs font-bold text-[#92908a] sm:block">
            {currentDateLabel}
          </div>
          <button
            onClick={() => setShowWelcome(true)}
            aria-label="마감 알림 보기"
            className="relative rounded-full bg-white/70 p-3 shadow-sm"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ff85a2]" />
          </button>
          <div className="hidden items-center gap-2 rounded-full bg-white/70 py-1.5 pl-3 pr-1.5 shadow-sm md:flex">
            <div>
              <p className="text-[10px] font-extrabold text-[#5f5a53]">
                {(authUser.user_metadata.display_name as string | undefined) ??
                  authUser.email?.split("@")[0]}
              </p>
              <p
                className={`text-[9px] font-bold ${syncState === "error" ? "text-[#e8667d]" : "text-[#8f8981]"}`}
              >
                {syncState === "saving"
                  ? "저장 중…"
                  : syncState === "error"
                    ? "동기화 오류"
                    : "동기화됨"}
              </p>
            </div>
            <button
              onClick={() => void logout()}
              aria-label="로그아웃"
              title="로그아웃"
              className="rounded-full bg-[#31363f] p-2.5 text-white"
            >
              <LogOut size={15} />
            </button>
          </div>
          <button
            onClick={() => void logout()}
            aria-label="로그아웃"
            className="rounded-full bg-[#31363f] p-3 text-white shadow-sm md:hidden"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="action-dock mx-auto mb-5 flex max-w-[1480px] flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setCertificationPlannerOpen(true);
            setCertificationHasSearched(false);
            setCertificationSearch("");
            setCertificationError("");
          }}
          className="mr-2 flex items-center gap-1.5 rounded-full bg-[#31363f] px-3.5 py-2 text-[11px] font-extrabold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          <Award size={14} className="text-[#ffd56a]" /> 자격증 레이더
          {certificationPlans.length > 0 && (
            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px]">
              {certificationPlans.length}
            </span>
          )}
        </button>
        <button
          onClick={openTarotRoom}
          className="mr-2 flex items-center gap-1.5 rounded-full border border-[#d8cdf1] bg-[#f3efff] px-3.5 py-2 text-[11px] font-extrabold text-[#6754a8] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ece5fb]"
        >
          🔮 취업 타로방
        </button>
        <span className="mr-1 text-[11px] font-extrabold text-[#8f8a82]">
          빠른 공고 찾기
        </span>
        {["삼성전자", "LG전자", "SK하이닉스", "카카오", "현대자동차"].map(
          (company) => (
            <button
              key={company}
              onClick={() => searchCompany(company)}
              className="rounded-full border border-white/80 bg-white/60 px-3 py-1.5 text-[11px] font-extrabold text-[#68655f] shadow-sm transition hover:border-[#ffb6c7] hover:bg-white hover:text-[#ed6f8b]"
            >
              {company}
            </button>
          ),
        )}
      </div>

      <section className="mx-auto grid max-w-[1480px] gap-6 md:grid-cols-[minmax(0,1.55fr)_minmax(330px,.8fr)] app-grid">
        <div className="min-w-0">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-sm font-bold text-[#ff85a2]">
                나의 취뽀 바다
              </p>
              <h2 className="text-3xl font-extrabold tracking-[-.06em] md:text-4xl">
                이번 달 일정
              </h2>
            </div>
            <div className="flex w-full max-w-md items-center gap-2 rounded-2xl bg-white px-3 py-2.5 paper-shadow">
              <Search size={18} className="text-[#92908a]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCompany()}
                placeholder="기업명을 입력해 공고를 추가해 보세요"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b8b5ae]"
              />
              <button
                onClick={addCompany}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-[#ff85a2] px-3 py-2 text-xs font-extrabold text-white transition hover:brightness-95"
              >
                <Plus size={15} /> 추가
              </button>
            </div>
          </div>
          <div className="patrick-banner relative mb-5 flex min-h-[132px] items-center justify-between overflow-hidden rounded-[28px] bg-[#fffaf0] px-4 py-2 paper-shadow md:px-5">
            <div className="absolute -bottom-5 right-24 text-6xl opacity-[.06]">
              🐚
            </div>
            <div className="absolute right-4 top-2 text-3xl opacity-20">🫧</div>
            <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-2">
              <Patrick />
              <div
                key={`${todayKey}-${patrickMessageIndex}`}
                className="min-w-0 flex-1 animate-[patrickSlide_.45s_ease-out]"
              >
                <span
                  className="mb-1 inline-block rounded-full bg-white/75 px-2 py-1 text-[10px] font-extrabold"
                  style={{ color: activePatrickMessage.color }}
                >
                  {activePatrickMessage.label}
                </span>
                <p className="max-w-xl text-sm font-extrabold leading-5 md:text-base md:leading-6">
                  {activePatrickMessage.title}
                </p>
                <p className="mt-1 text-xs text-[#92908a]">
                  {activePatrickMessage.description}
                </p>
              </div>
            </div>
            <div className="relative z-10 ml-2 flex shrink-0 flex-col items-end gap-3">
              <button
                onClick={() => {
                  setBirthdayDraft(birthday);
                  setBirthdayModalOpen(true);
                }}
                className="rounded-full border border-[#eadfd2] bg-white/80 px-2.5 py-1.5 text-[10px] font-extrabold text-[#7d756d] shadow-sm"
              >
                {birthday ? "🎂 생일 수정" : "🎂 생일 등록"}
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setPatrickMessageIndex(
                      (current) =>
                        (current - 1 + dailyMessages.length) %
                        dailyMessages.length,
                    )
                  }
                  aria-label="이전 응원 문구"
                  className="rounded-full bg-white/80 p-1.5 text-[#8e877f] shadow-sm"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="hidden items-center gap-1 sm:flex">
                  {dailyMessages.map((message, index) => (
                    <button
                      key={`${message.label}-${index}`}
                      onClick={() => setPatrickMessageIndex(index)}
                      aria-label={`${index + 1}번째 응원 문구`}
                      className={`h-1.5 rounded-full transition-all ${index === patrickMessageIndex % dailyMessages.length ? "w-5 bg-[#ff85a2]" : "w-1.5 bg-[#d8d0c6]"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() =>
                    setPatrickMessageIndex(
                      (current) => (current + 1) % dailyMessages.length,
                    )
                  }
                  aria-label="다음 응원 문구"
                  className="rounded-full bg-white/80 p-1.5 text-[#8e877f] shadow-sm"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="surface-card overflow-hidden rounded-[28px] bg-white paper-shadow">
            <div className="flex items-center justify-between border-b border-[#f1eee7] px-5 py-5 md:px-7">
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setViewDate(
                      new Date(
                        viewDate.getFullYear(),
                        viewDate.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                  className="rounded-xl p-2 hover:bg-[#fff2f5]"
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-xl font-extrabold">{monthLabel}</h3>
                <button
                  onClick={() =>
                    setViewDate(
                      new Date(
                        viewDate.getFullYear(),
                        viewDate.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  className="rounded-xl p-2 hover:bg-[#fff2f5]"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button
                onClick={() =>
                  setViewDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      1,
                    ),
                  )
                }
                className="rounded-xl bg-[#f7f4ed] px-3 py-2 text-xs font-bold text-[#77746e]"
              >
                오늘
              </button>
            </div>
            <div className="calendar-grid border-b border-[#f1eee7] bg-[#fffcf7]">
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <div
                  key={d}
                  className={`py-3 text-center text-xs font-extrabold ${i === 0 ? "text-[#ff85a2]" : i === 6 ? "text-[#7bc7aa]" : "text-[#92908a]"}`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="calendar-grid">
              {days.map((date, i) => {
                const cellEvents = date
                  ? events.filter((e) => e.date === date)
                  : [];
                const cellCertificationEvents = date
                  ? certificationEvents.filter((event) => event.date === date)
                  : [];
                const isToday = date === todayKey;
                const urgent = cellEvents.some(
                  (e) =>
                    e.kind === "서류 마감" &&
                    e.date >= todayKey &&
                    new Date(`${e.date}T00:00:00`).getTime() -
                      new Date(`${todayKey}T00:00:00`).getTime() <=
                      3 * 86400000,
                );
                return (
                  <div
                    key={`${date}-${i}`}
                    className={`calendar-day min-h-[102px] border-b border-r border-[#f1eee7] p-1.5 md:min-h-[126px] md:p-2 ${!date ? "bg-[#fbfaf7]" : "bg-white"}`}
                  >
                    <div
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? "bg-[#31363f] text-white" : i % 7 === 0 ? "text-[#ff85a2]" : i % 7 === 6 ? "text-[#6dbb9a]" : "text-[#77746e]"}`}
                    >
                      {date ? Number(date.slice(-2)) : ""}
                    </div>
                    {urgent && (
                      <span className="mb-1 ml-1 inline-block rounded-full bg-[#fff0f2] px-1.5 py-0.5 text-[10px] font-extrabold text-[#f0647b]">
                        🚨 마감 임박
                      </span>
                    )}
                    {cellEvents.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelected(e);
                          setTab("detail");
                        }}
                        className={`mb-1 block w-full truncate rounded-lg border-l-[3px] px-2 py-1.5 text-left text-[10px] font-extrabold transition hover:brightness-95 md:text-xs ${e.kind === "서류 마감" ? "bg-[#fff0f3]" : e.kind === "1차 면접" ? "bg-[#f0edff]" : "bg-[#eefaf5]"}`}
                        style={{ borderLeftColor: e.color }}
                      >
                        {e.company}{" "}
                        <span className="font-medium opacity-70">
                          · {e.kind.replace("서류 ", "")}
                        </span>
                      </button>
                    ))}
                    {cellCertificationEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => {
                          setSelectedCertificationId(event.certificationId);
                          setCertificationSearch(event.certification);
                          setCertificationHasSearched(true);
                          setCertificationPlannerOpen(true);
                        }}
                        className="mb-1 block w-full truncate rounded-lg border-l-[3px] bg-[#f3f0ff] px-2 py-1.5 text-left text-[10px] font-extrabold text-[#6259a3] transition hover:brightness-95 md:text-xs"
                        style={{ borderLeftColor: event.color }}
                        title={`${event.certification} ${event.session} · ${event.label}`}
                      >
                        🏅 {event.certification}{" "}
                        <span className="font-medium opacity-70">
                          · {event.label}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#92908a]">
            <span className="rounded-full bg-white/70 px-3 py-2">
              총 {new Set(events.map((e) => e.company)).size}개 기업
            </span>
            <span className="rounded-full bg-[#fff0f3] px-3 py-2 text-[#ef6e85]">
              마감 임박 {urgentDeadlines.length}건
            </span>
            <span className="rounded-full bg-[#e8f8f1] px-3 py-2 text-[#55a786]">
              이번 달 일정{" "}
              {
                events.filter((e) =>
                  e.date.startsWith(
                    `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}`,
                  ),
                ).length
              }
              건
            </span>
            <span className="rounded-full bg-[#f0edff] px-3 py-2 text-[#6f63bf]">
              자격증 계획 {certificationPlans.length}개
            </span>
          </div>
          {pickedListing && (
            <p className="px-6 pb-5 text-[10px] font-bold text-[#8f8a82]">
              캘린더에는 서류 시작·마감만 등록됩니다. 인적성·면접은 확정 후 직접
              추가해 주세요.
            </p>
          )}
        </div>

        <aside className="surface-card side-panel rounded-[28px] bg-white p-2 paper-shadow">
          <div className="panel-tabs flex rounded-2xl bg-[#faf8f3] p-1.5">
            <button
              onClick={() => setTab("detail")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3 text-[11px] font-extrabold transition ${tab === "detail" ? "bg-[#fff0f4] text-[#b95770] shadow-sm" : "text-[#a4a098] hover:bg-white/60"}`}
            >
              <Target size={15} /> 지원 상세
            </button>
            <button
              onClick={() => setTab("saved")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3 text-[11px] font-extrabold transition ${tab === "saved" ? "bg-[#ecfaf5] text-[#3b806a] shadow-sm" : "text-[#a4a098] hover:bg-white/60"}`}
            >
              <Bookmark size={15} /> 공고함
            </button>
            <button
              onClick={() => setTab("shell")}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3 text-[11px] font-extrabold transition ${tab === "shell" ? "bg-[#f3efff] text-[#6955a0] shadow-sm" : "text-[#a4a098] hover:bg-white/60"}`}
            >
              <Shell size={15} /> 조개함
            </button>
          </div>
          {tab === "detail" ? (
            <div className="p-5 md:p-6">
              {selected && selectedApplication ? (
                <>
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <span className="mb-3 inline-flex rounded-full bg-[#fff0f3] px-2.5 py-1 text-[11px] font-extrabold text-[#f06d84]">
                        {selected.kind}
                      </span>
                      <h2 className="text-2xl font-extrabold tracking-[-.05em]">
                        {selected.company}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-xs font-bold text-[#696760]">
                        {selectedApplication.title}
                      </p>
                      <p className="mt-1 text-sm text-[#92908a]">
                        2026년 {Number(selected.date.slice(5, 7))}월{" "}
                        {Number(selected.date.slice(-2))}일 · 채용 일정
                      </p>
                    </div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: `${selected.color}35` }}
                    >
                      <BriefcaseBusiness
                        size={22}
                        style={{ color: selected.color }}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#fbfaf7] p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#92908a]">
                      <Clock3 size={15} /> 지원 진행 상태
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS.map((status) => (
                        <button
                          key={status}
                          onClick={() => changeStatus(status)}
                          className={`rounded-xl px-3 py-2 text-[11px] font-extrabold transition ${selectedApplication.status === status ? (status === "불합격" ? "bg-[#e8667d] text-white" : "bg-[#31363f] text-white") : "bg-white text-[#aaa69d] hover:bg-[#fff0f3]"}`}
                        >
                          {selectedApplication.status === status && (
                            <Check size={12} className="mr-1 inline" />
                          )}
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedApplication.status === "불합격" && (
                    <div className="my-5 space-y-3 rounded-2xl bg-[#fff3f5] p-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-extrabold text-[#bc5369]">
                          탈락 사유
                        </label>
                        <textarea
                          value={selectedApplication.rejectionReason}
                          onChange={(event) =>
                            updateApplicationNotes(
                              "rejectionReason",
                              event.target.value,
                            )
                          }
                          placeholder="추정 사유나 받은 피드백을 적어두세요."
                          className="min-h-20 w-full resize-none rounded-xl border border-[#f2ccd4] bg-white p-3 text-xs outline-none focus:border-[#ff85a2]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-extrabold text-[#bc5369]">
                          다음 지원을 위한 회고
                        </label>
                        <textarea
                          value={selectedApplication.retrospective}
                          onChange={(event) =>
                            updateApplicationNotes(
                              "retrospective",
                              event.target.value,
                            )
                          }
                          placeholder="잘한 점과 다음에 바꿀 점을 남겨보세요."
                          className="min-h-24 w-full resize-none rounded-xl border border-[#f2ccd4] bg-white p-3 text-xs outline-none focus:border-[#ff85a2]"
                        />
                      </div>
                      <div className="rounded-xl border border-[#f2ccd4] bg-white p-3">
                        <p className="text-[10px] font-bold text-[#a77d87]">
                          저장될 회고록
                        </p>
                        <p className="mt-1 text-xs font-extrabold text-[#6f4f57]">
                          {selectedApplication.deadline.slice(0, 4)}{" "}
                          {Number(selectedApplication.deadline.slice(5, 7)) <= 6
                            ? "상반기"
                            : "하반기"}{" "}
                          {selectedApplication.company} 회고록
                        </p>
                      </div>
                      <button
                        onClick={saveRetrospective}
                        disabled={
                          !selectedApplication.rejectionReason.trim() &&
                          !selectedApplication.retrospective.trim()
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8667d] py-3 text-xs font-extrabold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <BookOpenText size={15} />
                        {retrospectives.some(
                          (record) =>
                            record.applicationId === selectedApplication.id,
                        )
                          ? "회고록 업데이트"
                          : "조개함에 회고록 저장"}
                      </button>
                    </div>
                  )}
                  <div className="my-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-extrabold">
                        <Newspaper size={16} className="text-[#ff85a2]" />{" "}
                        {selected.company} 소식
                      </h3>
                      <span className="rounded-full bg-[#eaf8f3] px-2 py-1 text-[10px] font-bold text-[#4f9b80]">
                        무료 뉴스 링크
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedNews.map((news) => (
                        <a
                          key={news.url}
                          href={news.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between rounded-2xl border border-[#eeeae2] bg-[#fffdfa] p-3.5 transition hover:border-[#ffb3c4] hover:bg-[#fff7f9]"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="line-clamp-2 text-xs font-extrabold leading-5">
                              {news.title}
                            </p>
                            <p className="mt-1 text-[10px] font-medium text-[#a09c94]">
                              {news.source} · {news.date}
                            </p>
                          </div>
                          <ExternalLink
                            size={15}
                            className="shrink-0 text-[#c6c1b8] group-hover:text-[#ff85a2]"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="my-6 space-y-4">
                    <h3 className="text-sm font-extrabold">공고 메모</h3>
                    <div className="rounded-2xl border border-dashed border-[#e8e1d7] p-4 text-sm leading-6 text-[#92908a]">
                      아직 메모가 없어요.
                      <br />
                      공고를 보며 기억해둘 내용을 적어보세요 🐚
                    </div>
                  </div>
                  <button
                    onClick={requestCoverLetter}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#31363f] py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#404650]"
                  >
                    <Sparkles size={16} className="text-[#ffb2c3]" /> AI 자소서
                    추천받기{" "}
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                      nano
                    </span>
                  </button>
                </>
              ) : (
                <div className="flex min-h-[520px] flex-col items-center justify-center text-center text-[#92908a]">
                  <CalendarDays size={36} className="mb-3 text-[#ff85a2]" />
                  <p className="text-sm font-bold">
                    캘린더에서 일정을 눌러보세요.
                  </p>
                </div>
              )}
            </div>
          ) : tab === "saved" ? (
            <div className="p-5 md:p-6">
              <div className="mb-5">
                <p className="mb-1 text-sm font-bold text-[#72bca2]">
                  지원 전 후보들
                </p>
                <div className="flex items-end justify-between">
                  <h2 className="text-2xl font-extrabold tracking-[-.05em]">
                    스크랩 공고함
                  </h2>
                  <span className="rounded-full bg-[#eaf8f3] px-2.5 py-1 text-[10px] font-extrabold text-[#4f9b80]">
                    {savedJobs.length}개
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#92908a]">
                  관심 공고를 먼저 저장하고, 지원하기로 정했을 때 캘린더를
                  시작해요.
                </p>
              </div>
              <div className="space-y-3">
                {savedJobs.map((job) => {
                  const application = applications.find(
                    (item) => item.jobId === job.id,
                  );
                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-[#eeeae2] bg-[#fffdfa] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-[#ff7394]">
                            {job.company}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-[10px] text-[#aaa69d]">
                            {job.source}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteSavedJob(job.id)}
                          aria-label={`${job.title} 공고 삭제`}
                          className="rounded-lg p-1.5 text-[#c3beb5] transition hover:bg-[#fff0f3] hover:text-[#e05f7a]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <label className="mt-3 block text-[10px] font-extrabold text-[#827f78]">
                        서류 마감일
                      </label>
                      <input
                        type="date"
                        value={job.deadline ?? ""}
                        onChange={(event) =>
                          updateSavedJobDeadline(job.id, event.target.value)
                        }
                        disabled={Boolean(application)}
                        className="mt-1 w-full rounded-xl border border-[#e7e2d9] bg-white px-3 py-2 text-xs outline-none focus:border-[#a8e6cf] disabled:bg-[#f4f1eb]"
                      />
                      <div className="mt-3 flex gap-2">
                        {job.link && (
                          <a
                            href={job.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#e7e2d9] bg-white py-2.5 text-[11px] font-extrabold text-[#77736b]"
                          >
                            원문 <ExternalLink size={12} />
                          </a>
                        )}
                        {application ? (
                          <button
                            onClick={() => {
                              const event = events.find(
                                (item) => item.applicationId === application.id,
                              );
                              if (event) {
                                setSelected(event);
                                setTab("detail");
                              }
                            }}
                            className="flex-1 rounded-xl bg-[#31363f] py-2.5 text-[11px] font-extrabold text-white"
                          >
                            {application.status} · 열기
                          </button>
                        ) : (
                          <button
                            onClick={() => startApplication(job)}
                            disabled={!job.deadline}
                            className="flex-1 rounded-xl bg-[#ff85a2] py-2.5 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            지원 시작
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {savedJobs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#ded8cf] py-14 text-center text-sm font-bold text-[#aaa69d]">
                    아직 스크랩한 공고가 없어요 🐚
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 md:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-bold text-[#ff85a2]">
                    나의 보물들
                  </p>
                  <h2 className="text-2xl font-extrabold tracking-[-.05em]">
                    소중한 조개함
                  </h2>
                  <p className="mt-1 text-xs text-[#92908a]">
                    경험과 배움을 다음 지원을 위해 모아두는 곳
                  </p>
                </div>
                {vaultTab === "experiences" && (
                  <button
                    onClick={openExperienceCreate}
                    className="flex items-center gap-1 rounded-xl bg-[#a8e6cf] px-3 py-2 text-xs font-extrabold text-[#367b63]"
                  >
                    <CirclePlus size={15} /> 경험 추가
                  </button>
                )}
              </div>
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-[#f6f3ed] p-1">
                <button
                  onClick={() => setVaultTab("experiences")}
                  className={`rounded-lg py-2 text-[11px] font-extrabold transition ${vaultTab === "experiences" ? "bg-white text-[#31363f] shadow-sm" : "text-[#9d9991]"}`}
                >
                  경험 {experiences.length}
                </button>
                <button
                  onClick={() => setVaultTab("retrospectives")}
                  className={`rounded-lg py-2 text-[11px] font-extrabold transition ${vaultTab === "retrospectives" ? "bg-white text-[#c25870] shadow-sm" : "text-[#9d9991]"}`}
                >
                  회고록 {retrospectives.length}
                </button>
              </div>
              {vaultTab === "experiences" ? (
                <div className="space-y-3">
                  {experiences.map(([tag, title, desc, bg], index) => (
                    <div
                      key={`${title}-${index}`}
                      className="group rounded-2xl border border-[#f1eee7] bg-[#fffdfa] p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className="rounded-lg px-2 py-1 text-[10px] font-extrabold"
                          style={{ background: bg }}
                        >
                          {tag}
                        </span>
                        <div className="flex items-center gap-1">
                          <Shell
                            size={15}
                            className="text-[#d6d1c8] transition group-hover:text-[#ff85a2]"
                          />
                          <button
                            onClick={() => openExperienceEdit(index)}
                            aria-label={`${title} 경험 수정`}
                            title="경험 수정"
                            className="rounded-lg p-1.5 text-[#c3beb5] transition hover:bg-[#eaf8f3] hover:text-[#4f9b80]"
                          >
                            <PencilLine size={15} />
                          </button>
                          <button
                            onClick={() =>
                              setExperienceDeleteTarget({ index, title })
                            }
                            aria-label={`${title} 경험 삭제`}
                            title="경험 삭제"
                            className="rounded-lg p-1.5 text-[#c3beb5] transition hover:bg-[#fff0f3] hover:text-[#e05f7a]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-sm font-extrabold leading-5">
                        {title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[#92908a]">
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {retrospectives.map((record) => {
                    const application = applications.find(
                      (item) => item.id === record.applicationId,
                    );
                    return (
                      <article
                        key={record.id}
                        className="rounded-2xl border border-[#f0d9df] bg-[#fff8fa] p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="rounded-lg bg-[#ffe5eb] px-2 py-1 text-[10px] font-extrabold text-[#c25870]">
                            회고록
                          </span>
                          <span className="text-[10px] text-[#aaa69d]">
                            {new Date(record.createdAt).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold leading-5">
                          {record.title}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-[10px] font-bold text-[#9a7f86]">
                          {record.jobTitle}
                        </p>
                        {record.rejectionReason && (
                          <div className="mt-3 rounded-xl bg-white p-3">
                            <p className="text-[10px] font-extrabold text-[#c25870]">
                              탈락 사유
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#77736c]">
                              {record.rejectionReason}
                            </p>
                          </div>
                        )}
                        {record.reflection && (
                          <div className="mt-2 rounded-xl bg-white p-3">
                            <p className="text-[10px] font-extrabold text-[#579c84]">
                              다음 지원을 위한 회고
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#77736c]">
                              {record.reflection}
                            </p>
                          </div>
                        )}
                        {application && (
                          <button
                            onClick={() => {
                              const event = events.find(
                                (item) => item.applicationId === application.id,
                              );
                              if (event) {
                                setSelected(event);
                                setTab("detail");
                              }
                            }}
                            className="mt-3 w-full rounded-xl border border-[#eed6dc] bg-white py-2 text-[11px] font-extrabold text-[#a85b6c]"
                          >
                            지원 상세 다시 보기
                          </button>
                        )}
                      </article>
                    );
                  })}
                  {retrospectives.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#e6cfd5] bg-[#fffafb] py-14 text-center">
                      <BookOpenText
                        size={28}
                        className="mx-auto mb-3 text-[#e5a8b5]"
                      />
                      <p className="text-sm font-extrabold text-[#9a7f86]">
                        아직 보관한 회고록이 없어요.
                      </p>
                      <p className="mt-1 text-[11px] text-[#aaa69d]">
                        불합격 상태에서 회고를 작성해 저장해 보세요.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
        {selected && selectedApplication && tab === "detail" && (
          <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2 md:bottom-7 md:right-8">
            <button
              onClick={() => setStageEditor(true)}
              className="flex items-center gap-2 rounded-2xl bg-[#31363f] px-4 py-3 text-xs font-extrabold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              <PencilLine size={16} /> 인적성·면접 직접 추가
            </button>
            <button
              onClick={() => setDeleteTarget(selected.company)}
              className="flex items-center gap-2 rounded-2xl border border-[#ffd3dc] bg-white px-4 py-3 text-xs font-extrabold text-[#df6680] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#fff4f6]"
            >
              <Trash2 size={16} /> {selected.company} 지원 기록 삭제
            </button>
          </div>
        )}
      </section>
      {showExperienceModal && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#31363f]/45 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-[30px] bg-white p-6 paper-shadow md:p-7">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#ff7597]">
                  {experienceEditIndex === null ? "나만의 기록" : "경험 다듬기"}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {experienceEditIndex === null
                    ? "새 경험 담기 🐚"
                    : "경험 수정하기 ✏️"}
                </h2>
                <p className="mt-1 text-xs text-[#918d85]">
                  {experienceEditIndex === null
                    ? "자소서에 활용할 경험을 짧게 기록해 두세요."
                    : "유형, 제목, 설명을 원하는 내용으로 고쳐보세요."}
                </p>
              </div>
              <button
                onClick={closeExperienceModal}
                aria-label="경험 입력 닫기"
                className="rounded-full bg-[#f4f1eb] p-2"
              >
                <X size={17} />
              </button>
            </div>
            <label className="block text-xs font-extrabold text-[#716d66]">
              경험 유형
              <select
                value={experienceForm.tag}
                onChange={(event) =>
                  setExperienceForm((prev) => ({
                    ...prev,
                    tag: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-[#e8e3da] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#a8e6cf]"
              >
                {Object.keys(experienceColors).map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-xs font-extrabold text-[#716d66]">
              경험 제목
              <input
                value={experienceForm.title}
                onChange={(event) =>
                  setExperienceForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                onKeyDown={(event) => event.key === "Enter" && saveExperience()}
                placeholder="예: 반도체 소자 연구 프로젝트"
                className="mt-2 w-full rounded-2xl border border-[#e8e3da] bg-[#fffdfa] px-4 py-3 text-sm outline-none placeholder:text-[#bbb6ad] focus:border-[#ffadc0]"
              />
            </label>
            <label className="mt-4 block text-xs font-extrabold text-[#716d66]">
              한 줄 설명
              <textarea
                value={experienceForm.description}
                onChange={(event) =>
                  setExperienceForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="담당 역할, 사용 기술, 성과를 간단히 적어보세요."
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-[#e8e3da] bg-[#fffdfa] px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#bbb6ad] focus:border-[#ffadc0]"
              />
            </label>
            <button
              onClick={saveExperience}
              disabled={!experienceForm.title.trim()}
              className="mt-5 w-full rounded-2xl bg-[#ff85a2] py-3.5 text-sm font-extrabold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {experienceEditIndex === null
                ? "소중한 조개함에 저장"
                : "수정 내용 저장"}
            </button>
            <p className="mt-3 text-center text-[10px] font-medium text-[#aaa59c]">
              이 브라우저에 자동 저장되어 새로고침 후에도 유지됩니다.
            </p>
          </div>
        </div>
      )}
      {experienceDeleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#31363f]/45 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center paper-shadow">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f3] text-[#e05f7a]">
              <Trash2 size={22} />
            </div>
            <h2 className="text-xl font-extrabold">이 경험을 삭제할까요?</h2>
            <p className="mt-2 break-keep text-sm leading-6 text-[#918d85]">
              ‘{experienceDeleteTarget.title}’ 기록이 소중한 조개함에서
              삭제됩니다.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                onClick={() => setExperienceDeleteTarget(null)}
                className="rounded-2xl bg-[#f4f1eb] py-3 text-sm font-extrabold text-[#716d66]"
              >
                취소
              </button>
              <button
                onClick={deleteExperience}
                className="rounded-2xl bg-[#ff85a2] py-3 text-sm font-extrabold text-white transition hover:brightness-95"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
      {stageEditor && selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#31363f]/45 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 paper-shadow">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#6eb596]">
                  수동 일정 추가
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {selected.company} 다음 전형
                </h2>
              </div>
              <button
                onClick={() => setStageEditor(false)}
                aria-label="전형 추가 닫기"
                className="rounded-full bg-[#f4f1eb] p-2"
              >
                <X size={17} />
              </button>
            </div>
            <label className="mb-4 block text-xs font-extrabold text-[#767169]">
              전형 종류
              <select
                value={manualStageKind}
                onChange={(event) =>
                  setManualStageKind(
                    event.target.value as "인적성" | "1차 면접",
                  )
                }
                className="mt-2 w-full rounded-2xl border border-[#e8e3da] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#a8e6cf]"
              >
                <option value="인적성">인적성</option>
                <option value="1차 면접">면접</option>
              </select>
            </label>
            <label className="block text-xs font-extrabold text-[#767169]">
              일정 날짜
              <input
                type="date"
                value={manualStageDate}
                onChange={(event) => setManualStageDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#e8e3da] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#a8e6cf]"
              />
            </label>
            <button
              onClick={addManualStage}
              disabled={!manualStageDate}
              className="mt-5 w-full rounded-2xl bg-[#a8e6cf] py-3.5 text-sm font-extrabold text-[#367b63] disabled:cursor-not-allowed disabled:opacity-40"
            >
              캘린더에 일정 추가
            </button>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#31363f]/45 p-4 backdrop-blur-[3px]">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center paper-shadow">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f3] text-[#e1647d]">
              <Trash2 size={25} />
            </div>
            <h2 className="text-xl font-extrabold">
              {deleteTarget} 지원 기록을 지울까요?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#918d85]">
              현재 지원 상태와 서류 시작, 마감, 면접 등<br />
              <b>이 기업의 지원 기록</b>이 삭제됩니다. 스크랩한 공고는 남아요.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl bg-[#f3f1ec] py-3 text-sm font-extrabold text-[#77736c]"
              >
                아니요
              </button>
              <button
                onClick={deleteCompany}
                className="rounded-2xl bg-[#e66e86] py-3 text-sm font-extrabold text-white"
              >
                전체 삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {showWelcome && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#31363f]/35 p-4 backdrop-blur-[3px]">
          <div className="relative w-full max-w-md overflow-hidden rounded-[30px] bg-[#fffaf0] p-6 paper-shadow md:p-7">
            <div className="absolute -right-5 -top-8 text-8xl opacity-10">
              ⭐
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              aria-label="공지 닫기"
              className="absolute right-4 top-4 rounded-full bg-white p-2 text-[#8e8a82]"
            >
              <X size={17} />
            </button>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffedf2] text-2xl">
                🐚
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#ff7597]">
                  처음 오셨다면 이렇게 시작해요
                </p>
                <h2 className="text-xl font-extrabold">내 취뽀 바다 사용법</h2>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-3 rounded-2xl bg-white p-3">
                <span className="text-lg">🔎</span>
                <div>
                  <p className="text-xs font-extrabold">공고를 찾아 기록해요</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#8f8b83]">
                    위 검색창에 기업명을 입력하면 채용 공고를 찾고, 스크랩하거나
                    지원 일정으로 등록할 수 있어요.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl bg-white p-3">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-xs font-extrabold">
                    일정을 한눈에 관리해요
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#8f8b83]">
                    서류 마감, 인적성, 면접 일정을 캘린더에서 확인하고 지원
                    상태도 단계별로 바꿔 보세요.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl bg-white p-3">
                <span className="text-lg">🫧</span>
                <div>
                  <p className="text-xs font-extrabold">
                    경험과 자격증을 모아둬요
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#8f8b83]">
                    조개함에 경험을 저장하면 자소서 소재로 활용할 수 있고,
                    자격증 레이더에서 시험 일정도 관리할 수 있어요.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-5 mb-2 text-xs font-extrabold text-[#ff7597]">
              오늘의 일정 브리핑
            </p>
            {urgentDeadlines.length > 0 ? (
              <div className="space-y-2">
                {urgentDeadlines.map((event) => {
                  const dDay = Math.ceil(
                    (new Date(`${event.date}T00:00:00`).getTime() -
                      new Date(`${todayKey}T00:00:00`).getTime()) /
                      86400000,
                  );
                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelected(event);
                        setTab("detail");
                        setShowWelcome(false);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#ffd3dd] bg-white p-4 text-left"
                    >
                      <div>
                        <p className="text-sm font-extrabold">
                          {event.company} 서류 마감
                        </p>
                        <p className="mt-1 text-xs text-[#959087]">
                          {event.date.replaceAll("-", ".")} · 눌러서 확인
                        </p>
                      </div>
                      <span className="rounded-full bg-[#ff85a2] px-3 py-1.5 text-xs font-extrabold text-white">
                        D-{dDay}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-extrabold">
                  {upcomingDeadlines.length > 0
                    ? "3일 이내 마감은 없어요 🌿"
                    : "아직 등록된 일정이 없어요 🌿"}
                </p>
                {upcomingDeadlines[0] && (
                  <p className="mt-2 text-xs leading-5 text-[#8f8b83]">
                    다음 일정은 <b>{upcomingDeadlines[0].company}</b> 서류
                    마감으로, {upcomingDeadlines[0].date.replaceAll("-", ".")}
                    까지예요.
                  </p>
                )}
                {upcomingDeadlines.length === 0 && (
                  <p className="mt-2 text-xs leading-5 text-[#8f8b83]">
                    검색창에서 관심 기업을 찾아 첫 공고를 등록해 보세요.
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[#ffedf2] p-3 text-center">
                <p className="text-2xl font-extrabold text-[#ee6f8c]">
                  {urgentDeadlines.length}
                </p>
                <p className="text-[10px] font-bold text-[#a77d87]">
                  마감 임박
                </p>
              </div>
              <div className="rounded-2xl bg-[#eaf8f3] p-3 text-center">
                <p className="text-2xl font-extrabold text-[#579c84]">
                  {
                    applications.filter(
                      (application) => application.status === "준비 중",
                    ).length
                  }
                </p>
                <p className="text-[10px] font-bold text-[#78968b]">준비 중</p>
              </div>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="mt-5 w-full rounded-2xl bg-[#31363f] py-3.5 text-sm font-extrabold text-white"
            >
              좋아, 오늘도 하나씩!
            </button>
          </div>
        </div>
      )}
      {tarot.open && (
        <div className="tarot-backdrop fixed inset-0 z-[105] flex items-center justify-center bg-[#21192f]/65 p-4 backdrop-blur-[7px]">
          <div className="tarot-modal flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-[#fffdfa]">
            <div className="tarot-header relative overflow-hidden border-b border-[#e8e0f6] bg-gradient-to-br from-[#2d2448] via-[#57427f] to-[#9572ad] p-6 text-white md:p-7">
              <div className="absolute -right-4 -top-8 text-9xl opacity-10">
                🔮
              </div>
              <button
                onClick={closeTarotRoom}
                aria-label="취업 타로 닫기"
                className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
              >
                <X size={18} />
              </button>
              <p className="text-xs font-extrabold text-[#e5d7ff]">
                뚱이 옆 비밀 코너 · 잠깐 쉬어가요
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-.04em]">
                30년 타로 선생님의 취업 타로 🔮
              </h2>
              <p className="mt-2 max-w-lg text-xs leading-6 text-white/70">
                답답한 취업 고민을 세 장의 카드로 가볍게 풀어드려요. 결과는
                예언보다 마음을 정리하는 힌트에 가까워요.
              </p>
            </div>
            <div className="overflow-y-auto p-5 md:p-7">
              <div className="rounded-2xl border border-[#ded5eb] bg-white p-4">
                <p className="text-xs font-extrabold text-[#625272]">
                  누구의 흐름을 볼까요?
                </p>
                <div className="mt-3 grid grid-cols-2 rounded-xl bg-[#f3eef8] p-1">
                  {(["self", "other"] as const).map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => changeTarotTarget(target)}
                      className={`rounded-lg py-2.5 text-xs font-extrabold transition ${
                        tarotTarget === target
                          ? "bg-white text-[#594274] shadow-sm"
                          : "text-[#998ba6]"
                      }`}
                    >
                      {target === "self" ? "🙋 내 타로" : "👥 다른 사람 타로"}
                    </button>
                  ))}
                </div>
                {tarotTarget === "self" ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#f8f5fb] px-3 py-2.5 text-[10px] text-[#776b81]">
                    <span>
                      {birthday
                        ? `계정 생일 ${birthday.replaceAll("-", ".")}을 참고해요.`
                        : "계정에 등록된 생일이 없어요."}
                    </span>
                    {!birthday && (
                      <button
                        type="button"
                        onClick={() => {
                          closeTarotRoom();
                          setBirthdayDraft("");
                          setBirthdayModalOpen(true);
                        }}
                        className="shrink-0 font-extrabold text-[#72549a] underline"
                      >
                        생일 등록하기
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-[10px] font-extrabold text-[#776b81]">
                      상대방 이름 또는 별명
                      <input
                        value={otherTarotPerson.name}
                        onChange={(event) =>
                          setOtherTarotPerson((previous) => ({
                            ...previous,
                            name: event.target.value.slice(0, 30),
                          }))
                        }
                        placeholder="예: 취준 메이트"
                        className="mt-1.5 w-full rounded-xl border border-[#ded5eb] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none focus:border-[#8d73bd]"
                      />
                    </label>
                    <label className="text-[10px] font-extrabold text-[#776b81]">
                      상대방 생년월일
                      <input
                        type="date"
                        value={otherTarotPerson.birthday}
                        max={todayKey}
                        onChange={(event) =>
                          setOtherTarotPerson((previous) => ({
                            ...previous,
                            birthday: event.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#ded5eb] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none focus:border-[#8d73bd]"
                      />
                    </label>
                    <p className="sm:col-span-2 text-[9px] leading-4 text-[#a07882]">
                      상대방의 동의를 받고 입력해 주세요. 이 정보는 계정에
                      저장하지 않고 이번 리딩과 후속 질문에만 사용해요.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  "이번 지원에서 내가 놓치고 있는 점은?",
                  "요즘 서류가 잘 안 풀리는 이유는?",
                  "면접 전에 무엇을 준비하면 좋을까?",
                ].map((question) => (
                  <button
                    key={question}
                    onClick={() => setTarotQuestion(question)}
                    className="rounded-full bg-[#f1ecfb] px-3 py-2 text-[10px] font-extrabold text-[#6b5798] transition hover:bg-[#e9e0f8]"
                  >
                    {question}
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-xs font-extrabold text-[#625a6b]">
                타로 선생님께 물어볼 취업 고민
                <textarea
                  value={tarotQuestion}
                  onChange={(event) => setTarotQuestion(event.target.value)}
                  placeholder="예: 이번에 지원한 회사와 잘 맞을까요? 지금 보완할 점도 알려주세요."
                  maxLength={500}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-[#ded5eb] bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#b7b0bd] focus:border-[#8d73bd]"
                />
              </label>
              <div className="tarot-deck-stage mt-4 rounded-3xl border border-[#ded5eb] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-[#625272]">
                      {tarotIsShuffling
                        ? "카드에 마음을 담아 섞는 중…"
                        : "마음이 가는 카드 3장을 골라주세요"}
                    </p>
                    <p className="mt-1 text-[10px] text-[#988ca1]">
                      고른 순서대로 현재 · 걸림돌 · 조언 카드가 돼요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reshuffleTarotDeck}
                    disabled={tarot.loading || tarotIsShuffling}
                    className="relative z-10 flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-[10px] font-extrabold text-[#725c96] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eee7f7] disabled:opacity-40"
                  >
                    <span className={tarotIsShuffling ? "animate-spin" : ""}>
                      ↻
                    </span>
                    {tarotIsShuffling ? "섞는 중" : "다시 섞기"}
                  </button>
                </div>
                <div className="relative z-10 mt-5 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5">
                  {tarotDeck.map((card, index) => {
                    const selectedIndex = selectedTarotCardIds.indexOf(card.id);
                    const selected = selectedIndex >= 0;
                    const shuffleDirection = index % 2 === 0 ? 1 : -1;
                    const shuffleX = shuffleDirection * (36 + (index % 3) * 18);
                    const shuffleRotation =
                      shuffleDirection * (8 + (index % 3) * 4);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => toggleTarotCard(card.id)}
                        disabled={tarot.loading || tarotIsShuffling}
                        style={
                          {
                            "--card-index": index,
                            "--deal-x": `${(4 - index) * -26}px`,
                            "--deal-r": `${(index - 4) * -4}deg`,
                            "--shuffle-x": `${shuffleX}px`,
                            "--shuffle-r": `${shuffleRotation}deg`,
                            "--shuffle-return-x": `${shuffleX * -0.45}px`,
                            "--shuffle-return-r": `${shuffleRotation * -0.65}deg`,
                            "--shuffle-delay": `${(index % 3) * 35}ms`,
                          } as CSSProperties
                        }
                        aria-label={
                          selected
                            ? `${selectedIndex + 1}번째 카드 선택 취소`
                            : "타로 카드 선택"
                        }
                        aria-pressed={selected}
                        className={`tarot-card-back relative mx-auto flex h-24 w-16 items-center justify-center overflow-hidden rounded-xl border-2 shadow-sm transition duration-200 sm:h-28 sm:w-[72px] ${
                          tarotIsShuffling
                            ? "tarot-card-shuffling"
                            : "tarot-card-deal"
                        } ${tarot.loading && selected ? "tarot-reading-pulse" : ""} ${
                          selected
                            ? "-translate-y-2 border-[#f2c86d] bg-[#69518f] shadow-lg shadow-[#8066a8]/25"
                            : "border-[#9d84bd] bg-[#4e3d70] hover:-translate-y-1 hover:border-[#d6b4ef]"
                        } disabled:cursor-not-allowed`}
                      >
                        <span className="absolute inset-1.5 rounded-lg border border-white/25" />
                        <span className="text-2xl text-[#f0d8ff]">✦</span>
                        <span className="absolute bottom-2 text-[8px] font-bold tracking-[.18em] text-white/50">
                          TAROT
                        </span>
                        {selected && (
                          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#f8f5fb] bg-[#f2c86d] text-[10px] font-black text-[#49385f]">
                            {selectedIndex + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-[10px] font-bold text-[#806f91]">
                  {tarotIsShuffling
                    ? "쉿, 카드가 자리를 바꾸고 있어요 ✨"
                    : selectedTarotCardIds.length < 3
                      ? `${selectedTarotCardIds.length}/3 선택 · ${3 - selectedTarotCardIds.length}장 더 골라주세요`
                      : "선택 완료! 이제 카드를 펼쳐볼게요 ✨"}
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-[#f8f5fb] p-3 text-[10px] leading-5 text-[#877d8e] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {tarotTarget === "other"
                    ? `${otherTarotPerson.name.trim() || "상대방"}의 흐름으로 카드를 읽어요.`
                    : selectedApplication
                      ? `현재 선택: ${selectedApplication.company} · ${selectedApplication.status}`
                      : "지원 상세를 선택하면 현재 회사와 진행 상태도 참고해요."}
                </span>
                <span className="shrink-0 font-bold">
                  질문·생일{tarotTarget === "self" ? "·지원 상태" : ""}와 선택한
                  카드가 AI에 전달돼요.
                </span>
              </div>
              <button
                onClick={() => void requestTarotReading()}
                disabled={
                  tarot.loading ||
                  tarotIsShuffling ||
                  !tarotQuestion.trim() ||
                  selectedTarotCardIds.length !== 3 ||
                  (tarotTarget === "self"
                    ? !birthday
                    : !otherTarotPerson.name.trim() ||
                      !otherTarotPerson.birthday)
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4e3d70] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#5d4985] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tarot.loading ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Sparkles size={17} className="text-[#e5c8ff]" />
                )}
                {tarot.loading
                  ? "30년 내공으로 카드를 읽는 중…"
                  : !birthday && tarotTarget === "self"
                    ? "계정 생일을 먼저 등록해 주세요"
                    : tarotTarget === "other" &&
                        (!otherTarotPerson.name.trim() ||
                          !otherTarotPerson.birthday)
                      ? "상대방 이름과 생일을 입력해 주세요"
                      : selectedTarotCardIds.length === 3
                        ? "내가 고른 세 장 펼치기"
                        : "카드 3장을 먼저 골라주세요"}
              </button>
              <details className="mt-3 rounded-xl border border-dashed border-[#d9d0e5] bg-[#fbf9fd] px-3 py-2.5 text-[10px] leading-5 text-[#817888]">
                <summary className="cursor-pointer font-extrabold text-[#6b5a7c]">
                  관리자용 · OpenAI API 키는 어디에 넣나요?
                </summary>
                <div className="mt-2 space-y-1">
                  <p>
                    로컬: 프로젝트 최상위의 <b>.env.local</b> 파일에
                    <code className="ml-1 rounded bg-white px-1.5 py-0.5">
                      OPENAI_API_KEY=발급받은_키
                    </code>
                  </p>
                  <p>
                    Vercel: <b>Project → Settings → Environment Variables</b>에
                    이름을 <b>OPENAI_API_KEY</b>로 등록한 뒤 재배포하세요.
                  </p>
                  <p className="font-bold text-[#b06575]">
                    키를 NEXT_PUBLIC_ 변수나 GitHub 코드에 넣으면 안 됩니다.
                  </p>
                </div>
              </details>
              {tarot.error && (
                <div className="mt-4 rounded-2xl bg-[#fff0f3] p-4 text-center text-xs font-bold leading-5 text-[#bd5d70]">
                  {tarot.error}
                </div>
              )}
              {tarot.data && !tarot.loading && (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-[#f5f0fb] p-4 text-sm font-extrabold leading-6 text-[#58476f]">
                    {tarot.data.opening}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {tarot.data.cards.map((card, index) => (
                      <article
                        key={`${card.name}-${index}`}
                        style={{ "--card-index": index } as CSSProperties}
                        className="tarot-result-card relative overflow-hidden rounded-2xl border border-[#dfd4ee] bg-gradient-to-b from-white to-[#faf7fd] p-4 text-center shadow-sm"
                      >
                        <div className="mx-auto flex h-12 w-10 items-center justify-center rounded-lg border border-[#d8c8ec] bg-[#5b477e] text-xl text-white shadow-sm">
                          {["✦", "☾", "✧"][index]}
                        </div>
                        <p className="mt-3 text-[10px] font-extrabold text-[#9279b7]">
                          {card.position}
                        </p>
                        <h3 className="mt-1 text-sm font-extrabold">
                          {card.name}
                        </h3>
                        <span className="mt-1 inline-block rounded-full bg-[#eee7f7] px-2 py-1 text-[9px] font-bold text-[#725c96]">
                          {card.orientation}
                        </span>
                        <p className="mt-3 text-left text-[11px] leading-5 text-[#777079]">
                          {card.message}
                        </p>
                      </article>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-[#e7deef] bg-white p-5">
                    <p className="text-xs font-extrabold text-[#745a9c]">
                      30년 내공의 한마디
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#5f5962]">
                      {tarot.data.reading}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#edf8f4] p-5">
                    <p className="text-xs font-extrabold text-[#4d9178]">
                      카드가 권하는 현실 행동 3가지
                    </p>
                    <ol className="mt-3 space-y-2">
                      {tarot.data.actionSteps.map((step, index) => (
                        <li
                          key={`${step}-${index}`}
                          className="flex gap-2 text-xs leading-5 text-[#587269]"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#67aa92] text-[9px] font-extrabold text-white">
                            {index + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl bg-[#fff5dd] p-4 text-xs leading-5 text-[#876b35] sm:flex-row sm:items-center sm:justify-between">
                    <span>🍀 {tarot.data.luckyHint}</span>
                    <span className="font-extrabold">{tarot.data.closing}</span>
                  </div>
                  <div className="rounded-2xl border border-[#dfd4ee] bg-[#faf7fd] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-[#674e87]">
                          카드에 더 물어보기
                        </p>
                        <p className="mt-1 text-[10px] text-[#95889f]">
                          같은 세 장의 카드와 첫 해석을 이어서 답해요.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#eee7f7] px-2 py-1 text-[9px] font-bold text-[#725c96]">
                        후속 질문
                      </span>
                    </div>
                    {tarotFollowUps.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {tarotFollowUps.map((message, index) => (
                          <div
                            key={`${message.role}-${index}`}
                            className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-xs leading-5 ${
                              message.role === "user"
                                ? "ml-auto bg-[#5b477e] text-white"
                                : "bg-white text-[#625a68] shadow-sm"
                            }`}
                          >
                            {message.text}
                          </div>
                        ))}
                        {tarotFollowUpLoading && (
                          <div className="flex w-fit items-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-[10px] font-bold text-[#806d92] shadow-sm">
                            <LoaderCircle size={13} className="animate-spin" />
                            선생님이 같은 카드를 다시 살펴보는 중…
                          </div>
                        )}
                      </div>
                    )}
                    {tarotFollowUpError && (
                      <p className="mt-3 rounded-xl bg-[#fff0f3] px-3 py-2 text-[10px] font-bold text-[#bd5d70]">
                        {tarotFollowUpError}
                      </p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <input
                        value={tarotFollowUpQuestion}
                        onChange={(event) =>
                          setTarotFollowUpQuestion(
                            event.target.value.slice(0, 300),
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            void requestTarotFollowUp();
                        }}
                        placeholder="예: 그러면 이번 주에 가장 먼저 할 일은?"
                        disabled={tarotFollowUpLoading}
                        className="min-w-0 flex-1 rounded-xl border border-[#ded5eb] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#8d73bd] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => void requestTarotFollowUp()}
                        disabled={
                          tarotFollowUpLoading || !tarotFollowUpQuestion.trim()
                        }
                        className="shrink-0 rounded-xl bg-[#5b477e] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        질문
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-[10px] leading-5 text-[#aaa2ad]">
                    타로는 재미와 자기정리를 위한 콘텐츠이며 실제 채용 결과를
                    예측하지 않습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {birthdayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#31363f]/45 p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 paper-shadow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-[#ef6d86]">
                  🎂 나만의 응원 배너
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  생일을 알려주세요
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-[#918c84]">
                  생일과 오늘 날짜로 매일 다른 가벼운 취업 운세를 보여드려요.
                </p>
              </div>
              <button
                onClick={() => setBirthdayModalOpen(false)}
                aria-label="생일 등록 닫기"
                className="rounded-full bg-[#f4f1eb] p-2"
              >
                <X size={17} />
              </button>
            </div>
            <label className="mt-5 block text-xs font-extrabold text-[#716d66]">
              생년월일
              <input
                type="date"
                value={birthdayDraft}
                max={todayKey}
                onChange={(event) => setBirthdayDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveBirthday();
                }}
                className="mt-2 w-full rounded-2xl border border-[#e5dfd6] bg-[#fffdfa] px-4 py-3 text-sm outline-none focus:border-[#ff85a2]"
              />
            </label>
            <div className="mt-3 rounded-xl bg-[#f7f3ff] px-3 py-2.5 text-[10px] font-bold leading-5 text-[#77709b]">
              입력한 생일은 내 계정의 개인 작업공간에 저장되며 다른 사용자는 볼
              수 없어요. 운세는 재미와 동기부여를 위한 콘텐츠예요.
            </div>
            <button
              onClick={() => void saveBirthday()}
              disabled={!birthdayDraft}
              className="mt-5 w-full rounded-2xl bg-[#ff85a2] py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              저장하고 오늘의 운세 보기
            </button>
          </div>
        </div>
      )}
      {certificationPlannerOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#31363f]/45 p-4 backdrop-blur-[3px]">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] bg-white paper-shadow">
            <div className="flex items-start justify-between border-b border-[#eeeae2] bg-[#f7f3ff] p-5 md:p-6">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#7669c8]">
                  <Award size={15} /> 놓치지 않는 시험 일정
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-[-.04em]">
                  자격증 레이더
                </h2>
                <p className="mt-1 text-xs text-[#858078]">
                  이름만 검색하면 해당 시험 회차를 바로 이어서 보여드려요.
                </p>
              </div>
              <button
                onClick={() => setCertificationPlannerOpen(false)}
                aria-label="자격증 레이더 닫기"
                className="rounded-full bg-white p-2 text-[#817c74] shadow-sm"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid min-h-0 flex-1 md:grid-cols-[230px_minmax(0,1fr)]">
              <div className="border-b border-[#eeeae2] bg-[#fcfbf8] p-4 md:overflow-y-auto md:border-b-0 md:border-r">
                <p className="mb-2 text-[10px] font-extrabold text-[#98938b]">
                  자격증 이름으로 찾기
                </p>
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#e4ded5] bg-white p-1.5 pl-3 shadow-sm focus-within:border-[#a79bea]">
                  <Search size={14} className="shrink-0 text-[#99948c]" />
                  <input
                    value={certificationSearch}
                    onChange={(event) => {
                      setCertificationSearch(event.target.value);
                      setCertificationHasSearched(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void searchCertification();
                    }}
                    placeholder="예: 빅데이터분석기사"
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#b8b3aa]"
                  />
                  {certificationSearch && (
                    <button
                      onClick={() => {
                        setCertificationSearch("");
                        setCertificationHasSearched(false);
                      }}
                      aria-label="자격증 검색어 지우기"
                      className="text-[#aaa59c]"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => void searchCertification()}
                    disabled={
                      certificationLoading || !certificationSearch.trim()
                    }
                    className="shrink-0 rounded-lg bg-[#7669c8] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-40"
                  >
                    {certificationLoading ? "조회 중" : "검색"}
                  </button>
                </div>
                {certificationError && (
                  <p className="mb-3 rounded-xl bg-[#fff3e1] px-3 py-2.5 text-[10px] font-bold leading-5 text-[#9a7537]">
                    {certificationError}
                  </p>
                )}
                {!certificationHasSearched && (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-bold text-[#aaa49a]">
                      빠른 검색
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "정보처리기사",
                        "ADsP",
                        "SQLD",
                        "빅데이터분석기사",
                        "컴활 1급",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => void searchCertification(suggestion)}
                          className="rounded-full bg-[#eeeafd] px-2.5 py-1.5 text-[10px] font-extrabold text-[#6d61bd]"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl bg-[#f4f1eb] p-4 text-center">
                      <Award className="mx-auto text-[#9d91db]" size={25} />
                      <p className="mt-2 text-xs font-extrabold text-[#66615a]">
                        찾는 시험명을 입력해 주세요
                      </p>
                      <p className="mt-1 text-[10px] leading-5 text-[#99938a]">
                        검색 전에는 긴 목록을 보여주지 않아요.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
                  {filteredCertifications.map((certification) => (
                    <button
                      key={certification.id}
                      onClick={() =>
                        setSelectedCertificationId(certification.id)
                      }
                      className={`min-w-max rounded-xl border px-3 py-3 text-left transition md:min-w-0 ${selectedCertification.id === certification.id ? "border-[#a79bea] bg-white shadow-sm" : "border-transparent bg-[#f4f1eb] hover:bg-white"}`}
                    >
                      <span className="block text-[10px] font-bold text-[#99948c]">
                        {certification.category}
                      </span>
                      <span className="mt-0.5 block text-xs font-extrabold text-[#4f4c47]">
                        {certification.name}
                      </span>
                    </button>
                  ))}
                  {certificationHasSearched &&
                    !certificationLoading &&
                    filteredCertifications.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#ddd7ce] p-3 text-center text-[10px] font-bold leading-5 text-[#9b968d]">
                        ‘{certificationSearch}’의 자동 일정을 찾지 못했어요.
                        <br />
                        직접 일정을 등록할 수 있어요.
                      </div>
                    )}
                </div>
                <button
                  onClick={() =>
                    openCustomCertificationForm(certificationSearch)
                  }
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#bfb5eb] bg-[#f8f6ff] py-2.5 text-[11px] font-extrabold text-[#6d61bd]"
                >
                  <PencilLine size={13} /> 검색되지 않는 시험 직접 등록
                </button>
              </div>
              <div className="overflow-y-auto p-5 md:p-6">
                {certificationLoading ? (
                  <div className="flex min-h-[360px] items-center justify-center">
                    <div className="text-center">
                      <LoaderCircle
                        size={32}
                        className="mx-auto animate-spin text-[#7669c8]"
                      />
                      <h3 className="mt-4 text-sm font-extrabold">
                        공식 시험일정을 찾고 있어요
                      </h3>
                      <p className="mt-2 text-xs text-[#918c84]">
                        시행기관 자료에서 회차와 날짜를 확인하는 중이에요.
                      </p>
                    </div>
                  </div>
                ) : certificationHasSearched &&
                  filteredCertifications.length > 0 ? (
                  <>
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ background: selectedCertification.color }}
                          />
                          <h3 className="text-xl font-extrabold">
                            {selectedCertification.name}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-xs font-bold text-[#6f69a4]">
                          {selectedCertification.recommendation}
                        </p>
                      </div>
                      {selectedCertification.sourceUrl && (
                        <a
                          href={selectedCertification.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex shrink-0 items-center justify-center gap-1 rounded-xl border border-[#dfd9d0] bg-white px-3 py-2 text-[11px] font-extrabold text-[#747069]"
                        >
                          공식 일정 확인 <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="mb-4 rounded-xl bg-[#fff7e7] px-3 py-2.5 text-[10px] font-bold leading-5 text-[#9a7537]">
                      {selectedCertification.scheduleNotice ??
                        (selectedCertification.category === "직접 등록"
                          ? "직접 입력한 일정입니다. 변경 공지가 없는지 시행기관에서 확인해 주세요."
                          : selectedCertification.category.startsWith(
                                "K-DATA",
                              ) ||
                              ["adsp", "sqld"].includes(
                                selectedCertification.id,
                              )
                            ? "2026년 데이터자격시험 연간 일정 기준 · 접수 전 K-DATA 공지를 다시 확인해 주세요."
                            : selectedCertification.id === "korean-history"
                              ? "2026년 한국사능력검정시험 공식 연간 일정 기준입니다."
                              : "2026년 Q-Net 공식 연간 일정 기준 · 종목별 시행 회차와 실제 시험일을 한 번 더 확인해 주세요.")}
                    </div>
                    {selectedCertification.sessions.length === 0 && (
                      <div className="rounded-2xl border border-[#e7e1d8] bg-[#fffdfa] p-5 text-center">
                        <CalendarDays
                          size={28}
                          className="mx-auto text-[#a194df]"
                        />
                        <h4 className="mt-3 text-sm font-extrabold">
                          공식 사이트에서 시험일을 먼저 골라주세요
                        </h4>
                        <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-[#918b82]">
                          기관이 회차별 좌석이나 필기·실기 일정을 따로 운영하는
                          시험이에요. 예약한 날짜만 내 캘린더에 정확히 담을 수
                          있습니다.
                        </p>
                        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                          <a
                            href={selectedCertification.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#31363f] px-4 py-2.5 text-[11px] font-extrabold text-white"
                          >
                            공식 일정·접수 열기 <ExternalLink size={12} />
                          </a>
                          <button
                            onClick={() =>
                              openCustomCertificationForm(
                                selectedCertification.name,
                              )
                            }
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#eeeafd] px-4 py-2.5 text-[11px] font-extrabold text-[#685bbd]"
                          >
                            <CalendarPlus size={13} /> 예약한 날짜 등록
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {selectedCertification.sessions.map((session) => {
                        const plan = certificationPlans.find(
                          (item) =>
                            item.certificationId === selectedCertification.id &&
                            item.sessionId === session.id,
                        );
                        const lastSchedule =
                          session.schedules.at(-1)?.end ??
                          session.schedules.at(-1)?.start ??
                          "";
                        const isPast = lastSchedule < todayKey;
                        return (
                          <div
                            key={session.id}
                            className={`rounded-2xl border p-4 ${plan ? "border-[#afa4ed] bg-[#f8f6ff]" : "border-[#eeeae2] bg-[#fffdfa]"}`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold">
                                  {session.label}
                                </h4>
                                {isPast && (
                                  <span className="rounded-full bg-[#eeeae4] px-2 py-1 text-[9px] font-bold text-[#9a968e]">
                                    지난 회차
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  toggleCertificationPlan(
                                    selectedCertification,
                                    session,
                                  )
                                }
                                className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-extrabold transition ${plan ? "bg-[#e7e2ff] text-[#685bbd]" : "bg-[#31363f] text-white"}`}
                              >
                                {plan ? (
                                  <>
                                    <Check size={13} /> 추가됨 · 빼기
                                  </>
                                ) : (
                                  <>
                                    <CalendarPlus size={13} /> 캘린더에 추가
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {session.schedules.map((schedule) => (
                                <div
                                  key={`${session.id}-${schedule.label}`}
                                  className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-[10px]"
                                >
                                  <span className="font-extrabold text-[#66625c]">
                                    {schedule.label}
                                  </span>
                                  <span className="shrink-0 font-bold text-[#928d84]">
                                    {schedule.start.replaceAll("-", ".")}
                                    {schedule.end &&
                                      ` ~ ${schedule.end.replaceAll("-", ".")}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[360px] items-center justify-center">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1edff] text-[#7669c8]">
                        <Search size={28} />
                      </div>
                      <h3 className="mt-4 text-lg font-extrabold">
                        자격증 이름 하나면 충분해요
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-[#918c84]">
                        왼쪽 검색창에 시험명을 입력하면 접수·시험·발표 일정을
                        회차별로 연결해 드려요.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showCustomCertificationForm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#31363f]/55 p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 paper-shadow">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#7669c8]">
                  목록에 없는 시험
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  자격증 일정 직접 등록
                </h2>
                <p className="mt-1 text-xs text-[#918d85]">
                  시험명과 시험일만 있으면 등록할 수 있어요.
                </p>
              </div>
              <button
                onClick={() => setShowCustomCertificationForm(false)}
                aria-label="직접 등록 닫기"
                className="rounded-full bg-[#f4f1eb] p-2"
              >
                <X size={17} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-extrabold text-[#716d66] sm:col-span-2">
                자격증·시험명
                <input
                  value={customCertificationForm.name}
                  onChange={(event) =>
                    setCustomCertificationForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="예: 컴퓨터활용능력 1급"
                  className="mt-1.5 w-full rounded-xl border border-[#e5dfd6] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none focus:border-[#a79bea]"
                />
              </label>
              <label className="text-xs font-extrabold text-[#716d66] sm:col-span-2">
                회차명
                <input
                  value={customCertificationForm.sessionLabel}
                  onChange={(event) =>
                    setCustomCertificationForm((prev) => ({
                      ...prev,
                      sessionLabel: event.target.value,
                    }))
                  }
                  placeholder="예: 2026년 제3회 또는 상시시험"
                  className="mt-1.5 w-full rounded-xl border border-[#e5dfd6] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none focus:border-[#a79bea]"
                />
              </label>
              <label className="text-xs font-extrabold text-[#716d66]">
                접수 시작
                <input
                  type="date"
                  value={customCertificationForm.registrationStart}
                  onChange={(event) =>
                    setCustomCertificationForm((prev) => ({
                      ...prev,
                      registrationStart: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#e5dfd6] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none"
                />
              </label>
              <label className="text-xs font-extrabold text-[#716d66]">
                접수 마감
                <input
                  type="date"
                  value={customCertificationForm.registrationEnd}
                  onChange={(event) =>
                    setCustomCertificationForm((prev) => ({
                      ...prev,
                      registrationEnd: event.target.value,
                    }))
                  }
                  min={customCertificationForm.registrationStart || undefined}
                  className="mt-1.5 w-full rounded-xl border border-[#e5dfd6] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none"
                />
              </label>
              <label className="text-xs font-extrabold text-[#716d66]">
                시험일 <span className="text-[#e8667d]">*</span>
                <input
                  type="date"
                  value={customCertificationForm.examDate}
                  onChange={(event) =>
                    setCustomCertificationForm((prev) => ({
                      ...prev,
                      examDate: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#e5dfd6] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none focus:border-[#a79bea]"
                />
              </label>
              <label className="text-xs font-extrabold text-[#716d66]">
                합격 발표일
                <input
                  type="date"
                  value={customCertificationForm.resultDate}
                  onChange={(event) =>
                    setCustomCertificationForm((prev) => ({
                      ...prev,
                      resultDate: event.target.value,
                    }))
                  }
                  min={customCertificationForm.examDate || undefined}
                  className="mt-1.5 w-full rounded-xl border border-[#e5dfd6] bg-[#fffdfa] px-3 py-2.5 text-xs outline-none"
                />
              </label>
            </div>
            <button
              onClick={createCustomCertification}
              disabled={
                !customCertificationForm.name.trim() ||
                !customCertificationForm.examDate
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7669c8] py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CalendarPlus size={16} /> 일정 만들고 캘린더에 추가
            </button>
          </div>
        </div>
      )}
      {jobSearch.open && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#31363f]/40 p-4 backdrop-blur-[3px]">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] bg-white paper-shadow">
            <div className="flex items-start justify-between border-b border-[#eeeae2] bg-[#fffaf0] p-5 md:p-6">
              <div>
                <p className="mb-1 text-xs font-extrabold text-[#ff7597]">
                  통합 채용 탐색
                </p>
                <h2 className="text-xl font-extrabold">
                  ‘{jobSearch.company}’ 검색 결과
                </h2>
                <p className="mt-1 text-xs text-[#908c84]">
                  채용 사이트와 공식 채용 페이지 결과를 모아 보여드려요.
                </p>
              </div>
              <button
                onClick={() =>
                  setJobSearch((prev) => ({ ...prev, open: false }))
                }
                aria-label="검색 결과 닫기"
                className="rounded-full bg-white p-2"
              >
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-[#eeeae2] bg-white px-5 py-4 md:px-6">
              <p className="mb-2 text-[10px] font-extrabold text-[#8d8981]">
                다른 채용 사이트에서 찾기
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    label: "자소설닷컴",
                    url: "https://jasoseol.com/recruit",
                  },
                  {
                    label: "사람인",
                    url: `https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(jobSearch.company)}`,
                  },
                  {
                    label: "잡코리아",
                    url: `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(jobSearch.company)}`,
                  },
                  {
                    label: "원티드",
                    url: `https://www.wanted.co.kr/search?query=${encodeURIComponent(jobSearch.company)}&tab=position`,
                  },
                ].map((source) => (
                  <a
                    key={source.label}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded-xl bg-[#f7f5f0] px-2 py-2.5 text-[11px] font-extrabold text-[#69665f] transition hover:bg-[#eaf8f3]"
                  >
                    {source.label} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowManualListing((prev) => !prev);
                  setPickedListing(null);
                  setDeadline("");
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d9d3c9] py-2.5 text-xs font-extrabold text-[#77736c]"
              >
                <PencilLine size={14} /> 찾은 공고 직접 등록
              </button>
              {showManualListing && (
                <div className="mt-3 rounded-2xl bg-[#f8f6f1] p-3">
                  <input
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    placeholder="공고명 (예: 2026 하반기 신입 채용)"
                    className="w-full rounded-xl border border-[#e7e1d8] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#ffb2c3]"
                  />
                  <div className="mt-2 flex gap-2">
                    <input
                      type="date"
                      value={deadline}
                      onChange={(event) => setDeadline(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-[#e7e1d8] bg-white px-3 py-2.5 text-xs outline-none"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={saveCurrentListing}
                      disabled={!manualTitle.trim()}
                      className="rounded-xl border border-[#dcd6cc] bg-white px-3 py-2.5 text-xs font-extrabold text-[#6f6b64] disabled:opacity-40"
                    >
                      공고만 스크랩
                    </button>
                    <button
                      onClick={registerListing}
                      disabled={!manualTitle.trim() || !deadline}
                      className="rounded-xl bg-[#ff85a2] px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
                    >
                      지원 시작
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-y-auto p-5 md:p-6">
              {jobSearch.loading ? (
                <div className="flex min-h-56 flex-col items-center justify-center text-[#8f8b83]">
                  <LoaderCircle
                    size={32}
                    className="mb-3 animate-spin text-[#ff85a2]"
                  />
                  <p className="text-sm font-bold">
                    실제 채용 소식을 찾고 있어요...
                  </p>
                </div>
              ) : (
                <>
                  {jobSearch.error && (
                    <div className="mb-4 flex items-start gap-2 rounded-2xl bg-[#fff3e1] p-3 text-xs font-bold text-[#a47737]">
                      <AlertCircle size={16} className="shrink-0" />{" "}
                      {jobSearch.error}
                    </div>
                  )}
                  {jobSearch.items.length > 0 ? (
                    <div className="space-y-2">
                      {jobSearch.items.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 transition ${pickedListing?.id === item.id ? "border-[#ff85a2] bg-[#fff7f9]" : "border-[#eeeae2] bg-[#fffdfa]"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() => {
                                setPickedListing(item);
                                setDeadline(item.detectedDeadline ?? "");
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="text-sm font-extrabold leading-5">
                                {item.title}
                              </p>
                              <p className="mt-1.5 text-[10px] font-bold text-[#98938b]">
                                {item.source} ·{" "}
                                {item.pubDate
                                  ? new Date(item.pubDate).toLocaleDateString(
                                      "ko-KR",
                                    )
                                  : "날짜 미상"}
                              </p>
                              {item.detectedDeadline && (
                                <span className="mt-2 inline-block rounded-full bg-[#ffedf2] px-2 py-1 text-[10px] font-extrabold text-[#ed6f8b]">
                                  마감 {item.detectedDeadline}
                                </span>
                              )}
                              {item.description && (
                                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#77736c]">
                                  {item.description}
                                </p>
                              )}
                            </button>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="공고 원문 열기"
                              className="rounded-xl bg-white p-2 text-[#aaa59c] shadow-sm hover:text-[#ff85a2]"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#ddd7cd] p-6 text-center">
                      <p className="text-sm font-extrabold">
                        바로 표시할 검색 결과가 없어요.
                      </p>
                      <p className="mt-2 text-xs text-[#918d85]">
                        아래 채용 사이트에서 기업명을 바로 검색해 보세요.
                      </p>
                    </div>
                  )}
                  {(jobSearch.fallbackUrl || jobSearch.items.length > 0) && (
                    <a
                      href={
                        jobSearch.fallbackUrl ||
                        `https://www.google.com/search?q=${encodeURIComponent(`"${jobSearch.company}" 채용 (site:jasoseol.com OR site:saramin.co.kr OR site:jobkorea.co.kr OR site:wanted.co.kr OR site:catch.co.kr)`)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ddd8cf] py-3 text-xs font-extrabold"
                    >
                      채용 사이트 결과 더 보기 <ExternalLink size={14} />
                    </a>
                  )}
                  {pickedListing && (
                    <div className="sticky bottom-0 mt-5 rounded-2xl bg-[#31363f] p-4 text-white shadow-xl">
                      <p className="truncate text-xs font-extrabold">
                        선택: {pickedListing.title}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <label className="flex flex-1 items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
                          서류 마감일{" "}
                          <input
                            type="date"
                            value={deadline}
                            onChange={(event) =>
                              setDeadline(event.target.value)
                            }
                            className="rounded-lg bg-white px-2 py-1.5 text-[#31363f] outline-none"
                          />
                        </label>
                        <button
                          onClick={saveCurrentListing}
                          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-extrabold"
                        >
                          공고만 스크랩
                        </button>
                        <button
                          onClick={registerListing}
                          disabled={!deadline}
                          className="rounded-xl bg-[#ff85a2] px-4 py-2.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          지원 시작
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] text-white/55">
                        AI가 찾은 날짜도 원문을 한 번 확인한 뒤 등록해 주세요.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {aiRecommendation.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#31363f]/50 p-4 backdrop-blur-[3px]">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] bg-white paper-shadow">
            <div className="flex items-start justify-between border-b border-[#eeeae2] bg-[#fff5f7] p-5 md:p-6">
              <div>
                <p className="flex items-center gap-1 text-xs font-extrabold text-[#ed6f8b]">
                  <Sparkles size={14} /> 경험 기반 AI 코치
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {selected?.company} 자소서 소재 추천
                </h2>
                <p className="mt-1 text-xs text-[#918d85]">
                  소중한 조개함의 기록만 사용해 작성합니다.
                </p>
              </div>
              <button
                onClick={() =>
                  setAiRecommendation((prev) => ({ ...prev, open: false }))
                }
                aria-label="AI 추천 닫기"
                className="rounded-full bg-white p-2"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 md:p-6">
              {aiRecommendation.loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <LoaderCircle
                    size={34}
                    className="mb-4 animate-spin text-[#ff85a2]"
                  />
                  <p className="text-sm font-extrabold">
                    경험의 연결고리를 찾고 있어요...
                  </p>
                  <p className="mt-2 text-xs text-[#918d85]">
                    보통 수 초 정도 걸립니다.
                  </p>
                </div>
              ) : aiRecommendation.error ? (
                <div className="rounded-2xl bg-[#fff3e1] p-5 text-center">
                  <AlertCircle
                    size={26}
                    className="mx-auto mb-3 text-[#b07c35]"
                  />
                  <p className="text-sm font-extrabold">
                    추천을 만들지 못했어요.
                  </p>
                  <p className="mt-2 break-keep text-xs leading-5 text-[#8c6a3d]">
                    {aiRecommendation.error}
                  </p>
                </div>
              ) : aiRecommendation.data ? (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-[#31363f] p-5 text-white">
                    <p className="text-lg font-extrabold">
                      {aiRecommendation.data.headline}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/75">
                      {aiRecommendation.data.strategy}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-extrabold">
                      추천 경험 연결법
                    </h3>
                    <div className="space-y-2">
                      {aiRecommendation.data.matches.map((match, index) => (
                        <div
                          key={`${match.experience}-${index}`}
                          className="rounded-2xl border border-[#eee9e1] bg-[#fffdfa] p-4"
                        >
                          <p className="text-sm font-extrabold text-[#ed6f8b]">
                            {match.experience}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-[#68655f]">
                            {match.connection}
                          </p>
                          <p className="mt-2 rounded-xl bg-[#eaf8f3] px-3 py-2 text-[11px] font-bold leading-5 text-[#4d806e]">
                            강조할 근거: {match.proofToEmphasize}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-extrabold">자소서 초안</h3>
                    <div className="whitespace-pre-wrap rounded-2xl bg-[#f7f4ee] p-5 text-sm leading-7 text-[#56534e]">
                      {aiRecommendation.data.draft}
                    </div>
                  </div>
                  {aiRecommendation.data.cautions.length > 0 && (
                    <div className="rounded-2xl border border-dashed border-[#e6cfa9] p-4">
                      <p className="text-xs font-extrabold text-[#9a7238]">
                        작성 전에 보완할 점
                      </p>
                      <ul className="mt-2 space-y-1 text-xs leading-5 text-[#7f715e]">
                        {aiRecommendation.data.cautions.map((caution) => (
                          <li key={caution}>• {caution}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="achievement-toast fixed bottom-7 left-1/2 z-50 flex w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3.5 text-sm text-[#48434c]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffe3ea] to-[#eee9ff] text-[#8b668f] shadow-sm">
            <Sparkles size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold tracking-[.12em] text-[#9d829a]">
              GOOD PROGRESS
            </p>
            <p className="mt-0.5 text-xs font-extrabold leading-5">
              {toastText}
            </p>
          </div>
          <span className="text-lg">⭐</span>
        </div>
      )}
    </main>
  );
}
