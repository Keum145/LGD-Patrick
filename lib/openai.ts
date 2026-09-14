type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

export class OpenAIConfigError extends Error {}

const extractOutputText = (response: OpenAIResponse) => {
  if (response.output_text) return response.output_text;
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text")?.text ?? ""
  );
};

export async function createStructuredResponse<T>(options: {
  name: string;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  useWebSearch?: boolean;
  maxOutputTokens?: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAIConfigError(
      "OPENAI_API_KEY가 비어 있습니다. .env.local 파일에 새 API 키를 입력해 주세요.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-nano",
      instructions: options.instructions,
      input: options.input,
      reasoning: { effort: "none" },
      tools: options.useWebSearch ? [{ type: "web_search_preview" }] : [],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: options.name,
          strict: true,
          schema: options.schema,
        },
      },
      max_output_tokens: options.maxOutputTokens ?? 1200,
      store: false,
    }),
    signal: AbortSignal.timeout(55_000),
  });

  const data = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    throw new Error(
      data.error?.message || `OpenAI API 오류 (${response.status})`,
    );
  }

  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("AI 응답에서 결과를 찾지 못했습니다.");
  return JSON.parse(outputText) as T;
}
