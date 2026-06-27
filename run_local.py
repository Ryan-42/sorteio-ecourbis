"""
Launcher de teste local — le .env (sem nunca exibir o conteudo no terminal)
e inicia o servidor acessivel na rede local (0.0.0.0).

Uso: .venv/Scripts/python.exe run_local.py
"""
import os
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    for linha in env_path.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        os.environ[chave.strip()] = valor.strip()

import uvicorn  # noqa: E402

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
