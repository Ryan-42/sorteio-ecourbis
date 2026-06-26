# Sorteio Copa · EcoUrbis — Claude Code Context

Sistema interno de sorteio de brindes para eventos ao vivo da EcoUrbis Ambiental.
SPA offline: HTML + CSS + Vanilla JS. Sem build, sem npm, sem framework.

## Stack

- `index.html` — estrutura única (4 telas: Importar → Brindes → Sorteio → Ganhadores)
- `css/style.css` — tema "estádio à noite" (azul + verde + ouro)
- `js/app.js` — toda a lógica (estado, RNG, animações, export)
- `vendor/xlsx.full.min.js` — SheetJS embarcado (offline, não atualizar sem testar)
- `assets/` — logos e fontes Anton + Oswald (todas locais, sem CDN)

## Invariantes críticas — NUNCA violar

1. **RNG**: `inteiroSeguro()` usa `crypto.getRandomValues` com rejection sampling. Não substituir por `Math.random`.
2. **XSS**: Todo `.innerHTML` com dados do estado usa `esc()`. Novos usos sem `esc()` = bug crítico.
3. **Deduplicação**: O pool do sorteio é sempre `elegiveis()` (filtra ganhadores confirmados). Nunca usar `estado.participantes` diretamente no sorteio.
4. **LGPD**: Sem `fetch()`, sem requisições externas, sem CDN. Dados ficam só no `localStorage`.

## localStorage

Chave: `ecourbis_sorteio_v1`  
Schema: `{ participantes: [{id, nome, matricula, funcao}], brindes: [{id, tipo, nome, qtd, sorteados}], ganhadores: [{participante, brinde:{tipo,nome}, ts}] }`

## Contexto de uso

Evento ao vivo com telão. Operador não-técnico. Bugs são visíveis para a audiência.
Prioridade: estabilidade e clareza > features novas.

## Comandos disponíveis

- `/verificar` — auditoria completa de integridade (RNG, XSS, dedup, acessibilidade)
- `/gerar-dados [N]` — gera CSV de teste com N participantes fictícios da EcoUrbis
- `/auditoria-seguranca` — auditoria de segurança e conformidade LGPD
- `/preparar-evento` — checklist e roteiro de operação para evento ao vivo
- `/corrigir-planilha [arquivo]` — diagnostica e corrige planilhas que não importam

## Agentes disponíveis

- `guardian` — revisor de código crítico (RNG, XSS, dedup) — acionar antes de qualquer mudança em `app.js`
- `planilha-maker` — gerador de dados de teste realistas
- `ux-evento` — avalia mudanças de UI no contexto de evento ao vivo com telão

## O que não fazer

- Não adicionar dependências externas (quebra o requisito offline/LGPD)
- Não usar `Math.random()` para nada relacionado ao sorteio
- Não usar `.innerHTML` sem `esc()` para dados do usuário
- Não remover o indicador `✓ Salvo` (o operador precisa de confirmação visual)
- Não tornar a confirmação da moto opcional (é a salvaguarda contra erro em evento)
