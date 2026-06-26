---
description: Gera uma planilha CSV de teste com participantes fictícios para testar o sorteio (uso: /gerar-dados 50)
---

Gere um arquivo CSV de teste com participantes fictícios para o Sorteio EcoUrbis.

## Instruções

O argumento passado ao comando é a quantidade de participantes desejada. Se não for informado, use 30.

Quantidade solicitada: $ARGUMENTS

## Regras para geração dos dados

**Nomes:** Use nomes brasileiros completos realistas (2 a 3 nomes). Misture nomes masculinos e femininos em proporção aproximada de 55%/45%. Use sobrenomes comuns brasileiros.

**Matrículas:** Números sequenciais de 4 dígitos começando em 1001. Não repita matrículas.

**Funções:** Use apenas funções condizentes com uma empresa de limpeza urbana (EcoUrbis Ambiental faz coleta de lixo e limpeza de vias). Use estas funções com as proporções aproximadas:
- Coletor de Resíduos (30%)
- Motorista de Compactador (15%)
- Gari (20%)
- Auxiliar de Serviços (15%)
- Operador de Varrição (10%)
- Fiscal de Campo (5%)
- Encarregado de Turno (3%)
- Mecânico (2%)

## Formato do arquivo

Crie o arquivo em `teste-participantes.csv` na raiz do projeto (`c:\Users\ryanm\OneDrive\Desktop\sorteio-ecourbis\`).

Formato CSV com separador ponto-e-vírgula (`;`) e BOM UTF-8 para compatibilidade com Excel pt-BR:

```
Nome;Matrícula;Função
João da Silva Santos;1001;Coletor de Resíduos
Maria Aparecida Souza;1002;Motorista de Compactador
...
```

## Após criar o arquivo

Informe:
1. Caminho completo do arquivo criado
2. Quantidade de participantes gerados
3. Distribuição de funções (contagem por função)
4. Como importar no sorteio: "Abra o sorteio, vá em Importar e arraste o arquivo `teste-participantes.csv`"

O arquivo deve estar pronto para ser arrastado diretamente na dropzone do sorteio.
