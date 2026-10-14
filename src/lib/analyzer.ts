// Motor de análise ATS orientado a competências (100% no navegador).

export type Evidence = "forte" | "moderada" | "fraca" | "nao_encontrada";
export type Requirement = "obrigatorio" | "desejavel";

export interface CompetencyItem {
  id: string;
  label: string;
  requirement: Requirement;
  evidence: Evidence;
  matchedAs?: string | undefined; // termo do currículo que comprovou
}

export interface CategoryResult {
  id: string;
  label: string;
  items: CompetencyItem[];
  found: number;
  total: number;
  score: number;
}

export interface AnalysisResult {
  score: number;
  categories: CategoryResult[];
  totalFound: number;
  totalCompetencies: number;
  mandatoryMissing: string[];
}

// ---------- 1. Pré-processamento ----------
function stripAccents(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function singular(w: string): string {
  if (w.length <= 4) return w;
  if (w.endsWith("oes") || w.endsWith("aes")) return w.slice(0, -3) + "ao";
  if (w.endsWith("ais")) return w.slice(0, -3) + "al";
  if (w.endsWith("eis")) return w.slice(0, -3) + "el";
  if (w.endsWith("res") || w.endsWith("zes")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function normalizeText(t: string): string {
  return stripAccents(t)
    .replace(/[^a-z0-9+#\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(" ");
}

// ---------- 3/5. Catálogo de competências com equivalências semânticas ----------
type Cat = "cargo" | "hard" | "ferramentas" | "soft" | "idiomas" | "certificacoes" | "formacao";

const CATEGORY_LABELS: Record<Cat, string> = {
  cargo: "Cargo / Função",
  hard: "Hard Skills e Responsabilidades",
  ferramentas: "Ferramentas e Tecnologias",
  soft: "Soft Skills",
  idiomas: "Idiomas",
  certificacoes: "Certificações",
  formacao: "Formação",
};

const CATALOG: { id: string; label: string; cat: Cat; aliases: string[] }[] = [
  // Cargo
  { id: "analista_implantacao", label: "Analista / Consultor de Implantação", cat: "cargo", aliases: ["analista de implantacao", "consultor de implantacao", "analista de implementacao", "consultor de implementacao", "implantador"] },
  { id: "analista_suporte", label: "Analista de Suporte", cat: "cargo", aliases: ["analista de suporte", "tecnico de suporte", "suporte tecnico", "help desk", "service desk"] },
  { id: "analista_dados", label: "Analista de Dados / BI", cat: "cargo", aliases: ["analista de dados", "analista de bi", "analista de business intelligence", "data analyst"] },
  { id: "desenvolvedor", label: "Desenvolvedor(a)", cat: "cargo", aliases: ["desenvolvedor", "programador", "developer", "engenheiro de software"] },
  { id: "vendedor", label: "Vendas / Comercial", cat: "cargo", aliases: ["vendedor", "executivo de venda", "consultor comercial", "representante comercial", "inside sale"] },

  // Hard skills / responsabilidades
  { id: "implantacao", label: "Implantação de Sistemas", cat: "hard", aliases: ["implantacao", "implementacao", "go live", "parametrizacao", "configuracao de sistema"] },
  { id: "atendimento", label: "Atendimento ao Cliente", cat: "hard", aliases: ["atendimento ao cliente", "atendimento", "suporte ao cliente", "suporte ao usuario", "customer success", "sucesso do cliente", "via telefone", "whatsapp", "sac", "relacionamento com cliente"] },
  { id: "treinamento", label: "Treinamento / Capacitação", cat: "hard", aliases: ["treinamento", "capacitacao", "capacitar", "treinar", "realizava treinamento", "onboarding", "instrutor", "multiplicador"] },
  { id: "gestao_projetos", label: "Gestão de Projetos", cat: "hard", aliases: ["gestao de projeto", "gerenciamento de projeto", "gerente de projeto", "project management", "cronograma"] },
  { id: "levantamento", label: "Levantamento de Requisitos", cat: "hard", aliases: ["levantamento de requisito", "mapeamento de processo", "analise de requisito", "requisitos de negocio"] },
  { id: "bi", label: "Business Intelligence", cat: "hard", aliases: ["business intelligence", "power bi", "powerbi", "bi", "dashboard", "indicadore", "kpi", "relatorio gerencial"] },
  { id: "banco_dados", label: "Banco de Dados Relacional", cat: "hard", aliases: ["banco de dado", "sql server", "sql", "mysql", "postgresql", "postgre", "oracle", "consulta sql", "query"] },
  { id: "vendas", label: "Vendas e Negociação", cat: "hard", aliases: ["venda", "negociacao", "prospeccao", "fechamento de contrato", "funil de venda", "pipeline comercial"] },
  { id: "financeiro", label: "Rotinas Financeiras", cat: "hard", aliases: ["financeiro", "conta a pagar", "conta a receber", "faturamento", "conciliacao bancaria", "fluxo de caixa"] },
  { id: "contabil", label: "Contabilidade / Fiscal", cat: "hard", aliases: ["contabilidade", "contabil", "fiscal", "tributario", "apuracao de imposto", "sped"] },
  { id: "rh", label: "Recursos Humanos", cat: "hard", aliases: ["recrutamento", "selecao", "departamento pessoal", "folha de pagamento", "recursos humano"] },
  { id: "logistica", label: "Logística / Estoque", cat: "hard", aliases: ["logistica", "estoque", "supply chain", "armazenagem", "expedicao"] },
  { id: "marketing_digital", label: "Marketing Digital", cat: "hard", aliases: ["marketing digital", "seo", "trafego pago", "google ad", "meta ad", "facebook ad", "midia social", "rede social", "inbound"] },
  { id: "metodologias_ageis", label: "Metodologias Ágeis", cat: "hard", aliases: ["scrum", "agil", "agile", "kanban", "sprint"] },
  { id: "documentacao", label: "Documentação de Processos", cat: "hard", aliases: ["documentacao", "manual", "procedimento operacional", "pop"] },
  { id: "programacao", label: "Programação", cat: "hard", aliases: ["programacao", "desenvolvimento de software", "codigo", "python", "javascript", "typescript", "java", "c#", "php"] },

  // Ferramentas
  { id: "excel", label: "Excel", cat: "ferramentas", aliases: ["excel", "planilha", "procv", "tabela dinamica"] },
  { id: "powerbi", label: "Power BI", cat: "ferramentas", aliases: ["power bi", "powerbi"] },
  { id: "erp", label: "ERP", cat: "ferramentas", aliases: ["erp", "sap", "totvs", "protheus", "senior", "sankhya", "oracle erp", "omie", "bling"] },
  { id: "crm", label: "CRM", cat: "ferramentas", aliases: ["crm", "salesforce", "hubspot", "pipedrive", "rd station", "zoho"] },
  { id: "jira", label: "Jira / Gestão de Chamados", cat: "ferramentas", aliases: ["jira", "zendesk", "freshdesk", "glpi", "chamado", "ticket"] },
  { id: "office", label: "Pacote Office", cat: "ferramentas", aliases: ["pacote office", "office", "word", "powerpoint", "microsoft 365"] },
  { id: "cloud", label: "Cloud (AWS / Azure / GCP)", cat: "ferramentas", aliases: ["aws", "azure", "gcp", "google cloud", "cloud"] },
  { id: "git", label: "Git", cat: "ferramentas", aliases: ["git", "github", "gitlab", "bitbucket"] },
  { id: "react", label: "React", cat: "ferramentas", aliases: ["react", "react j", "next j"] },
  { id: "docker", label: "Docker / Kubernetes", cat: "ferramentas", aliases: ["docker", "kubernete", "container"] },
  { id: "figma", label: "Figma / Design", cat: "ferramentas", aliases: ["figma", "photoshop", "illustrator", "canva"] },

  // Soft skills
  { id: "lideranca", label: "Liderança / Gestão de Equipes", cat: "soft", aliases: ["lideranca", "gestao de equipe", "liderar", "coordenacao de equipe", "lider de equipe", "gestao de pessoa"] },
  { id: "comunicacao", label: "Comunicação", cat: "soft", aliases: ["comunicacao", "boa comunicacao", "oratoria", "apresentacao"] },
  { id: "equipe", label: "Trabalho em Equipe", cat: "soft", aliases: ["trabalho em equipe", "colaboracao", "colaborativo", "espirito de equipe"] },
  { id: "proatividade", label: "Proatividade", cat: "soft", aliases: ["proatividade", "proativo", "iniciativa"] },
  { id: "organizacao", label: "Organização", cat: "soft", aliases: ["organizacao", "organizado", "gestao de tempo", "planejamento"] },
  { id: "resolucao", label: "Resolução de Problemas", cat: "soft", aliases: ["resolucao de problema", "solucao de problema", "pensamento critico", "analitico", "raciocinio logico"] },
  { id: "adaptabilidade", label: "Adaptabilidade", cat: "soft", aliases: ["adaptabilidade", "flexibilidade", "resiliencia"] },
  { id: "empatia", label: "Empatia", cat: "soft", aliases: ["empatia", "escuta ativa", "inteligencia emocional"] },
  { id: "negociacao_soft", label: "Negociação e Persuasão", cat: "soft", aliases: ["persuasao", "poder de negociacao", "habilidade de negociacao"] },

  // Idiomas
  { id: "ingles", label: "Inglês", cat: "idiomas", aliases: ["ingle", "english"] },
  { id: "espanhol", label: "Espanhol", cat: "idiomas", aliases: ["espanhol", "spanish"] },
  { id: "frances", label: "Francês", cat: "idiomas", aliases: ["france", "french"] },

  // Certificações
  { id: "pmp", label: "PMP", cat: "certificacoes", aliases: ["pmp"] },
  { id: "scrum_cert", label: "Certificação Scrum", cat: "certificacoes", aliases: ["scrum master", "csm", "psm", "pspo"] },
  { id: "itil", label: "ITIL", cat: "certificacoes", aliases: ["itil"] },
  { id: "cloud_cert", label: "Certificação Cloud", cat: "certificacoes", aliases: ["aws certified", "azure fundamental", "az 900"] },
  { id: "six_sigma", label: "Six Sigma", cat: "certificacoes", aliases: ["six sigma", "green belt", "black belt"] },
  { id: "crc", label: "CRC", cat: "certificacoes", aliases: ["crc"] },

  // Formação
  { id: "superior_ti", label: "Superior em TI", cat: "formacao", aliases: ["ciencia da computacao", "sistemas de informacao", "analise e desenvolvimento de sistema", "engenharia de software", "engenharia da computacao", "tecnologia da informacao"] },
  { id: "superior_adm", label: "Superior em Administração / Gestão", cat: "formacao", aliases: ["administracao", "gestao empresarial", "processos gerenciai"] },
  { id: "superior_cont", label: "Ciências Contábeis / Economia", cat: "formacao", aliases: ["ciencias contabei", "ciencia contabil", "economia"] },
  { id: "superior", label: "Ensino Superior", cat: "formacao", aliases: ["ensino superior", "superior completo", "graduacao", "bacharelado", "tecnologo", "superior cursando"] },
  { id: "pos", label: "Pós-graduação / MBA", cat: "formacao", aliases: ["pos graduacao", "mba", "especializacao", "mestrado"] },
];

const NORMALIZED_CATALOG = CATALOG.map((c) => ({
  ...c,
  norm: [...new Set(c.aliases.map(normalizeText))].sort((a, b) => b.length - a.length),
}));

const ALIAS_DISPLAY = new Map<string, string>();
for (const c of CATALOG) for (const a of c.aliases) ALIAS_DISPLAY.set(normalizeText(a), a);

// ---------- 2. Filtragem de ruído (seções informativas da vaga) ----------
const NOISE_HEADINGS =
  /(beneficio|oferecemo|remuneracao|salario|local de trabalho|localizacao|endereco|regime|contratacao|modelo de trabalho|horario|sobre a empresa|sobre nos|quem somo|vale)/;
const DESIRABLE_HEADINGS = /(desejavel|diferencia|sera um plus|nice to have|bonus|seria um plus)/;
const MANDATORY_HEADINGS = /(requisito|obrigatorio|exigido|necessario|responsabilidade|atividade|atribuicao|o que voce vai fazer|qualificacao)/;

function isHeading(raw: string) {
  const t = raw.trim();
  return t.length > 0 && t.length < 60 && (/:$/.test(t) || !/[.;]/.test(t)) && t.split(/\s+/).length <= 7;
}

function hasPhrase(text: string, phrase: string) {
  return (" " + text + " ").includes(" " + phrase + " ");
}

function findInText(text: string, aliases: string[]) {
  return aliases.find((a) => hasPhrase(text, a));
}

// ---------- 7. Peso dos requisitos ----------
function extractJobCompetencies(job: string) {
  const found = new Map<string, Requirement>();
  let mode: "obrigatorio" | "desejavel" | "ruido" = "obrigatorio";
  for (const raw of job.split(/\n+/)) {
    const line = normalizeText(raw);
    if (!line) continue;
    if (isHeading(raw)) {
      if (DESIRABLE_HEADINGS.test(line)) { mode = "desejavel"; continue; }
      if (NOISE_HEADINGS.test(line)) { mode = "ruido"; continue; }
      if (MANDATORY_HEADINGS.test(line)) { mode = "obrigatorio"; continue; }
    }
    if (mode === "ruido") continue;
    const lineMode: Requirement =
      mode === "desejavel" || DESIRABLE_HEADINGS.test(line) ? "desejavel" : "obrigatorio";
    for (const c of NORMALIZED_CATALOG) {
      if (!findInText(line, c.norm)) continue;
      const prev = found.get(c.id);
      if (!prev || (prev === "desejavel" && lineMode === "obrigatorio")) found.set(c.id, lineMode);
    }
  }
  return found;
}

// ---------- 6. Avaliação por evidência ----------
type ResumeSection = "experiencia" | "competencias" | "outro";
const EXP_HEADINGS = /(experiencia|historico profissional|trajetoria|atuacao profissional|carreira)/;
const SKILL_HEADINGS = /(habilidade|competencia|conhecimento|skill|ferramenta|tecnologia|qualificacoe)/;

function splitResume(resume: string) {
  const parts: Record<ResumeSection, string[]> = { experiencia: [], competencias: [], outro: [] };
  let section: ResumeSection = "outro";
  for (const raw of resume.split(/\n+/)) {
    const line = normalizeText(raw);
    if (!line) continue;
    if (isHeading(raw)) {
      if (EXP_HEADINGS.test(line)) { section = "experiencia"; continue; }
      if (SKILL_HEADINGS.test(line)) { section = "competencias"; continue; }
      if (/(formacao|educacao|idioma|certifica|curso|resumo|objetivo|contato|dados pessoai)/.test(line)) {
        section = "outro"; continue;
      }
    }
    parts[section].push(line);
  }
  return {
    experiencia: parts.experiencia.join(" \n "),
    competencias: parts.competencias.join(" \n "),
    outro: parts.outro.join(" \n "),
  };
}

function countOccurrences(text: string, aliases: string[]) {
  let n = 0;
  const padded = " " + text + " ";
  for (const a of aliases) n += padded.split(" " + a + " ").length - 1;
  return n;
}

function evaluate(aliases: string[], cat: Cat, sections: ReturnType<typeof splitResume>): { evidence: Evidence; matchedAs?: string } {
  const inExp = findInText(sections.experiencia, aliases);
  const inSkills = findInText(sections.competencias, aliases);
  const inOther = findInText(sections.outro, aliases);
  const matchedAs = inExp ?? inSkills ?? inOther;
  if (!matchedAs) return { evidence: "nao_encontrada" };
  // Idiomas, certificações e formação: estar declarado já é evidência forte
  if (cat === "idiomas" || cat === "certificacoes" || cat === "formacao") return { evidence: "forte", matchedAs };
  if (inExp) return { evidence: "forte", matchedAs };
  if (inSkills) return { evidence: "moderada", matchedAs };
  const all = `${sections.experiencia} ${sections.competencias} ${sections.outro}`;
  return { evidence: countOccurrences(all, aliases) >= 2 ? "moderada" : "fraca", matchedAs };
}

const EVIDENCE_FACTOR: Record<Evidence, number> = { forte: 1, moderada: 0.75, fraca: 0.4, nao_encontrada: 0 };
const REQUIREMENT_WEIGHT: Record<Requirement, number> = { obrigatorio: 1, desejavel: 0.5 };
const CAT_ORDER: Cat[] = ["cargo", "hard", "ferramentas", "soft", "idiomas", "certificacoes", "formacao"];

export function analyze(resume: string, job: string): AnalysisResult {
  const jobComps = extractJobCompetencies(job);
  const sections = splitResume(resume);

  const byCat = new Map<Cat, CompetencyItem[]>();
  // remove redundância: se "Power BI" (ferramenta) e "BI" (hard) aparecem, ambos ficam — são níveis diferentes
  for (const c of NORMALIZED_CATALOG) {
    const req = jobComps.get(c.id);
    if (!req) continue;
    const { evidence, matchedAs } = evaluate(c.norm, c.cat, sections);
    if (!byCat.has(c.cat)) byCat.set(c.cat, []);
    byCat.get(c.cat)!.push({ id: c.id, label: c.label, requirement: req, evidence, matchedAs: matchedAs && (ALIAS_DISPLAY.get(matchedAs) ?? matchedAs) });
  }

  let wSum = 0;
  let wGot = 0;
  const categories: CategoryResult[] = CAT_ORDER.filter((c) => byCat.has(c)).map((cat) => {
    const items = byCat.get(cat)!.sort((a, b) =>
      a.requirement === b.requirement ? 0 : a.requirement === "obrigatorio" ? -1 : 1
    );
    let cw = 0;
    let cg = 0;
    for (const i of items) {
      const w = REQUIREMENT_WEIGHT[i.requirement];
      cw += w;
      cg += w * EVIDENCE_FACTOR[i.evidence];
    }
    wSum += cw;
    wGot += cg;
    return {
      id: cat,
      label: CATEGORY_LABELS[cat],
      items,
      found: items.filter((i) => i.evidence !== "nao_encontrada").length,
      total: items.length,
      score: Math.round((cg / cw) * 100),
    };
  });

  const all = categories.flatMap((c) => c.items);
  return {
    score: wSum === 0 ? 0 : Math.round((wGot / wSum) * 100),
    categories,
    totalFound: all.filter((i) => i.evidence !== "nao_encontrada").length,
    totalCompetencies: all.length,
    mandatoryMissing: all
      .filter((i) => i.requirement === "obrigatorio" && i.evidence === "nao_encontrada")
      .map((i) => i.label),
  };
}
