import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  if (!text) return null;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await model.embedContent(text);
    const embedding = result.embedding;
    return embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}
