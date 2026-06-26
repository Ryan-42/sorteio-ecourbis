---
description: Auditoria de segurança e conformidade LGPD do Sorteio EcoUrbis — analisa vetores XSS, vazamento de dados e integridade do sorteio
---

Realize uma auditoria de segurança e conformidade LGPD completa do projeto Sorteio EcoUrbis.

Leia os arquivos `js/app.js`, `index.html` e `css/style.css` antes de começar.

---

## PARTE 1 — VETORES DE ATAQUE XSS

Analise cada ponto onde dados externos entram no sistema:

### 1.1 Dados da planilha → DOM
Verifique cada lugar onde `p.nome`, `p.matricula`, `p.funcao`, `b.nome` são inseridos no DOM.
- Uso de `.innerHTML` sem `esc()` = **CRÍTICO**
- Uso de `.textContent` = seguro
- Reportar linha e contexto de cada ocorrência

### 1.2 Mensagens de confirmação
O diálogo usa `innerHTML` para renderizar o nome do ganhador. Verificar que `esc()` é chamado antes de interpolar qualquer dado de usuário.

### 1.3 SheetJS como vetor
O SheetJS processa arquivos `.xlsx` enviados pelo usuário. Verificar:
- O resultado de `sheet_to_json` produz strings que passam por `esc()` antes de ir ao DOM
- Não há `eval()` de conteúdo da planilha
- O `reader.onerror` está tratado

---

## PARTE 2 — CONFORMIDADE LGPD

O README afirma que "dados dos funcionários nunca saem do computador". Verifique:

### 2.1 Requisições de rede
Confirme que NÃO existe nenhum:
- `fetch()`, `XMLHttpRequest`, `navigator.sendBeacon()`
- `<script src="...">` apontando para CDN externo
- `<link href="...">` para fontes externas (Google Fonts etc.)
- `<img src="...">` com URL externa
- WebSocket, EventSource

### 2.2 localStorage
- Os dados salvos em `ecourbis_sorteio_v1` contêm nomes e matrículas de funcionários
- Verificar se há risco de outro script da mesma origem acessar esses dados
- Como o app roda como `file://` local, o risco é mínimo — confirmar isso

### 2.3 Persistência além do localStorage
- Confirmar que não há cookies sendo criados
- Confirmar que não há IndexedDB ou sessionStorage em uso

---

## PARTE 3 — INTEGRIDADE DO SORTEIO

### 3.1 Impossibilidade de manipulação
- O ganhador é decidido ANTES da animação começar — verificar isso na função `iniciarSorteio`
- A animação exibe nomes aleatórios do pool, mas o resultado já foi definido pelo crypto RNG
- Não é possível influenciar o resultado pela velocidade de clique ou timing

### 3.2 Auditabilidade
- Cada ganhador tem timestamp (`ts: Date.now()`) — isso é auditável
- O export CSV/XLSX inclui data e hora de cada sorteio
- Não há forma de apagar ganhadores individuais sem deixar rastro (só "Reiniciar tudo")

### 3.3 Ataques de engenharia social
- A "Confirmação" da moto é a única ação que requer interação dupla
- Sem essa confirmação, nenhum ganhador é registrado mesmo após o reveal

---

## PARTE 4 — DEPENDÊNCIAS

### 4.1 SheetJS
- Verificar a versão do `xlsx.full.min.js` em `vendor/`
- Confirmar que é carregado localmente, não de CDN
- Alertar se houver versão conhecidamente vulnerável

### 4.2 Fontes e assets
- Confirmar que `Anton.woff2` e `Oswald.woff2` estão em `assets/fonts/`
- Confirmar que os logos estão em `assets/`

---

## RELATÓRIO FINAL

Estruture o relatório em:

### Crítico (requer ação imediata)
### Alto (corrigir antes do evento)
### Médio (melhorar quando possível)
### Info (observações sem risco)
### Aprovado (itens verificados e ok)

Termine com uma conclusão: **"APROVADO para uso em evento ao vivo"** ou **"REQUER CORREÇÃO antes do uso"** com a lista de itens bloqueantes.
