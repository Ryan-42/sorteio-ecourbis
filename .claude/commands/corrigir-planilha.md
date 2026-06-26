---
description: Diagnostica por que uma planilha não está importando e gera versão corrigida em CSV — uso: /corrigir-planilha caminho/arquivo.xlsx
---

O usuário está tendo problemas para importar uma planilha no Sorteio EcoUrbis.

Arquivo informado: $ARGUMENTS

---

## DIAGNÓSTICO

Tente ler o arquivo informado. Se não conseguir ler diretamente, peça ao usuário que cole o conteúdo ou descreva os cabeçalhos da planilha.

### Verificações a fazer:

**1. Cabeçalhos**
O sistema procura as colunas usando correspondência fuzzy (sem acento, minúsculo). Verifique se existe alguma coluna que corresponda a:
- "Nome" → aceita: nome, NOME, Nome Completo, etc.
- "Matrícula" → aceita: matricula, matrícula, registro, re, RE
- "Função" → aceita: funcao, função, cargo, setor

Se os cabeçalhos são muito diferentes (ex.: "Employee Name", "ID", "Role"), documente isso.

**2. Estrutura**
- A planilha tem mais de uma aba? O sistema lê APENAS a primeira aba.
- Os dados começam na linha 1 (cabeçalho) e linha 2 em diante?
- Há linhas mescladas? Isso quebra o SheetJS.
- Há colunas ocultas ou planilha protegida?

**3. Encoding**
- Arquivos `.csv` precisam estar em UTF-8 ou Latin-1 para funcionar
- Arquivos `.xlsx` com proteção por senha falham com erro específico

**4. Matrículas duplicadas**
- Matrículas repetidas são silenciosamente removidas (deduplicação por ID)
- Se muitos nomes "desapareceram", pode ser isso

---

## SOLUÇÃO

Com base no diagnóstico, faça uma das seguintes ações:

### Opção A — Gerar CSV corrigido
Se conseguiu ler os dados mas os cabeçalhos estão errados, gere um arquivo `participantes-corrigido.csv` no diretório do projeto com:
- Cabeçalho exato: `Nome;Matrícula;Função`
- BOM UTF-8 no início (`﻿`)
- Separador ponto-e-vírgula
- Dados preservados da planilha original

### Opção B — Instruções de correção manual
Se não conseguiu ler o arquivo, gere instruções específicas para o usuário corrigir no Excel:
1. Qual célula renomear
2. Como salvar como CSV UTF-8 no Excel

### Opção C — Novo arquivo de modelo
Se o arquivo está muito corrompido, gere um CSV de modelo vazio pronto para preenchimento:

```
Nome;Matrícula;Função
(Preencha aqui)
```

---

## RESPOSTA FINAL

Termine com:
- **Causa raiz** do problema (uma frase)
- **Arquivo gerado** (caminho completo) ou **instruções** (passo a passo)
- **Como testar**: "Arraste o arquivo `participantes-corrigido.csv` na tela Importar do sorteio"
