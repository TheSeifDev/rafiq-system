import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://phantomsio.vercel.app";

  const routes = [
    "",
    "/about",
    "/blog",
    "/contact",
    "/experience",

    "/rafiq",
    "/rafiq/ai",
    "/rafiq/apis",
    "/rafiq/architecture",
    "/rafiq/core",
    "/rafiq/data-flow",
    "/rafiq/database",
    "/rafiq/docs",
    "/rafiq/emulator",
    "/rafiq/failures",
    "/rafiq/gui",
    "/rafiq/rageeb",
    "/rafiq/security",
    "/rafiq/smart-home",
    "/rafiq/sync-engine",
    "/rafiq/wearable",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency:
      route === "" ? "daily" : "weekly",
    priority:
      route === ""
        ? 1
        : route.startsWith("/rafiq")
        ? 0.9
        : 0.8,
  }));
}