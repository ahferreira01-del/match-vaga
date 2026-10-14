import { normalizeText, type AnalysisResult } from "./analyzer";

export type Seniority = "estagio" | "junior" | "pleno" | "senior" | "lideranca";
export const SENIORITY_LABEL: Record<Seniority, string> = {
  estagio: "Estágio / Trainee",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  lideranca: "Liderança / Gestão",
};
const ORDER: Seniority[] = ["estagio", "junior", "pleno", "senior", "lideranca"];

function explicitLevel(n: string): Seniority | null {
  if (/\b(coordenador|gerente|head|diretor|supervisor)\b/.test(n)) return "lideranca";
  if (/\b(senior|sr|especialista)\b/.test(n)) return "senior";
  if (/\b(pleno|pl)\b/.test(n)) return "pleno";
  if (/\b(junior|jr|assistente)\b/.test(n)) return "junior";
  if (/\b(estagio|estagiario|trainee|aprendiz)\b/.test(n)) return "estagio";
  return null;
}

function levelFromYears(y: number): Seniority {
  if (y < 1) return "estagio";
  if (y < 3) return "junior";
  if (y < 6) return "pleno";
  return "senior";
}

export function resumeYears(resume: string): number | null {
  const n = normalizeText(resume);
  const m = n.match(/(\d{1,2}) ano de experiencia/);
  if (m) return Number(m[1]);
  const now = new Date().getFullYear();
  const years = [...resume.matchAll(/\b(19[7-9]\d|20[0-4]\d)\b/g)].map((x) => Number(x[1]));
  if (!years.length) return null;
  const hasCurrent = /\b(atual|atualmente|presente|o momento)\b/.test(n);
  const max = hasCurrent ? now : Math.max(...years);
  return Math.max(0, max - Math.min(...years));
}

export function detectResumeSeniority(resume: string, cargo: string) {
  const years = resumeYears(resume);
  const explicit = explicitLevel(normalizeText(cargo));
  const level = explicit ?? (years !== null ? levelFromYears(years) : null);
  return { level, years };
}

export function detectJobSeniority(job: string) {
  const n = normalizeText(job);
  const head = normalizeText(job.split("\n").slice(0, 3).join(" "));
  const explicit = explicitLevel(head) ?? explicitLevel(n);
  const m = n.match(/(\d{1,2}) ano/);
  const years = m ? Number(m[1]) : null;
  return { level: explicit ?? (years !== null ? levelFromYears(years) : null), years };
}

export function seniorityScore(cv: Seniority | null, job: Seniority | null) {
  if (!cv || !job) return null;
  const d = ORDER.indexOf(cv) - ORDER.indexOf(job);
  if (d === 0) return 100;
  if (d > 0) return d === 1 ? 85 : 70; // acima do exigido
  return d === -1 ? 55 : 20; // abaixo
}

// ---------- Cargo ----------
const CARGO_WORDS = /(analista|consultor|desenvolvedor|programador|engenheiro|assistente|auxiliar|coordenador|gerente|tecnico|especialista|vendedor|executivo|designer|supervisor|atendente|operador|estagiario|lider|diretor|arquiteto|cientista|contador|advogado|recrutador)/;

export function detectResumeCargo(resume: string): string {
  const lines = resume.split("\n").map((l) => l.trim()).filter(Boolean);
  const objIdx = lines.findIndex((l) => /^(objetivo|cargo pretendido)/i.test(normalizeText(l)));
  if (objIdx >= 0) {
    const same = (lines[objIdx] ?? "").split(/[:\-–]/).slice(1).join(" ").trim();
    return same || lines[objIdx + 1] || "";
  }
  return lines.slice(0, 6).find((l) => CARGO_WORDS.test(normalizeText(l)) && l.length < 80) ?? "";
}

export function detectJobCargo(job: string): string {
  const lines = job.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, 8).find((l) => CARGO_WORDS.test(normalizeText(l)) && l.length < 100) ?? lines[0] ?? "";
}

