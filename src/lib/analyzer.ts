export type KeywordStatus = "encontrada" | "parcial" | "ausente";

export interface KeywordItem {
  term: string;
  status: KeywordStatus;
}

export interface CategoryResult {
  id: string;
  label: string;
  items: KeywordItem[];
  found: number;
  total: number;
  score: number;
}

export interface AnalysisResult {
  score: number;
  categories: CategoryResult[];
  matched: string[];
  missing: string[];
  partial: string[];
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

// Dicionários de categorias (termos normalizados, sem acento)
const CATEGORY_LEXICON: { id: string; label: string; terms: string[] }[] = [
  {
    id: "tecnicas",
    label: "Competências Técnicas",
    terms: [
      "excel", "word", "powerpoint", "office", "sap", "totvs", "salesforce", "crm", "erp",
      "python", "java", "javascript", "typescript", "react", "node", "sql", "mysql",
      "postgresql", "mongodb", "aws", "azure", "gcp", "docker", "kubernetes", "git",
      "linux", "html", "css", "php", "ruby", "golang", "rust", "kotlin", "swift",
      "powerbi", "tableau", "looker", "excel avancado", "vba", "macros", "autocad",
      "photoshop", "illustrator", "figma", "sketch", "premiere", "after effects",
      "google analytics", "google ads", "facebook ads", "meta ads", "seo", "sem",
      "hubspot", "rd station", "mailchimp", "zendesk", "jira", "confluence", "trello",
      "asana", "slack", "teams", "zoom", "notion", "sheets", "planilhas", "dashboards",
      "machine learning", "deep learning", "inteligencia artificial", "ia", "chatgpt",
      "tensorflow", "pytorch", "pandas", "numpy", "spark", "hadoop", "kafka", "etl",
      "api", "rest", "graphql", "microservicos", "devops", "ci cd", "scrum", "agile",
      "kanban", "lean", "six sigma", "pmbok", "itil", "cobit", "iso", "lgpd",
      "contabilidade", "fiscal", "tributario", "folha", "dp", "rh", "recrutamento",
      "selecao", "financeiro", "contas", "faturamento", "compras", "estoque", "logistica",
      "supply chain", "vendas", "negociacao", "prospeccao", "telemarketing", "ecommerce",
      "marketplace", "wordpress", "shopify", "magento", "woocommerce", "excel intermediario",
    ],
  },
  {
    id: "comportamentais",
    label: "Competências Comportamentais",
    terms: [
      "comunicacao", "lideranca", "trabalho em equipe", "proatividade", "organizacao",
      "planejamento", "criatividade", "inovacao", "adaptabilidade", "flexibilidade",
      "resiliencia", "empatia", "colaboracao", "negociacao", "persuasao", "networking",
      "gestao de tempo", "priorizacao", "foco", "disciplina", "comprometimento",
      "responsabilidade", "autonomia", "iniciativa", "dinamismo", "relacionamento",
      "interpersonal", "resolucao de problemas", "pensamento critico", "analitico",
      "atencao aos detalhes", "detalhista", "perfil analitico", "tomada de decisao",
      "inteligencia emocional", "autogestao", "aprendizado", "curiosidade", "etica",
    ],
  },
  {
    id: "idiomas",
    label: "Idiomas",
    terms: [
      "ingles", "english", "espanhol", "espanhol avancado", "frances", "alemao",
      "italiano", "mandarim", "chines", "japones", "portugues", "libras",
      "fluente", "avancado", "intermediario", "basico", "toefl", "ielts", "b2", "c1",
    ],
  },
  {
    id: "certificacoes",
    label: "Certificações",
    terms: [
      "certificacao", "certificado", "pmp", "scrum master", "csm", "psm", "itil",
      "cobit", "aws certified", "azure certified", "gcp", "cfa", "cpa", "crc",
      "cnae", "iso 9001", "six sigma", "green belt", "black belt", "yellow belt",
      "google analytics", "google ads", "hubspot", "rd station", "lgpd", "nr35", "nr10",
    ],
  },
  {
    id: "formacao",
    label: "Formação Acadêmica",
    terms: [
      "superior", "graduacao", "bacharelado", "licenciatura", "tecnologo", "pos",
      "pos graduacao", "mba", "mestrado", "doutorado", "tecnico", "ensino medio",
      "engenharia", "administracao", "economia", "contabeis", "direito", "medicina",
      "enfermagem", "psicologia", "pedagogia", "letras", "jornalismo", "publicidade",
      "marketing", "sistemas", "computacao", "ciencia da computacao", "analise de sistemas",
      "arquitetura", "design", "moda", "gastronomia", "turismo", "hotelaria", "logistica",
      "recursos humanos", "gestao", "comercio exterior", "relacoes internacionais",
    ],
  },
  {
    id: "experiencia",
    label: "Experiência Profissional",
    terms: [
      "experiencia", "vivencia", "atuacao", "trajetoria", "carreira", "historico",
      "anos de experiencia", "comprovada", "previa", "anterior", "solido", "consolidada",
    ],
  },
];

function categorize(keyword: string): string {
  for (const cat of CATEGORY_LEXICON) {
    if (cat.terms.some((t) => keyword === t || keyword.includes(t) || t.includes(keyword))) {
      return cat.id;
    }
  }
  return "tecnicas"; // fallback: termos específicos da vaga tendem a ser técnicos
}

function keywordStatus(keyword: string, resumeNorm: string, resumeWords: Set<string>): KeywordStatus {
  if (resumeWords.has(keyword)) return "encontrada";
  if (resumeNorm.includes(keyword)) return "encontrada";
  // parcial: alguma palavra do currículo compartilha raiz (prefixo de 4+ chars)
  const root = keyword.slice(0, Math.max(4, Math.floor(keyword.length * 0.7)));
  for (const w of resumeWords) {
    if (w.startsWith(root) || keyword.startsWith(w.slice(0, Math.max(4, Math.floor(w.length * 0.7))))) {
      return "parcial";
    }
  }
  return "ausente";
}

const CATEGORY_ORDER = ["tecnicas", "comportamentais", "idiomas", "certificacoes", "formacao", "experiencia"];

export function analyze(resume: string, job: string): AnalysisResult {
  const jobKeywords = extractKeywords(job).slice(0, 40);
  const resumeNorm = normalize(resume);
  const resumeWords = new Set(extractKeywords(resume));

  const byCategory = new Map<string, KeywordItem[]>();
  for (const kw of jobKeywords) {
    const catId = categorize(kw);
    const status = keywordStatus(kw, resumeNorm, resumeWords);
    if (!byCategory.has(catId)) byCategory.set(catId, []);
    byCategory.get(catId)!.push({ term: kw, status });
  }

  const categories: CategoryResult[] = CATEGORY_ORDER.filter((id) => byCategory.has(id)).map(
    (id) => {
      const items = byCategory.get(id)!;
      // peso: encontrada = 1, parcial = 0.5, ausente = 0
      const weight = items.reduce(
        (acc, i) => acc + (i.status === "encontrada" ? 1 : i.status === "parcial" ? 0.5 : 0),
        0
      );
      const found = items.filter((i) => i.status === "encontrada").length;
      return {
        id,
        label: CATEGORY_LEXICON.find((c) => c.id === id)!.label,
        items,
        found,
        total: items.length,
        score: Math.round((weight / items.length) * 100),
      };
    }
  );

  const totalWeight = categories.reduce((acc, c) => acc + c.score * c.total, 0);
  const totalItems = categories.reduce((acc, c) => acc + c.total, 0);
  const score = totalItems === 0 ? 0 : Math.round(totalWeight / totalItems);

  return {
    score,
    categories,
    matched: categories.flatMap((c) => c.items.filter((i) => i.status === "encontrada").map((i) => i.term)),
    partial: categories.flatMap((c) => c.items.filter((i) => i.status === "parcial").map((i) => i.term)),
    missing: categories.flatMap((c) => c.items.filter((i) => i.status === "ausente").map((i) => i.term)),
    jobKeywords,
  };
}
