const GEMINI_API_URL =
  
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const SYSTEM_PROMPT =
  'You are the built-in AI Assistant inside a chat app called Sanju Chat. Be friendly, concise, and helpful. ' +
  'Keep replies conversational and reasonably short unless the user asks for something detailed - this is a ' +
  'chat bubble, not a document.';

// history: array of { role: 'user' | 'assistant', content: string }

export async function getAIReply(history) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const conversation = history
    .map(
      (msg) =>
        `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`
    )
    .join('\n');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\n${conversation}\nAssistant:`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, I couldn't come up with a reply just now."
  );
}