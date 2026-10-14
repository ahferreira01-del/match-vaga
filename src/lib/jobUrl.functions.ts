import { createServerFn } from "@tanstack/react-start";

export const fetchJobFromUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => {
    const u = new URL(d.url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("URL inválida");
    return { url: u.toString() };
  })
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MatchVaga/1.0)", Accept: "text/html" },
      });
      if (!res.ok) return { ok: false as const, error: `O site respondeu com erro (${res.status}).` };
      const html = (await res.text()).slice(0, 2_000_000);
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|li|h[1-6])[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/[ \t]+/g, " ")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 1)
        .join("\n");
      if (text.length < 100) return { ok: false as const, error: "Não foi possível ler a vaga nesse link. Cole o texto manualmente." };
      return { ok: true as const, text: text.slice(0, 20000) };
    } catch {
      return { ok: false as const, error: "Não foi possível acessar o link. Cole o texto da vaga manualmente." };
    }
  });
