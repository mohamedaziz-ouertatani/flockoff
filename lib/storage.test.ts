import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStorage, sniffImageKind } from "./storage";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const CLOUD_ENV = {
  STORAGE_DRIVER: "cloudinary",
  CLOUDINARY_CLOUD_NAME: "demo-cloud",
  CLOUDINARY_API_KEY: "key-123",
  CLOUDINARY_API_SECRET: "secret-xyz",
  CLOUDINARY_FOLDER: "flockoff/products",
};

/** Cloudinary's documented signature: sha1 of the sorted params joined with & plus the API secret. */
const expectedSignature = (params: Record<string, string>) =>
  createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + CLOUD_ENV.CLOUDINARY_API_SECRET,
    )
    .digest("hex");

describe("sniffImageKind", () => {
  it("recognizes images by content and rejects everything else", () => {
    expect(sniffImageKind(PNG)).toBe("png");
    expect(sniffImageKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(sniffImageKind(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("getStorage", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses the local driver on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("STORAGE_DRIVER", "");
    expect(() => getStorage()).toThrow(/STORAGE_DRIVER=cloudinary/);
  });
});

describe("Cloudinary driver (mocked network)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    for (const [k, v] of Object.entries(CLOUD_ENV)) vi.stubEnv(k, v);
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ now: new Date("2026-11-17T12:00:00Z") });
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uploads with a correct signature and returns the secure URL", async () => {
    const url = "https://res.cloudinary.com/demo-cloud/image/upload/v1/flockoff/products/abc.png";
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ secure_url: url }), { status: 200 }));

    await expect(getStorage().put(PNG, "png")).resolves.toEqual({ url });

    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
    const body = init.body as FormData;
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(body.get("api_key")).toBe("key-123");
    expect(body.get("folder")).toBe("flockoff/products");
    expect(body.get("timestamp")).toBe(timestamp);
    expect(body.get("signature")).toBe(expectedSignature({ folder: "flockoff/products", timestamp }));
    expect((body.get("file") as Blob).type).toBe("image/png");
    expect(body.get("api_secret")).toBeNull(); // the secret is never sent
  });

  it("surfaces upload failures", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 401 }));
    await expect(getStorage().put(PNG, "png")).rejects.toThrow(/401/);
  });

  it("deletes by public id, and ignores URLs it doesn't own", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await getStorage().delete("https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/flockoff/products/abc123.webp");
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/destroy");
    const body = init.body as FormData;
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(body.get("public_id")).toBe("flockoff/products/abc123");
    expect(body.get("signature")).toBe(expectedSignature({ public_id: "flockoff/products/abc123", timestamp }));

    fetchMock.mockClear();
    await getStorage().delete("https://res.cloudinary.com/someone-else/image/upload/v1/x.png");
    await getStorage().delete("/placeholder/hoodie.svg");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
