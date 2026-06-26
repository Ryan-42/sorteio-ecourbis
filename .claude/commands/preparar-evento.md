---
description: Checklist completo de preparação para usar o sorteio em evento ao vivo — verifica arquivos, estado salvo e cria roteiro de operação
---

Prepare o Sorteio EcoUrbis para uso em evento ao vivo. Analise o projeto e gere um guia de operação completo.

Leia o arquivo `js/app.js` para entender o fluxo e o estado atual.

---

## PASSO 1 — VERIFICAÇÃO DOS ARQUIVOS

Confirme que os seguintes arquivos existem e não estão vazios:

| Arquivo | Obrigatório |
|---------|-------------|
| `index.html` | Sim |
| `css/style.css` | Sim |
| `js/app.js` | Sim |
| `vendor/xlsx.full.min.js` | Sim |
| `assets/logo-branco.png` | Sim |
| `assets/fonts/anton.woff2` | Sim |
| `assets/fonts/oswald.woff2` | Sim |
| `modelo-planilha.xlsx` | Recomendado |

Reporte qualquer arquivo ausente como bloqueante.

---

## PASSO 2 — ROTEIRO DE OPERAÇÃO

Crie um roteiro passo a passo para o operador do evento, em linguagem simples (não técnica). O roteiro deve cobrir:

### Antes do evento (1 dia antes)
1. Como abrir o sorteio
2. Como importar a planilha de participantes e verificar que o número está correto
3. Como cadastrar os brindes na ordem correta (bolas → camisas → moto por último)
4. Como verificar que o estado foi salvo (indicador "✓ Salvo")
5. Como fechar e reabrir sem perder dados (teste de persistência)

### No dia do evento (30 min antes)
1. Abrir o sorteio e verificar participantes/brindes carregados
2. Testar o som do ambiente (confete/animação funcionam na TV/projetor)
3. Deixar o navegador em tela cheia (F11)
4. Ter o modelo-planilha.xlsx de backup caso precisem importar novamente

### Durante o evento
1. Como selecionar o brinde a sortear
2. Como iniciar o sorteio (clique no botão ou tecla Espaço)
3. O que fazer se o sorteio precisar ser refeito (botão "Sortear de novo")
4. Como confirmar o ganhador
5. Como desfazer um sorteio acidental (botão "↩ Desfazer último")
6. Como sortear a moto (prêmio final — explica a contagem 3-2-1)

### Após o evento
1. Ir para a tela Ganhadores
2. Exportar XLSX para o RH
3. Exportar CSV como backup
4. O que NÃO fazer: não fechar sem exportar

---

## PASSO 3 — PLANO DE CONTINGÊNCIA

Documente respostas para cada cenário de falha:

| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| Planilha não importa | Coluna "Nome" com nome diferente | |
| Sorteio não inicia | Todos já foram premiados ou nenhum brinde selecionado | |
| Página recarregou | Acidente | |
| Ganhador errado confirmado | Erro humano | |
| Computador travou | Hardware | |

Preencha a coluna "Solução" com instruções claras baseadas no código real do projeto.

---

## PASSO 4 — DICAS DE APRESENTAÇÃO

Com base no design do projeto (tema "estádio à noite", animações, confete):

- Resolução recomendada para projeção
- Navegador recomendado (Chrome/Edge vs Firefox)
- Como garantir que as animações de confete funcionem na TV
- Sugestão de ordem dos brindes para máximo impacto dramático

---

## RESULTADO ESPERADO

Gere o roteiro formatado em Markdown, pronto para ser impresso ou enviado por WhatsApp ao operador do evento. Termine com: **"✅ Sistema pronto para o evento"** ou **"⚠️ Ação necessária antes do evento"** com lista de pendências.
