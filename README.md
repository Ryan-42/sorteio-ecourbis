# Sorteio Copa · EcoUrbis

Sistema interno de sorteio de brindes da Copa do Mundo para o RH da **EcoUrbis Ambiental**.
Roda 100% no navegador — **sem servidor, sem internet, sem anúncios**. Os dados dos
funcionários nunca saem do computador (importante para a LGPD).

---

## Como abrir

**Opção 1 — Live Server (VS Code)**
1. Abra a pasta `sorteio-ecourbis` no VS Code.
2. Clique direito em `index.html` → **Open with Live Server**.

**Opção 2 — Direto no navegador**
- Dê dois cliques em `index.html`. Funciona offline em Chrome, Edge ou Firefox.

> A planilha é lida pela biblioteca SheetJS, que já está embarcada em `vendor/` —
> nada é baixado da internet em tempo de uso.

---

## Fluxo de uso (4 passos)

1. **Importar** — arraste a planilha de participantes (`.xlsx` ou `.csv`).
2. **Brindes** — cadastre o que será sorteado (bola, camisa) e a **moto** como prêmio final.
3. **Sorteio** — escolha o brinde, clique em **Sortear**, o placar revela o ganhador.
4. **Ganhadores** — registro completo com data/hora. Exporte em CSV para o RH.

---

## Formato da planilha

A primeira aba precisa ter as colunas **Nome**, **Matrícula** e **Função**
(a acentuação e maiúsculas não importam — o sistema reconhece variações).

| Nome                  | Matrícula | Função      |
|-----------------------|-----------|-------------|
| João da Silva Santos  | 4821      | Coletor     |
| Maria Aparecida Souza | 3910      | Auxiliar    |

Use o arquivo **`modelo-planilha.xlsx`** como base. Matrículas repetidas são
ignoradas automaticamente (evita sortear a mesma pessoa duas vezes por erro de cadastro).

---

## Regras do sorteio

- **Sem reposição:** quem é confirmado como ganhador sai do pool e não pode ganhar de novo.
- **Sorteio justo e auditável:** o ganhador é escolhido por gerador de números
  criptográfico (`crypto.getRandomValues`), não pelo `Math.random` comum.
- **Moto = prêmio final:** tem destaque dourado, suspense maior e uma confirmação
  extra antes de entrar no registro oficial.
- **Registro completo:** cada sorteio fica salvo com data e hora, exportável em CSV
  (com acentuação correta no Excel).

O estado fica salvo no navegador — se a página recarregar no meio do evento,
nada se perde. Para recomeçar do zero, use **Reiniciar sorteio** na tela de Ganhadores.

---

## Estrutura

```
sorteio-ecourbis/
├── index.html              página única (4 telas)
├── css/style.css           tema "estádio EcoUrbis"
├── js/app.js               lógica: import, sorteio, confete, export
├── vendor/xlsx.full.min.js leitor de planilha (offline)
├── assets/
│   ├── logo-branco.png     logo p/ fundo escuro
│   ├── logo-cor.png        logo colorido
│   └── fonts/              Anton + Oswald (offline)
├── modelo-planilha.xlsx    modelo p/ o RH
└── README.md
```

Feito em HTML/CSS/JS puro, sem frameworks e sem dependências de runtime.
