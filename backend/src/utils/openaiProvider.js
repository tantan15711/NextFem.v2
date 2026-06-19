const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const getOpenAIConfig = () => {
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();

  return {
    apiKey,
    enabled: Boolean(apiKey),
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT || "low"
  };
};

const extractOutputText = (response) => {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const chunks = [];

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
};

const parseJsonOutput = (text) => {
  if (!text) {
    throw new Error("La IA no devolvio contenido.");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw error;
    }

    return JSON.parse(match[0]);
  }
};

const createJsonResponse = async ({ name, schema, instructions, input }) => {
  const config = getOpenAIConfig();

  if (!config.enabled) {
    return null;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      reasoning: { effort: config.reasoningEffort },
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "No se pudo conectar con OpenAI.");
  }

  return parseJsonOutput(extractOutputText(data));
};

module.exports = {
  createJsonResponse,
  getOpenAIConfig
};
