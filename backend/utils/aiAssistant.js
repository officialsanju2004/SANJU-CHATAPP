const GEMINI_API_URL =
  
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const SYSTEM_PROMPT =
  'You are the built-in AI Assistant inside a chat app called Sanju Chat. Be friendly, concise, and helpful. ' +
  'Keep replies conversational and reasonably short unless the user asks for something detailed - this is a ' +
  'chat bubble, not a document. You can be sent photos (you will actually see the image), and also voice ' +
  'notes, videos, polls, and locations - for those you will get a short bracketed description instead of the ' +
  'file itself, since you cannot hear/watch them. React naturally to whatever was described, the way a ' +
  'person would.';

const MAX_INLINE_IMAGE_BYTES = 15 * 1024 * 1024; // Gemini's inline_data payload is capped well below this

// Downloads an image (e.g. a Cloudinary URL) and turns it into a Gemini
// inline_data part so the model actually sees the photo. Returns null on
// any failure (dead link, not really an image, too big, network hiccup) so
// one bad attachment never breaks the whole reply - callers fall back to a
// text placeholder instead.
async function imageUrlToPart(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').split(';')[0];
    if (!contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_INLINE_IMAGE_BYTES) return null;
    return { inline_data: { mime_type: contentType, data: buf.toString('base64') } };
  } catch (err) {
    console.error('imageUrlToPart error:', err.message);
    return null;
  }
}

// Turns one saved Message-shaped history entry into Gemini "parts". Only
// images are sent as real media (vision); everything else the bot can't
// perceive (voice/video/poll/location) becomes a short text description so
// the bot at least knows something was sent and can react to it, instead of
// silently ignoring it or never replying at all.
async function messageToParts(msg) {
  if (msg.type === 'image' && msg.mediaUrl) {
    const imagePart = await imageUrlToPart(msg.mediaUrl);
    const parts = [imagePart || { text: '[Sent a photo, but it could not be loaded]' }];
    if (msg.content) parts.push({ text: msg.content });
    return parts;
  }
  if (msg.type === 'voice') {
    return [{ text: `[Sent a voice message, ${msg.duration || 0}s long]` }];
  }
  if (msg.type === 'video') {
    return [{ text: '[Sent a video]' }];
  }
  if (msg.type === 'poll') {
    const options = msg.poll?.options?.map((o) => o.text).join(', ') || '';
    return [{ text: `[Created a poll: "${msg.poll?.question || ''}" — options: ${options}]` }];
  }
  if (msg.type === 'location') {
    return [{ text: msg.location?.live ? '[Shared their live location]' : '[Shared a location]' }];
  }
  return [{ text: msg.content || '' }];
}

// history: array of { role: 'user' | 'assistant', content, type, mediaUrl, duration, poll, location }
export async function getAIReply(history) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const contents = [];
  for (const msg of history) {
    const parts = await messageToParts(msg);
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
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
