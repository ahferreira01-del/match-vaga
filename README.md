# MatchVaga 🔎📄

Analisador de compatibilidade entre **currículo × vaga**, 100% gratuito e sem cadastro.
Cole seu currículo e a descrição da vaga e receba em segundos um percentual de compatibilidade, pontos fortes e lacunas a preencher.

🔗 **App publicado:** https://match-vaga.lovable.app

## Como funciona

1. **Cole o currículo** — digite o texto ou envie um arquivo **PDF/DOCX** (a extração acontece no navegador).
2. **Cole o link da vaga** — a importação do texto é **automática** ao colar a URL (ou cole a descrição manualmente).
3. **Clique em "Analisar compatibilidade"** e receba o relatório completo.

> 🔒 Tudo roda no seu navegador — nada é enviado ou armazenado em servidores.

## O que a análise mostra

- **Score de compatibilidade** (0–100%) com anel visual e classificação (alta / moderada / baixa).
- **Compatibilidade de cargo** — compara o cargo do currículo com o da vaga.
- **Compatibilidade de senioridade** — estima anos de experiência de ambos os lados.
- **Como o score foi calculado** — transparência total: pesos de cada parte (competências, cargo, senioridade).
- **Gap Analysis** — competências não encontradas e as que têm pouca evidência, separadas por requisito **obrigatório** e **desejável**.
- **Tabela por categoria** — competências, ferramentas, soft skills, idiomas, certificações e formação, com nível de evidência:
  - ✅ **Forte** — comprovada na experiência profissional
  - 🟡 **Moderada** — citada só na lista de competências
  - 🟠 **Fraca** — evidência indireta
  - ❌ **Não encontrada**
- **Currículo ATS otimizado** — versão reescrita do currículo alinhada à vaga, com comparação antes/depois, sugestões de melhoria e exportação em **texto, PDF e DOCX**.

## Regras de pontuação

- Requisitos **obrigatórios valem o dobro** dos desejáveis.
- Evidência forte vale 100%, moderada 75% e fraca 40%.
- O score final é a média ponderada entre competências (peso maior), cargo e senioridade.

## Tecnologias

- [TanStack Start](https://tanstack.com/start) (React 19 + Vite)
- TypeScript
- Tailwind CSS v4
- `pdfjs-dist` e `mammoth` para extração de texto de PDF/DOCX
- Análise 100% client-side, sem envio de dados

## Rodando localmente

```sh
git clone <este-repositório>
cd match-vaga
npm i
npm run dev
```

Abra `http://localhost:8080` no navegador.

## Sobre

Feito para ajudar você a se candidatar melhor — descobrindo, antes de se candidatar, o quanto seu currículo realmente combina com a vaga.
