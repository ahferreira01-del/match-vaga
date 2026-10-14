import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { extractTextFromFile } from "@/lib/fileParse";
import { fetchJobFromUrl } from "@/lib/jobUrl.functions";
import {
  buildAtsStructured, cargoScore, detectJobCargo, detectJobSeniority, detectResumeCargo,
  detectResumeSeniority, seniorityScore, SENIORITY_LABEL, type Seniority, type AtsStructured,
} from "@/lib/profile";
import { AtsResume } from "@/components/AtsResume";
import { analyze, type AnalysisResult, type Evidence } from "@/lib/analyzer";

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

const EVIDENCE: Record<Evidence, { label: string; cls: string }> = {
  forte: { label: "✅ Forte", cls: "bg-accent text-accent-foreground" },
  moderada: { label: "🟡 Moderada", cls: "bg-warning/20 text-warning-foreground" },
  fraca: { label: "🟠 Fraca", cls: "bg-warning/10 text-warning-foreground" },
  nao_encontrada: { label: "❌ Não encontrada", cls: "bg-destructive/10 text-destructive" },
};

function EvidenceBadge({ evidence }: { evidence: Evidence }) {
  const e = EVIDENCE[evidence];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${e.cls}`}>
      {e.label}
    </span>
  );
}

interface Extra {
  competencyScore: number;
  cvCargo: string;
  jobCargo: string;
  cargoScore: number | null;
  cvSeniority: Seniority | null;
  cvYears: number | null;
  jobSeniority: Seniority | null;
  jobYears: number | null;
  seniorityScore: number | null;
  parts: { label: string; score: number; weight: number }[];
  analysis: AnalysisResult;
  ats: AtsStructured;
}

function StatCard({ title, value, sub }: { title: string; value: number | null; sub: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className={`mt-1 text-3xl font-bold ${value === null ? "text-muted-foreground" : scoreColor(value)}`}>
        {value === null ? "—" : `${value}%`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Index() {
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [extra, setExtra] = useState<Extra | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    setError("");
    setFileInfo("Lendo arquivo...");
    try {
      const { text, pages } = await extractTextFromFile(f);
      setResume(text);
      setFileInfo(
        `${f.name} · ${(f.size / 1024).toFixed(0)} KB${pages ? ` · ${pages} página(s)` : ""} · ${text.split(/\s+/).length} palavras`
      );
    } catch (e) {
      setFileInfo("");
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    }
  };

  const lastFetchedUrl = useRef("");

  const loadUrl = async (url?: string) => {
    const u = (url ?? jobUrl).trim();
    if (!u || u === lastFetchedUrl.current) return;
    lastFetchedUrl.current = u;
    setLoadingUrl(true);
    setError("");
    try {
      const r = await fetchJobFromUrl({ data: { url: u } });
      if (r.ok) setJob(r.text);
      else setError(r.error);
    } catch {
      setError("Link inválido.");
    } finally {
      setLoadingUrl(false);
    }
  };

  const onJobUrlChange = (value: string) => {
    setJobUrl(value);
    const v = value.trim();
    if (/^https?:\/\/\S+\.\S+/.test(v) && v !== lastFetchedUrl.current) {
      void loadUrl(v);
    }
  };

  const run = () => {
    if (resume.trim().length < 50 || job.trim().length < 50) {
      setError("Cole um currículo e uma descrição de vaga com pelo menos 50 caracteres cada.");
      return;
    }
    setError("");
    const a = analyze(resume, job);
    const cvCargo = detectResumeCargo(resume);
    const jobCargo = detectJobCargo(job);
    const cvSen = detectResumeSeniority(resume, cvCargo);
    const jobSen = detectJobSeniority(job);
    const cScore = cargoScore(cvCargo, jobCargo);
    const sScore = seniorityScore(cvSen.level, jobSen.level);
    const parts: { label: string; score: number; weight: number }[] = [
      { label: "Competências", score: a.score, weight: 70 },
    ];
    if (cScore !== null) parts.push({ label: "Cargo", score: cScore, weight: 15 });
    if (sScore !== null) parts.push({ label: "Senioridade", score: sScore, weight: 15 });
    const tw = parts.reduce((x, p) => x + p.weight, 0);
    const final = Math.round(parts.reduce((x, p) => x + p.score * p.weight, 0) / tw);
    setResult({ ...a, score: final });
    setExtra({
      competencyScore: a.score, cvCargo, jobCargo, cargoScore: cScore,
      cvSeniority: cvSen.level, cvYears: cvSen.years, jobSeniority: jobSen.level, jobYears: jobSen.years,
      seniorityScore: sScore, parts: parts.map((p) => ({ ...p, weight: Math.round((p.weight / tw) * 100) })),
      analysis: a,
      ats: buildAtsStructured(resume, jobCargo, a, cvSen.years),
    });
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
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full border px-4 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Enviar PDF ou DOCX
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <span className="text-xs text-muted-foreground">{fileInfo || "ou cole o texto abaixo"}</span>
            </div>
            <textarea
              id="curriculo"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Cole aqui o texto do seu currículo: experiências, habilidades, formação..."
              className="h-56 w-full resize-none rounded-xl border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold" htmlFor="vaga">
              💼 Descrição da vaga
            </label>
            <div className="mb-3 flex gap-2">
              <input
                value={jobUrl}
                onChange={(e) => onJobUrlChange(e.target.value)}
                placeholder="Cole o link da vaga — a importação é automática"
                className="min-w-0 flex-1 rounded-full border bg-background px-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={loadUrl}
                disabled={loadingUrl}
                className="rounded-full border px-4 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {loadingUrl ? "Lendo..." : "Importar"}
              </button>
            </div>
            <textarea
              id="vaga"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Cole aqui a descrição da vaga: requisitos, responsabilidades, diferenciais..."
              className="h-56 w-full resize-none rounded-xl border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
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

        {result && Array.isArray(result.categories) && Array.isArray(result.mandatoryMissing) && (
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
                    {result.totalCompetencies === 0
                      ? "Não identificamos competências profissionais reconhecíveis na vaga."
                      : `Seu currículo comprova ${result.totalFound} de ${result.totalCompetencies} competências exigidas pela vaga.`}
                    {result.mandatoryMissing.length > 0 &&
                      ` Requisitos obrigatórios sem evidência: ${result.mandatoryMissing.join(", ")}.`}
                  </p>
                </div>
              </div>
            </div>

            {extra && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard title="Competências" value={extra.competencyScore} sub={`${result.totalFound} de ${result.totalCompetencies} comprovadas`} />
                  <StatCard
                    title="Compatibilidade de cargo"
                    value={extra.cargoScore}
                    sub={`Você: ${extra.cvCargo || "não identificado"} · Vaga: ${extra.jobCargo || "não identificado"}`}
                  />
                  <StatCard
                    title="Compatibilidade de senioridade"
                    value={extra.seniorityScore}
                    sub={`Você: ${extra.cvSeniority ? SENIORITY_LABEL[extra.cvSeniority] : "não identificado"}${extra.cvYears !== null ? ` (~${extra.cvYears} anos)` : ""} · Vaga: ${extra.jobSeniority ? SENIORITY_LABEL[extra.jobSeniority] : "não identificado"}`}
                  />
                </div>

                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-3 font-semibold">🧮 Como o score foi calculado</h3>
                  <ul className="space-y-1 text-sm">
                    {extra.parts.map((p) => (
                      <li key={p.label} className="flex justify-between border-b py-1.5 last:border-0">
                        <span>{p.label} <span className="text-muted-foreground">(peso {p.weight}%)</span></span>
                        <span className={`font-semibold ${scoreColor(p.score)}`}>{p.score}%</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Requisitos obrigatórios valem o dobro dos desejáveis. Evidência forte (na experiência) vale 100%,
                    moderada (só em competências) 75% e fraca 40%.
                  </p>
                </div>

                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <h3 className="mb-3 font-semibold">🔍 Gap Analysis — o que falta</h3>
                  {(() => {
                    const items = result.categories.flatMap((c) => c.items);
                    const missing = items.filter((i) => i.evidence === "nao_encontrada");
                    const weak = items.filter((i) => i.evidence === "fraca" || i.evidence === "moderada");
                    if (!missing.length && !weak.length)
                      return <p className="text-sm text-muted-foreground">Nenhuma lacuna relevante encontrada. 🎉</p>;
                    return (
                      <div className="space-y-4 text-sm">
                        {missing.length > 0 && (
                          <div>
                            <p className="mb-1 font-medium">Não encontradas no currículo</p>
                            <ul className="list-disc space-y-0.5 pl-5">
                              {missing.map((i) => (
                                <li key={i.id}>
                                  {i.label}{" "}
                                  <span className="text-xs text-muted-foreground">
                                    ({i.requirement === "obrigatorio" ? "obrigatório" : "desejável"})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {weak.length > 0 && (
                          <div>
                            <p className="mb-1 font-medium">Pouca evidência — descreva na experiência</p>
                            <ul className="list-disc space-y-0.5 pl-5">
                              {weak.map((i) => <li key={i.id}>{i.label}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

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
                      <th className="px-6 py-2 font-medium">Competência</th>
                      <th className="px-6 py-2 font-medium">Requisito</th>
                      <th className="px-6 py-2 font-medium">Evidência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-6 py-2.5">
                          <div className="font-medium">{item.label}</div>
                          {item.matchedAs && (
                            <div className="text-xs text-muted-foreground">encontrado como “{item.matchedAs}”</div>
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-xs">
                          {item.requirement === "obrigatorio" ? "Obrigatório" : "Desejável"}
                        </td>
                        <td className="px-6 py-2.5">
                          <EvidenceBadge evidence={item.evidence} />
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
                      {result.totalFound}/{result.totalCompetencies}
                    </td>
                    <td className={`py-2.5 ${scoreColor(result.score)}`}>{result.score}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {extra && (
              <AtsResume resume={resume} job={job} analysis={extra.analysis} ats={extra.ats} />
            )}

            <p className="text-center text-xs text-muted-foreground">
              A análise compara competências (não palavras soltas), considera equivalências, o peso
              de cada requisito e onde a evidência aparece no currículo. Acontece 100% no seu navegador — nada é enviado ou armazenado.
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
