export interface AnalysisResult {
  score: number;
  matched: string[];
  missing: string[];
  resumeKeywords: string[];
  jobKeywords: string[];
}

const STOPWORDS = new Set(
  (
    "a o e ou de da do das dos em um uma uns umas para por com sem sob sobre entre ate até apos após " +
    "que se como mais menos muito muita ja já tambem também ser ter estar foi são sera será seu sua seus suas " +
    "ao aos à às no na nos nas este esta esse essa isso isto ele ela eles elas nós voce você voces vocês " +
    "the and or of to in for with on at by from as is are was were be been being have has had will would " +
    "can could should this that these those it its we you they he she not but if then than so such " +
    "trabalho trabalhar equipe empresa vaga candidato requisitos requisito desejavel desejável diferencial " +
    "experiencia experiência conhecimento conhecimentos habilidade habilidades atividades responsabilidades " +
    "area área anos ano dia dias mes mês horas hora formação superior curso cursos nivel nível " +
    "etc via vez parte forma novas novo nova grandes grande bom boa bem melhor"
  ).split(/\s+/)
);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function extractKeywords(text: string): string[] {
  const words = normalize(text)
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/[\s/(),;:]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);
}

export function analyze(resume: string, job: string): AnalysisResult {
  const jobKeywords = extractKeywords(job).slice(0, 30);
  const resumeSet = new Set(extractKeywords(resume));
  const resumeNorm = normalize(resume);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jobKeywords) {
    if (resumeSet.has(kw) || resumeNorm.includes(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const score =
    jobKeywords.length === 0
      ? 0
      : Math.round((matched.length / jobKeywords.length) * 100);

  return {
    score,
    matched,
    missing,
    resumeKeywords: extractKeywords(resume).slice(0, 15),
    jobKeywords,
  };
}
