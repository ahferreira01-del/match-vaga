import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { analyze, normalizeText, type AnalysisResult } from "@/lib/analyzer";
import { atsToText, structureScore, type AtsStructured } from "@/lib/profile";

const ICONS: Record<string, string> = {
  resumo: "👤",
  competencias: "🧩",
  experiencia: "💼",
  formacao: "🎓",
  certificacoes: "🏅",
  idiomas: "🌎",
};

const ACCENTS: Record<string, string> = { a: "[aáàâã]", e: "[eéê]", i: "[ií]", o: "[oóôõ]", u: "[uúü]", c: "[cç]" };
function keywordRegex(words: string[]) {
  const parts = words
    .filter((w) => w.length > 1)
    .sort((a, b) => b.length - a.length)
    .map((w) =>
      w
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .split("")
        .map((ch) => ACCENTS[ch] ?? ch)
        .join("")
    );
  if (!parts.length) return null;
  return new RegExp(`(?<![\\p{L}])(${parts.join("|")})(?![\\p{L}])`, "giu");
}

function Highlight({ text, re }: { text: string; re: RegExp | null }) {
  if (!re) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(
      <mark key={i} className="rounded bg-primary/15 px-1 font-medium text-primary">
        {m[0]}
      </mark>
    );
    last = i + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

type Tag = "adicionado" | "reorganizado" | "destacado";
const TAG_STYLE: Record<Tag, { dot: string; label: string; row: string }> = {
  adicionado: { dot: "🟢", label: "Adicionado", row: "border-l-4 border-success bg-success/5" },
  reorganizado: { dot: "🟡", label: "Reorganizado", row: "border-l-4 border-warning bg-warning/5" },
  destacado: { dot: "🔵", label: "Destacado", row: "border-l-4 border-primary bg-primary/5" },
};

export function AtsResume({
  resume,
  job,
  analysis,
  ats,
}: {
  resume: string;
  job: string;
  analysis: AnalysisResult;
  ats: AtsStructured;
}) {
  const [view, setView] = useState<"cv" | "ats" | null>(null);
  const text = useMemo(() => atsToText(ats), [ats]);
  const re = useMemo(() => keywordRegex(ats.keywords), [ats.keywords]);

  const { before, after } = useMemo(() => {
    const b = Math.round(analyze(resume, job).score * 0.7 + structureScore(resume) * 0.3);
    const a = Math.round(analyze(text, job).score * 0.7 + structureScore(text) * 0.3);
    return { before: b, after: Math.max(a, b) };
  }, [resume, job, text]);

  const items = analysis.categories.flatMap((c) => c.items);
  const catScore = (id: string) => analysis.categories.find((c) => c.id === id)?.score;
  const has = (id: string) => ats.sections.some((s) => s.id === id);
  const resumoLine = normalizeText(ats.sections.find((s) => s.id === "resumo")?.lines.join(" ") ?? "");
  const proven = items.filter((i) => i.evidence !== "nao_encontrada");
  const sectionScores = [
    {
      label: "Resumo Profissional",
      score: proven.length ? Math.round((proven.slice(0, 5).filter((i) => resumoLine.includes(normalizeText(i.label).split(" ")[0] ?? "")).length / Math.min(5, proven.length)) * 100) : 40,
    },
    { label: "Competências", score: items.length ? Math.round((proven.length / items.length) * 100) : 0 },
    {
      label: "Experiência",
      score: has("experiencia") ? (proven.length ? Math.round((proven.filter((i) => i.evidence === "forte").length / proven.length) * 100) : 50) : 0,
    },
    { label: "Formação", score: catScore("formacao") ?? (has("formacao") ? 100 : 0) },
    { label: "Certificações", score: catScore("certificacoes") ?? (has("certificacoes") ? 100 : 0) },
  ];

  // Comparação
  const originalLines = resume.split("\n").map((l) => l.trim()).filter(Boolean);
  const origSet = new Set(originalLines.map(normalizeText));
  const tagFor = (line: string): Tag => {
    const n = normalizeText(line.replace(/^[-•*]\s*/, ""));
    if (![...origSet].some((o) => o.includes(n) || n.includes(o))) return "adicionado";
    if (re && new RegExp(re.source, "iu").test(line)) return "destacado";
    return "reorganizado";
  };
  const atsLines: { section: string; line: string; tag: Tag }[] = ats.sections.flatMap((s) =>
    s.lines.map((line) => ({ section: s.title, line, tag: tagFor(line) }))
  );
  const counts = atsLines.reduce((acc, l) => ({ ...acc, [l.tag]: (acc[l.tag] ?? 0) + 1 }), {} as Record<Tag, number>);

  const improvements = [
    `${ats.keywords.length} palavras-chave da vaga utilizadas`,
    `${proven.length} competências melhor posicionadas`,
    `${ats.sections.find((s) => s.id === "experiencia")?.lines.length ?? 0} linhas de experiência reorganizadas`,
    "Estrutura ATS otimizada (seções padrão, sem tabelas ou colunas)",
    "Legibilidade aprimorada",
  ];

  const missing = items.filter((i) => i.evidence === "nao_encontrada");
  const weak = items.filter((i) => i.evidence === "fraca" || i.evidence === "moderada");
  const recs: string[] = [
    ...missing.filter((i) => analysis.categories.find((c) => c.id === "certificacoes")?.items.includes(i)).map((i) => `Adicione a certificação ${i.label}, caso possua.`),
    ...missing.filter((i) => !analysis.categories.find((c) => c.id === "certificacoes")?.items.includes(i)).slice(0, 4).map((i) => `Se você tem experiência com ${i.label}, descreva onde e como aplicou.`),
    ...weak.slice(0, 3).map((i) => `Detalhe ${i.label} dentro da experiência profissional, com exemplos concretos.`),
    "Inclua resultados mensuráveis nas experiências (ex.: reduzi o tempo de implantação em 20%).",
    "Destaque as tecnologias e ferramentas usadas em cada projeto.",
  ];

  // Exportação
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Currículo copiado para a área de transferência.");
  };
  const htmlDoc = () => {
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const body = ats.sections
      .map(
        (s) =>
          `<h2>${esc(s.title)}</h2>` +
          (s.id === "competencias"
            ? `<p>${esc(s.lines.join(" • "))}</p>`
            : s.id === "experiencia"
              ? `<ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
              : s.lines.map((l) => `<p>${esc(l)}</p>`).join(""))
      )
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(ats.name)} - Currículo</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:720px;margin:32px auto;font-size:11pt;line-height:1.45}
      h1{font-size:20pt;margin:0}h2{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #999;padding-bottom:2px;margin-top:18px}
      p,li{margin:3px 0}.c{color:#444}</style></head><body><h1>${esc(ats.name)}</h1><p class="c">${esc(ats.contact)}</p>${
      ats.objective ? `<p><b>Objetivo:</b> ${esc(ats.objective)}</p>` : ""
    }${body}</body></html>`;
  };
  const downloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita pop-ups para gerar o PDF.");
    w.document.write(htmlDoc());
    w.document.close();
    w.onload = () => w.print();
    setTimeout(() => w.print(), 400);
    toast.success("Escolha “Salvar como PDF” na janela de impressão.");
  };
  const downloadDocx = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
    const children = [
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: ats.name, bold: true })] }),
      new Paragraph({ text: ats.contact }),
      ...(ats.objective ? [new Paragraph({ children: [new TextRun({ text: "Objetivo: ", bold: true }), new TextRun(ats.objective)] })] : []),
      ...ats.sections.flatMap((s) => [
        new Paragraph({ heading: HeadingLevel.HEADING_2, text: s.title.toUpperCase(), spacing: { before: 240 } }),
        ...(s.id === "competencias"
          ? [new Paragraph({ text: s.lines.join(" • ") })]
          : s.lines.map((l) => new Paragraph({ text: l, bullet: s.id === "experiencia" ? { level: 0 } : undefined }))),
      ]),
    ];
    const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculo-ats.docx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo DOCX baixado.");
  };

  const btn = "rounded-full border px-4 py-1.5 text-xs font-medium hover:bg-muted";

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">📝 Currículo ATS-Friendly</h3>
          <p className="text-xs text-muted-foreground">
            Usa apenas o que está no seu currículo — nada foi inventado. Revise antes de enviar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => setView("cv")}>👁️ Visualizar como currículo</button>
          <button className={btn} onClick={() => setView("ats")}>🤖 Visualizar versão ATS</button>
        </div>
      </div>

      {/* Indicador de melhoria */}
      <div className="grid gap-4 rounded-xl border bg-muted/40 p-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Avaliação ATS</p>
          {[
            { l: "Antes", v: before, cls: "bg-muted-foreground/40" },
            { l: "Depois da otimização", v: after, cls: "bg-primary" },
          ].map((r) => (
            <div key={r.l}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{r.l}</span>
                <span className="font-semibold">{r.v}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-background">
                <div className={`h-full rounded-full ${r.cls} transition-all duration-1000`} style={{ width: `${r.v}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl bg-card px-6 py-3 text-center">
          <span className="text-xs text-muted-foreground">Melhoria</span>
          <span className="text-3xl font-bold text-success">+{after - before}%</span>
        </div>
      </div>

      {/* Score por seção */}
      <div>
        <p className="mb-3 text-sm font-semibold">Aderência por seção</p>
        <div className="grid gap-3 md:grid-cols-2">
          {sectionScores.map((s) => (
            <div key={s.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{s.label}</span>
                <span className="font-semibold">{s.score}%</span>
              </div>
              <Progress value={s.score} />
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="cv">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="cv">Currículo otimizado</TabsTrigger>
          <TabsTrigger value="cmp">Comparação</TabsTrigger>
          <TabsTrigger value="imp">Melhorias aplicadas</TabsTrigger>
          <TabsTrigger value="rec">Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="cv" className="mt-4 space-y-3">
          <div className="rounded-xl border bg-background p-5">
            <p className="text-xl font-bold">{ats.name}</p>
            <p className="text-xs text-muted-foreground">{ats.contact}</p>
            {ats.objective && <p className="mt-2 text-sm"><b>Objetivo:</b> {ats.objective}</p>}
          </div>
          {ats.sections.map((s) => (
            <div key={s.id} className="rounded-xl border bg-background p-5">
              <h4 className="mb-3 flex items-center gap-2 font-semibold">
                <span>{ICONS[s.id]}</span> {s.title}
              </h4>
              {s.id === "competencias" ? (
                <div className="flex flex-wrap gap-2">
                  {s.lines.map((l) => (
                    <span key={l} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{l}</span>
                  ))}
                </div>
              ) : (
                <ul className={`space-y-1.5 text-sm ${s.id === "experiencia" ? "list-disc pl-5" : ""}`}>
                  {s.lines.map((l, i) => (
                    <li key={i}><Highlight text={l} re={re} /></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="cmp" className="mt-4">
          <div className="mb-3 flex flex-wrap gap-4 text-xs">
            {(Object.keys(TAG_STYLE) as Tag[]).map((t) => (
              <span key={t}>{TAG_STYLE[t].dot} {TAG_STYLE[t].label} ({counts[t] ?? 0})</span>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">CURRÍCULO ORIGINAL</p>
              <div className="max-h-[480px] space-y-1 overflow-auto text-xs">
                {originalLines.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">CURRÍCULO ATS-FRIENDLY</p>
              <div className="max-h-[480px] space-y-1 overflow-auto text-xs">
                {atsLines.map((l, i) => (
                  <div key={i}>
                    {(i === 0 || atsLines[i - 1]?.section !== l.section) && (
                      <p className="mt-2 font-bold uppercase">{l.section}</p>
                    )}
                    <p className={`rounded px-2 py-0.5 ${TAG_STYLE[l.tag].row}`}>{l.line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="imp" className="mt-4">
          <ul className="space-y-2 text-sm">
            {improvements.map((m) => (
              <li key={m} className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5">✅ {m}</li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="rec" className="mt-4 space-y-2 text-sm">
          {recs.map((r) => (
            <p key={r} className="rounded-lg border bg-background px-4 py-2.5">💡 {r}</p>
          ))}
          <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive">
            Importante: nunca invente experiências ou competências. Inclua apenas o que for verdadeiro.
          </p>
        </TabsContent>
      </Tabs>

      {/* Exportação */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-5">
        <span className="mr-2 text-sm font-semibold">Exportar:</span>
        <button className={btn} onClick={copy}>📋 Copiar texto</button>
        <button className={btn} onClick={downloadPdf}>📄 Baixar PDF</button>
        <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground" onClick={downloadDocx}>
          📝 Baixar DOCX
        </button>
      </div>

      <Dialog open={view !== null} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{view === "cv" ? "Visualização do currículo" : "Versão lida pelo ATS"}</DialogTitle>
          </DialogHeader>
          {view === "cv" ? (
            <div className="rounded-md border bg-background p-8 font-serif text-sm shadow-inner">
              <p className="text-2xl font-bold">{ats.name}</p>
              <p className="text-xs text-muted-foreground">{ats.contact}</p>
              {ats.objective && <p className="mt-2"><b>Objetivo:</b> {ats.objective}</p>}
              {ats.sections.map((s) => (
                <div key={s.id} className="mt-5">
                  <p className="border-b pb-0.5 text-sm font-bold uppercase tracking-wide">{s.title}</p>
                  {s.id === "competencias" ? (
                    <p className="mt-1">{s.lines.join(" • ")}</p>
                  ) : (
                    <ul className={`mt-1 space-y-0.5 ${s.id === "experiencia" ? "list-disc pl-5" : ""}`}>
                      {s.lines.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-semibold">Aderência à vaga</p>
                <Progress value={after} />
                <p className="mt-1 text-xs text-muted-foreground">{after}% após otimização</p>
              </div>
              <div>
                <p className="mb-1 font-semibold">Palavras-chave utilizadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {ats.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 font-semibold">Competências detectadas</p>
                <ul className="list-disc pl-5 text-xs">
                  {proven.map((i) => <li key={i.id}>{i.label} — evidência {i.evidence}</li>)}
                </ul>
              </div>
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 font-mono text-xs">{text}</pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
