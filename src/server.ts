import { consumeLastCapturedError, renderErrorPage } from "./lib/errors";
import { generateSitemapXml, generateRobotsTxt, isSitemapEnabled } from "./lib/seo";

type ServerEntry = {
  fetch: (request: Request) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

const SEO_PATHS = new Set(["/sitemap.xml", "/robots.txt"]);

async function handleSeoRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!SEO_PATHS.has(path)) return null;

  // Check if sitemap generation is enabled in site settings
  const enabled = await isSitemapEnabled().catch(() => true);
  if (!enabled) {
    return new Response("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const baseUrl = url.origin;

  try {
    if (path === "/sitemap.xml") {
      const xml = await generateSitemapXml(baseUrl);
      return new Response(xml, {
        headers: {
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    if (path === "/robots.txt") {
      // If sitemap is disabled, omit the Sitemap directive from robots.txt
      const text = generateRobotsTxt(baseUrl);
      return new Response(text, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
  } catch (error) {
    console.error(`[seo] Failed to generate ${path}:`, error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return null;
}

const handler = async (request: Request): Promise<Response> => {
  // Intercept sitemap.xml and robots.txt before TanStack Router
  const seoResponse = await handleSeoRequest(request);
  if (seoResponse) return seoResponse;

  try {
    const entry = await getServerEntry();
    const response = await entry.fetch(request);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return brandedErrorResponse();
  }
};

export default { fetch: handler };
