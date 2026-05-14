/**
 * Help Q&A via OpenAI only (OPENAI_API_KEY, OPENAI_MODEL).
 * Uses Vercel AI SDK streamText — separate from resumeParser.js / parseResumeWithAI.
 */
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getHelpKnowledgeText } from './helpDocKnowledge.js';

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function buildSystemPrompt() {
  const kb = getHelpKnowledgeText();
  return `You are the OpenInterview Help assistant. Answer user questions using ONLY the knowledge base below.
If the answer is not in the knowledge base, say you do not have that information and suggest contacting support@openinterview.me.
Keep a clear, professional tone. Format answers with Markdown: use ## for section headings, **bold** for emphasis, and bullet lists where helpful.

--- KNOWLEDGE BASE ---
${kb}
--- END KNOWLEDGE BASE ---`;
}

/**
 * @param {import('ai').CoreMessage[]} messages - conversation (user/assistant), no system
 */
export function streamHelpDocAnswer(messages) {
  const modelId = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  return streamText({
    model: openaiProvider(modelId),
    system: buildSystemPrompt(),
    messages
  });
}