const GENERIC = new Set(["de", "da", "do", "em", "e", "jr", "pl", "sr", "junior", "pleno", "senior", "i", "ii", "iii"]);
const ROLE_SYNONYMS: [RegExp, string][] = [
  [/implementacao/g, "implantacao"],
  [/consultor/g, "analista"],
  [/programador|developer/g, "desenvolvedor"],
  [/atendente/g, "suporte"],
];
function roleTokens(s: string) {
  let n = normalizeText(s);
  for (const [r, v] of ROLE_SYNONYMS) n = n.replace(r, v);
  return new Set(n.split(" ").filter((w) => w.length > 1 && !GENERIC.has(w)));
}

export function cargoScore(cv: string, job: string): number | null {
  if (!cv || !job) return null;
  const a = roleTokens(cv);
  const b = roleTokens(job);
  if (!b.size) return null;
  let hit = 0;
  for (const w of b) if (a.has(w)) hit++;
  return Math.round((hit / b.size) * 100);
}

// ---------- Contato / seções ----------
export function extractContact(resume: string) {
  const email = resume.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  const phone = resume.match(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/)?.[0];
  const linkedin = resume.match(/linkedin\.com\/[\w/-]+/i)?.[0];
  const name = resume.split("\n").map((l) => l.trim()).find((l) => l && !/@|\d{4}/.test(l) && l.split(" ").length <= 6);
  return { name, email, phone, linkedin };
}

type RawSection = "experiencia" | "formacao" | "idiomas" | "certificacoes" | "competencias" | "outro";
export function rawSections(resume: string): Record<RawSection, string[]> {
  const out: Record<RawSection, string[]> = { experiencia: [], formacao: [], idiomas: [], certificacoes: [], competencias: [], outro: [] };
  let cur: RawSection = "outro";
  for (const raw of resume.split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    const n = normalizeText(l);
    if (l.length < 50 && n.split(" ").length <= 5) {
      if (/experiencia|historico profissional|trajetoria/.test(n)) { cur = "experiencia"; continue; }
      if (/formacao|educacao|escolaridade/.test(n)) { cur = "formacao"; continue; }
      if (/idioma/.test(n)) { cur = "idiomas"; continue; }
      if (/certifica|curso/.test(n)) { cur = "certificacoes"; continue; }
      if (/habilidade|competencia|conhecimento|skill|ferramenta/.test(n)) { cur = "competencias"; continue; }
      if (/resumo|objetivo|perfil|contato|dados pessoai/.test(n)) { cur = "outro"; continue; }
    }
    out[cur].push(l);
  }
  return out;
}

// ---------- Currículo ATS-friendly ----------
export function buildAtsResume(resume: string, jobCargo: string, analysis: AnalysisResult, years: number | null) {
  const c = extractContact(resume);
  const s = rawSections(resume);
  const proven = analysis.categories
    .flatMap((cat) => cat.items)
    .filter((i) => i.evidence !== "nao_encontrada")
    .map((i) => i.label);
  const out: string[] = [];
  out.push((c.name ?? "SEU NOME").toUpperCase());
  out.push([c.email, c.phone, c.linkedin].filter(Boolean).join(" | "));
  out.push("");
  out.push("OBJETIVO");
  out.push(jobCargo || "Cargo pretendido");
  out.push("");
  out.push("RESUMO PROFISSIONAL");
  out.push(
    `Profissional${years ? ` com ${years} ano(s) de experiência` : ""}${proven.length ? `, com atuação em ${proven.slice(0, 5).join(", ")}` : ""}.`
  );
  out.push("");
  if (proven.length) {
    out.push("COMPETÊNCIAS");
    out.push(proven.join(" • "));
    out.push("");
  }
  const block = (title: string, lines: string[]) => {
    if (!lines.length) return;
    out.push(title);
    for (const l of lines) out.push(/^[-•*]/.test(l) ? "- " + l.replace(/^[-•*]\s*/, "") : l);
    out.push("");
  };
  block("EXPERIÊNCIA PROFISSIONAL", s.experiencia);
  block("FORMAÇÃO ACADÊMICA", s.formacao);
  block("CERTIFICAÇÕES E CURSOS", s.certificacoes);
  block("IDIOMAS", s.idiomas);
  return out.join("\n").trim();
}
