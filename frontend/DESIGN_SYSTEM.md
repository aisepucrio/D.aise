# Design System - D.aise (Documentação de Repositórios)

Este documento define os padrões visuais e componentes base da interface. 

## 1. Cores (Color Palette)

O tema é estritamente **Dark Mode** com escala “deep” (fundo e superfícies bem fechados), para contraste elegante e legível.

- **Background Principal (App):** Quase preto. Tokens: `bg-background-app` → `#050505`. Para áreas que devam colar no preto absoluto, `bg-black` é aceitável.
- **Background de Cards / Painéis:** Cinza muito fechado, um degrau acima do app. Use **`bg-surface-card`** → `#121214`.
- **Background de Inputs:** Ainda mais profundo no mesmo grupo cromático. Use **`bg-surface-input`** (preto com ~55% de opacidade sobre o contexto) ou `bg-black/50` onde fizer sentido.
- **Cor Primária (Brand/Accent):** Verde Neon vibrante. Use `#22c55e` (green-500) ou `#10b981` (emerald-500) para botões principais, logo, ícones ativos e barras de progresso.
- **Texto Principal:** Branco ou quase branco (`text-zinc-100`).
- **Texto Secundário (Muted):** Cinza claro para descrições e placeholders (`text-zinc-400`).
- **Bordas (Stroke):** Sutis. Preferir **`border-stroke`** → `#1f1f22` para separação clara sem “clarear” o UI. Para ainda mais leve, `border-white/5` ou **`border-stroke-subtle`**.

> **Na prática no código:** `bg-background-app`, `bg-surface-card`, `border-stroke` e `ring-white/5` no `tailwind.config.ts`.

## 2. Tipografia

- **Família:** Fonte Sans-serif limpa e moderna (Inter, Geist ou padrão do sistema).
- **Títulos (Headings):** Fontes mais pesadas (`font-bold` ou `font-semibold`), cor branca, tracking levemente ajustado (`tracking-tight`).
- **Textos e Labels:** Peso normal (`font-normal` ou `font-medium`), tamanhos legíveis (`text-sm` para a maioria dos painéis, `text-base` para leitura longa).
- **Código/Paths:** Quando mostrar caminhos de ficheiros (ex: `~/developer/projects...`) ou nomes de ficheiros (`index.ts`), usar fonte monoespaçada (`font-mono`) e cor verde ou cinza claro.

## 3. Espaçamentos e Layout

- **Gaps e Paddings:** Padrão espaçoso e arejado. Use `gap-4`, `gap-6`, `p-6` para áreas internas de cards.
- **Arredondamento (Border Radius):** - Cards e Paineis: Arredondamento médio/grande (`rounded-xl` ou `rounded-2xl`).
  - Botões e Inputs: Arredondamento médio (`rounded-lg` ou `rounded-md`).
- **Sombras (Shadows):** Sombras bem sutis ou "Glow" (brilho) verde muito suave ao redor de elementos em destaque (como o card principal da tela de início).

## 4. Componentes Base

### Cards
Use **`bg-surface-card`**, borda com **`border border-stroke`** (ou `ring-1 ring-white/5` se precisar de contorno ainda mais leve), `rounded-xl` e `p-6`. Evite `bg-zinc-900` / `#18181b` para cards novos — prefira o token `surface-card`.

### Botões
- **Primary Button:** Fundo verde neon (`bg-green-500`), texto escuro/preto (`text-black font-semibold`), sem borda, hover levemente mais claro. Ex: "Select Project", "Start Analysis".
- **Secondary Button:** Fundo transparente ou camada muito escura (`bg-zinc-800/50`), borda sutil (`border-stroke` ou `border-zinc-800/50`), texto branco, hover preenchendo o fundo. Ex: "Create README", "Update README".

### Inputs
- Fundo escuro (`bg-surface-input` ou `bg-black/50`), borda sutil com **`border-stroke`**, texto branco. Quando em `focus`, a borda deve ficar verde neon (`focus:ring-1 focus:ring-green-500 focus:border-green-500`).

### Sidebar & Navegação
- Sidebar fixa na esquerda, com lista de links.
- Item ativo na Sidebar: Ícone e texto em verde neon.
- Item inativo: Ícone e texto em cinza (`text-zinc-400`), mudando para branco no hover.
