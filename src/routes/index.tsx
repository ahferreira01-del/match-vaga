import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { analyze, type AnalysisResult, type KeywordStatus } from "@/lib/analyzer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MatchVaga — Análise de compatibilidade currículo × vaga" },
      {
        name: "description",
        content:
          "Cole seu currículo e a descrição da vaga e descubra seu percentual de compatibilidade, pontos fortes e lacunas. Gratuito e sem cadastro.",
      },
      { property: "og:title", content: "MatchVaga — Análise de compatibilidade currículo × vaga" },
      {
        property: "og:description",
        content:
          "Descubra em segundos o quanto seu currículo combina com a vaga dos seus sonhos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function scoreColor(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function scoreLabel(score: number) {
  if (score >= 70) return "Alta compatibilidade";
  if (score >= 40) return "Compatibilidade moderada";
  return "Baixa compatibilidade";
}

function ScoreRing({ score }: { score: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-muted" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-primary transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${scoreColor(score)}`}>{score}%</span>
        <span className="text-xs text-muted-foreground">compatível</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: KeywordStatus }) {
  if (status === "encontrada")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
        ✅ Encontrada
      </span>
    );
  if (status === "parcial")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning-foreground">
        ⚠️ Parcial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
      ❌ Ausente
    </span>
  );
}

function Index() {
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const run = () => {
    if (resume.trim().length < 50 || job.trim().length < 50) {
      setError("Cole um currículo e uma descrição de vaga com pelo menos 50 caracteres cada.");
      return;
    }
    setError("");
    setResult(analyze(resume, job));
    setTimeout(() => {
      document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-primary">MatchVaga</span>
          <span className="text-xs text-muted-foreground">Gratuito · Sem cadastro</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="py-14 text-center">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Seu currículo combina com a vaga?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Cole seu currículo e a descrição da vaga abaixo. Em segundos, mostramos seu
            percentual de compatibilidade, seus pontos fortes e o que está faltando.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold" htmlFor="curriculo">
              📄 Seu currículo
            </label>
            <textarea
              id="curriculo"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Cole aqui o texto do seu currículo: experiências, habilidades, formação..."
              className="h-64 w-full resize-none rounded-xl border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold" htmlFor="vaga">
              💼 Descrição da vaga
            </label>
            <textarea
              id="vaga"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Cole aqui a descrição da vaga: requisitos, responsabilidades, diferenciais..."
              className="h-64 w-full resize-none rounded-xl border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        <div className="mt-8 text-center">
          <button
            onClick={run}
            className="rounded-full bg-primary px-10 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Analisar compatibilidade
          </button>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        {result && Array.isArray(result.categories) && Array.isArray(result.jobKeywords) && (
          <section id="resultado" className="mt-16 space-y-8">
            <div className="rounded-2xl border bg-card p-8 shadow-sm">
              <h2 className="mb-6 text-xl font-bold">
                📊 Relatório de Compatibilidade Currículo × Vaga
              </h2>
              <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-14">
                <ScoreRing score={result.score} />
                <div className="max-w-sm text-center md:text-left">
                  <h3 className={`text-2xl font-bold ${scoreColor(result.score)}`}>
                    {scoreLabel(result.score)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Seu currículo cobre {result.matched.length} de {result.jobKeywords.length}{" "}
                    termos-chave identificados na vaga
                    {result.partial.length > 0 &&
                      `, com ${result.partial.length} correspondência(s) parcial(is)`}
                    .
                    {result.score < 70 &&
                      " Inclua os termos em falta (quando forem verdadeiros para você) para aumentar suas chances."}
                  </p>
                </div>
              </div>
            </div>

            {result.categories.map((cat) => (
              <div key={cat.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b bg-muted/50 px-6 py-3">
                  <h3 className="font-semibold">{cat.label}</h3>
                  <span className="text-sm text-muted-foreground">
                    {cat.found}/{cat.total} ·{" "}
                    <span className={`font-semibold ${scoreColor(cat.score)}`}>{cat.score}%</span>
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-6 py-2 font-medium">Palavra-chave</th>
                      <th className="px-6 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item) => (
                      <tr key={item.term} className="border-b last:border-0">
                        <td className="px-6 py-2.5 font-medium">{item.term}</td>
                        <td className="px-6 py-2.5">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-semibold">📋 Resumo da análise</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Categoria</th>
                    <th className="py-2 pr-4 font-medium">Encontradas</th>
                    <th className="py-2 font-medium">Pontuação</th>
                  </tr>
                </thead>
                <tbody>
                  {result.categories.map((cat) => (
                    <tr key={cat.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">{cat.label}</td>
                      <td className="py-2.5 pr-4">
                        {cat.found}/{cat.total}
                      </td>
                      <td className={`py-2.5 font-semibold ${scoreColor(cat.score)}`}>
                        {cat.score}%
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2.5 pr-4">Total</td>
                    <td className="py-2.5 pr-4">
                      {result.matched.length}/{result.jobKeywords.length}
                    </td>
                    <td className={`py-2.5 ${scoreColor(result.score)}`}>{result.score}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              A análise é baseada em correspondência de palavras-chave e acontece 100% no seu
              navegador — nada é enviado ou armazenado.
            </p>
          </section>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        MatchVaga — feito para ajudar você a se candidatar melhor.
      </footer>
    </div>
  );
}
