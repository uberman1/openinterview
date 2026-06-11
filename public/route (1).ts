import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import fs from 'fs';
import path from 'path';

// Set runtime to nodejs to allow fs access
export const runtime = 'nodejs';

// Initialize OpenRouter client using the OpenAI SDK adapter
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Extract messages from the request body
    const { messages } = await req.json();

    // Read the knowledge base file
    let knowledgeBaseContent = '';
    try {
      const kbPath = path.join(process.cwd(), 'ESTORO_KNOWLEDGE_BASE.md');
      knowledgeBaseContent = fs.readFileSync(kbPath, 'utf-8');
    } catch (error) {
      console.error('Error reading knowledge base:', error);
      knowledgeBaseContent = 'Knowledge base is currently unavailable.';
    }

    // Define the system prompt
    const systemPrompt = `
You are the 'Estoro AI Guide', a helpful and professional assistant for EstoroAi.
Your primary goal is to answer user questions strictly using the provided knowledge base content below.
If the user asks a question and the answer is not present in the knowledge base, politely inform them that you don't have that information and direct them to contact the Estoro team.
Maintain a professional, tech-company aesthetic in your tone.

--- KNOWLEDGE BASE ---
${knowledgeBaseContent}
--- END KNOWLEDGE BASE ---
`;

    const modelMessages = await convertToModelMessages(messages);

    // Call the OpenRouter API using the specified free model
    const result = streamText({
      model: openrouter('openrouter/free'),
      system: systemPrompt,
      messages: modelMessages,
    });

    // Return the streaming response
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    
    // Check for specific OpenRouter/OpenAI errors
    const isBusy = error?.status === 429 || error?.status === 503 || error?.status === 502;
    const errorMessage = isBusy 
      ? 'Estoro AI is currently experiencing high traffic or the model is busy. Please try again in a few moments.'
      : 'Estoro AI is currently unavailable. Please try again later.';

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error?.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
