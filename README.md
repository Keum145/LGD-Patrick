# 뚱이랑 취뽀 실행 방법

## 가장 쉬운 방법

폴더의 `start-app.bat` 파일을 더블클릭합니다.

- 검은 실행 창은 홈페이지 서버이므로 사이트를 사용하는 동안 닫지 않습니다.
- 브라우저가 자동으로 열리지 않으면 주소창에 `http://localhost:3000`을 입력합니다.
- 사용을 끝낼 때 검은 실행 창을 닫으면 서버도 종료됩니다.

## 개발 명령으로 실행

Node.js와 패키지가 설치된 환경에서는 다음 명령을 사용할 수 있습니다.

```powershell
npm run dev
```

이 프로젝트는 단일 HTML 파일이 아니라 Next.js 프로젝트이므로 `app/page.tsx`를 직접 열어서는 화면이 표시되지 않습니다.

## 회원가입·로그인 연결

무료 Supabase 프로젝트를 만든 뒤 아래 순서로 연결합니다.

1. Supabase의 SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
2. 프로젝트 폴더에 `.env.local` 파일을 만들고 다음 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=프로젝트_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=공개용_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=서버용_SERVICE_ROLE_KEY
```

3. 개발 서버를 다시 시작합니다.

Supabase Authentication의 Email 로그인을 사용합니다. 배포 후에는 Authentication의 URL Configuration에서 Site URL을 실제 배포 주소로 바꾸고 Redirect URLs에 같은 주소를 추가해야 가입 확인 메일이 올바르게 돌아옵니다.

사용자 데이터는 `user_workspaces` 테이블의 JSON 데이터로 저장되며, Row Level Security 정책이 로그인한 본인의 행에만 접근하도록 제한합니다. 기존 브라우저의 로컬 데이터는 해당 사용자가 처음 로그인할 때 계정 저장소로 한 번 가져옵니다.

`SUPABASE_SERVICE_ROLE_KEY`는 자격증 공식 일정과 AI가 보완한 채용 일정의 공용 캐시를 서버에서 읽고 저장할 때만 사용합니다. 브라우저에 노출되는 `NEXT_PUBLIC_` 변수나 GitHub 저장소에는 절대 넣지 말고, Vercel의 `Settings → Environment Variables`에만 등록합니다. 같은 자격증 일정은 7일, 같은 기업의 AI 채용 검색 결과는 6시간 동안 재사용합니다.

## OpenAI 기능 연결

AI 자소서 추천과 취업 타로 기능을 사용하려면 서버 환경 변수에 API 키를 등록합니다.

로컬에서는 프로젝트 최상위의 `.env.local` 파일에 입력합니다.

```env
OPENAI_API_KEY=발급받은_API_키
OPENAI_MODEL=gpt-5.4-nano
```

Vercel 배포에서는 프로젝트의 `Settings → Environment Variables`에 `OPENAI_API_KEY`를 등록하고 다시 배포합니다. API 키는 브라우저에 노출되는 `NEXT_PUBLIC_` 변수나 GitHub 저장소에 넣지 않습니다.
