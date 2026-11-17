// Neutral placeholder product image: solid color + product name, as SVG.
// GET /placeholder/Migration%20Tee?bg=e8e2d4&fg=1a1a1a
const HEX = /^[0-9a-f]{6}$/i;

function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function wrap(text: string, max = 16): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export async function GET(req: Request, { params }: { params: Promise<{ label: string }> }) {
  const { label } = await params;
  const url = new URL(req.url);
  const bg = HEX.test(url.searchParams.get("bg") ?? "") ? url.searchParams.get("bg") : "d4d4d4";
  const fg = HEX.test(url.searchParams.get("fg") ?? "") ? url.searchParams.get("fg") : "171717";
  const text = decodeURIComponent(label).slice(0, 60);
  const lines = wrap(text);
  const lineHeight = 64;
  const startY = 600 - ((lines.length - 1) * lineHeight) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1200" viewBox="0 0 1000 1200">
  <rect width="1000" height="1200" fill="#${bg}"/>
  <text x="500" y="${startY}" fill="#${fg}" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" text-anchor="middle" dominant-baseline="middle">${lines
    .map((l, i) => `<tspan x="500" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(l.toUpperCase())}</tspan>`)
    .join("")}</text>
  <text x="500" y="1130" fill="#${fg}" opacity="0.5" font-family="Arial, Helvetica, sans-serif" font-size="28" letter-spacing="8" text-anchor="middle">FLOCK OFF</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
