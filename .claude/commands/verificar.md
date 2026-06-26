---
description: Auditoria completa de integridade do Sorteio EcoUrbis — verifica RNG, XSS, deduplicação, acessibilidade e localStorage
---

Faça uma auditoria de integridade completa do projeto Sorteio EcoUrbis localizado no diretório atual. Leia os arquivos `js/app.js`, `index.html` e `css/style.css` e verifique cada item abaixo. Reporte PASS ✓ ou FAIL ✗ para cada um.

## 1. INTEGRIDADE DO RNG CRIPTOGRÁFICO (crítico)

Verifique em `js/app.js`:
- A função `inteiroSeguro` usa `crypto.getRandomValues` (não `Math.random`)
- O rejection sampling está correto: calcula `limite = floor(0xFFFFFFFF / max) * max` e rejeita valores `>= limite`
- A função `escolher(lista)` chama `inteiroSeguro(lista.length)` — sem offset, sem módulo direto
- Nenhuma outra função de aleatoriedade (`Math.random`, `Date.now() % n`) é usada no sorteio

## 2. PROTEÇÃO XSS (crítico)

Verifique em `js/app.js`:
- Toda atribuição a `.innerHTML` usa a função `esc()` para envolver strings vindas do estado/usuário
- A função `esc()` sanitiza todos os 5 caracteres perigosos: `&`, `<`, `>`, `"`, `'`
- `jNome.textContent` e `jMeta.textContent` usam `textContent` (seguro), não innerHTML
- `$('#confirmador-msg').innerHTML` usa `esc()` nos valores interpolados
- Nenhum `eval()`, `new Function()`, ou `document.write()` presente

## 3. DEDUPLICAÇÃO DE GANHADORES (crítico)

Verifique em `js/app.js`:
- A função `idsGanhadores()` retorna um `Set` dos IDs dos ganhadores confirmados
- A função `elegiveis()` filtra `estado.participantes` excluindo IDs do set
- O pool passado para `escolher()` é sempre `elegiveis()`, nunca `estado.participantes` diretamente
- Ao confirmar ganhador (`confirmarGanhador`), o participante é adicionado a `estado.ganhadores` com `{participante, brinde, ts}`

## 4. ESQUEMA DO LOCALSTORAGE

Verifique em `js/app.js`:
- A função `carregar()` valida que `participantes`, `brindes` e `ganhadores` são arrays antes de retornar
- Se a validação falhar, remove o item corrompido com `localStorage.removeItem(CHAVE)` e seta `dadosCorruptos = true`
- A chave usada é `'ecourbis_sorteio_v1'` (constante `CHAVE`)

## 5. ACESSIBILIDADE

Verifique em `index.html`:
- Todos os botões interativos têm `aria-label` ou texto visível
- O jumbotron tem `aria-live="polite"`
- Os botões de tipo de brinde têm `role="radiogroup"` no wrapper e `aria-pressed` em cada botão
- O dropzone tem `role="button"` e `tabindex="0"`
- O canvas do confete tem `aria-hidden="true"`

## 6. FUNÇÕES LIGADAS NO DOM

Verifique se todos os IDs referenciados no JS existem no HTML:
- `#btn-sortear`, `#btn-confirmar`, `#btn-resortear`
- `#export-csv`, `#export-xlsx`, `#desfazer-ultimo`, `#limpar-tudo`
- `#busca-ganhador`, `#seletor-brinde`
- `#confirmador`, `#confirmador-sim`, `#confirmador-nao`, `#confirmador-msg`
- `#toast`, `#salvo-indicator`
- `#qtd-elegiveis`, `#qtd-ganhou`, `#qtd-total`

## 7. ATALHO DE TECLADO

Verifique em `js/app.js`:
- Existe um listener `keydown` que verifica `e.key === ' '`
- O listener NÃO dispara quando o foco está em `input`, `select`, `textarea` ou `button`
- Só dispara quando `tela-sorteio` está ativa e `btnSortear` não está oculto/desabilitado

## RELATÓRIO FINAL

Apresente os resultados em uma tabela com colunas: Categoria | Status | Detalhe.
Se encontrar algum FAIL, explique o problema e sugira a correção exata (linha e código).
Se tudo passar, confirme que o projeto está íntegro e pronto para uso em evento ao vivo.
