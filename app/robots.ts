import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-visitor pages: nothing useful to index.
      disallow: ["/admin", "/api", "/cart", "/checkout", "/order/", "/login", "/search"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
