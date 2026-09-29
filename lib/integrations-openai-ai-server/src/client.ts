import OpenAI from "openai";

const scanBaseUrl = process.env.SCAN_API_BASE_URL?.trim();
const scanApiKey = process.env.SCAN_API_KEY?.trim();

if ((scanBaseUrl && !scanApiKey) || (!scanBaseUrl && scanApiKey)) {
  throw new Error(
    "SCAN_API_BASE_URL and SCAN_API_KEY must be configured together.",
  );
}

const baseURL = scanBaseUrl || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = scanApiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!baseURL || !apiKey) {
  throw new Error(
    "Configure both SCAN_API_BASE_URL and SCAN_API_KEY, or provision the OpenAI AI integration.",
  );
}

export const openai = new OpenAI({
  apiKey,
  baseURL,
});
