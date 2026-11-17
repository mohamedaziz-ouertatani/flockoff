import { readLocalUpload } from "@/lib/storage";

// Serves images written by the local storage driver. Filenames are random and immutable.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const found = await readLocalUpload((await params).file);
  if (!found) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(found.bytes), {
    headers: {
      "Content-Type": found.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
