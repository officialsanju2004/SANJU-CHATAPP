export default function LocationBubble({ location }) {
  if (!location) return null;
  const { lat, lng, live, expiresAt } = location;
  const isExpired = live && expiresAt && new Date(expiresAt) < new Date();
  const delta = 0.01;
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat}%2C${lng}&layer=mapnik`;
  const linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-56 rounded-xl overflow-hidden border border-white/10 relative"
    >
      <iframe
        title="location"
        src={embedUrl}
        className="w-full h-36 pointer-events-none"
        loading="lazy"
      />
      <div className="px-2.5 py-1.5 bg-black/50 backdrop-blur-sm flex items-center gap-1.5 text-xs text-white">
        <svg viewBox="0 0 24 24" width="13" height="13" className="fill-current shrink-0">
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
        </svg>
        {live && !isExpired ? 'Live location' : live && isExpired ? 'Live location ended' : 'Location'}
      </div>
    </a>
  );
}
