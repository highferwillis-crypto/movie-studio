type ImagePayload = { data?: { b64_json?: string; url?: string }[]; error?: { message?: string } | string };

function endpoint(base: string, path: string): string {
  const url = new URL(base.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The API address must start with http:// or https://.");
  }
  const root = url.toString().replace(/\/$/, "");
  return `${root}${path}`;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } | string };
    if (typeof body.error === "string" && body.error) return body.error;
    if (typeof body.error === "object" && body.error?.message) return body.error.message;
  } catch {
    /* ignore */
  }
  return `${fallback} (${res.status})`;
}

export async function generateCustomStills(data: {
  base: string;
  apiKey: string;
  model: string;
  prompt: string;
  n: number;
  size: string;
}): Promise<{ ok: true; images: string[] } | { ok: false; error: string }> {
  if (!data.apiKey.trim()) return { ok: false, error: "Add the API key in Settings." };
  let url: string;
  try {
    url = endpoint(data.base, "/images/generations");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Bad API address." };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.apiKey.trim()}` },
    body: JSON.stringify({
      model: data.model || "image",
      prompt: data.prompt.slice(0, 8000),
      n: data.n,
      size: data.size,
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) return { ok: false, error: await errorMessage(res, "The API server refused the still") };
  const body = (await res.json()) as ImagePayload;
  const images: string[] = [];
  for (const item of body.data ?? []) {
    if (item.b64_json) images.push(item.b64_json.startsWith("data:image/") ? item.b64_json : `data:image/jpeg;base64,${item.b64_json}`);
    else if (item.url) {
      const file = await fetch(item.url, { signal: AbortSignal.timeout(60_000) });
      if (!file.ok) continue;
      const bytes = Buffer.from(await file.arrayBuffer());
      images.push(`data:${file.headers.get("content-type") || "image/jpeg"};base64,${bytes.toString("base64")}`);
    }
  }
  if (!images.length) return { ok: false, error: "The API server returned no stills." };
  return { ok: true, images };
}
