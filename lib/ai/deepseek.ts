import OpenAI from "openai"

function requireEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable not found: ${name}`);
    }
    return value;
}

export const deepseekModel = requireEnv("DEEPSEEK_MODEL")

export const deepseek = new OpenAI({
    apiKey: requireEnv("DEEPSEEK_API_KEY"),
    baseURL: requireEnv("DEEPSEEK_BASE_URL"),
    timeout: 15_000,
    maxRetries: 1
})