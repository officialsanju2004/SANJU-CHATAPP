// Matches http(s) links and bare "www."/domain-style links (e.g. "google.com")
// closely enough for chat use without pulling in a heavy URL-parsing library.
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;!?'")\]]|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<]*)?)/g;

// Returns an array of { text, isLink, href } segments. Render each segment as
// plain text, or as an <a> when isLink is true - keeps message content 100%
// data, never raw HTML, so there's no XSS risk from someone's message text.
export function linkify(text) {
  if (!text) return [];
  const segments = [];
  let lastIndex = 0;
  let match;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const raw = match[0];

    // Skip things that just happen to look like "word.word" but aren't
    // really links (e.g. "e.g." or "Mr. Sharma") by requiring a known-ish
    // TLD length and no surrounding letters immediately before the match.
    if (match.index > 0 && /[a-zA-Z0-9]/.test(text[match.index - 1])) continue;

    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isLink: false });
    }

    const href = raw.startsWith('http') ? raw : `https://${raw}`;
    segments.push({ text: raw, isLink: true, href });
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isLink: false });
  }

  return segments.length ? segments : [{ text, isLink: false }];
}
