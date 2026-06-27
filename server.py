"""
Servidor de autenticação do Sorteio Copa EcoUrbis.

Protege a SPA estática com uma senha única antes de liberar o acesso.
Mesmo padrão usado em condominio-saas e inventario-qr: passlib (pbkdf2_sha256)
para o hash da senha, python-jose para o JWT, e bloqueio por tentativas
(força bruta) com janela deslizante em memória. pbkdf2_sha256 é puro Python
(sem dependência de binário nativo), evitando o bug de compatibilidade entre
passlib e versões recentes do pacote bcrypt.

A SPA em si (index.html / js/app.js) continua 100% client-side e sem
nenhuma chamada de rede — este servidor só entrega os arquivos depois
de validar a senha. Os dados dos participantes nunca passam por aqui.

Uso local (com senha, como vai rodar no Render):
    pip install -r requirements.txt
    python gerar_hash.py                 # gera o ADMIN_PASSWORD_HASH
    set ADMIN_PASSWORD_HASH=<hash gerado>
    uvicorn server:app --reload

Uso local sem senha (operador no próprio computador, sem servidor):
    Apenas abra index.html direto no navegador — continua funcionando.
"""
import os
import time
import secrets
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError

BASE_DIR = Path(__file__).resolve().parent

SECRET_KEY = (os.getenv("SECRET_KEY") or "dev-" + secrets.token_hex(16)).strip()
# .strip() defende contra espaço/quebra de linha colados por acidente no painel do Render
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "").strip()
APP_ENV = os.getenv("APP_ENV", "development").strip()
ALGORITHM = "HS256"
TOKEN_EXPIRE_HORAS = int(os.getenv("TOKEN_EXPIRE_HORAS", "12"))
COOKIE_NAME = "sorteio_token"

if APP_ENV == "production" and not ADMIN_PASSWORD_HASH:
    raise RuntimeError(
        "ADMIN_PASSWORD_HASH não definido em produção. "
        "Gere com: python gerar_hash.py"
    )

# Diagnóstico no log de start — nunca expõe a senha/hash, só formato e tamanho.
# Útil pra confirmar que a env var chegou íntegra sem precisar revelar o valor.
print(
    f"[auth] ADMIN_PASSWORD_HASH: {len(ADMIN_PASSWORD_HASH)} chars, "
    f"prefixo={'$pbkdf2-sha256$' if ADMIN_PASSWORD_HASH.startswith('$pbkdf2-sha256$') else 'INESPERADO'}"
)

pwd_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
app = FastAPI(title="Sorteio EcoUrbis — Auth Gate")

# ============================================================
# Proteção contra força bruta — mesma janela deslizante usada
# em condominio-saas/app/auth.py e inventario-qr/backend/app/auth.py
# ============================================================
_MAX_TENTATIVAS = 5
_JANELA_SEG = 60
_BLOQUEIO_SEG = 300

_falhas: dict[str, list[float]] = defaultdict(list)
_bloqueados: dict[str, float] = {}


def _verificar_bloqueio(ip: str) -> None:
    agora = time.monotonic()
    bloqueado_ate = _bloqueados.get(ip)
    if bloqueado_ate and agora < bloqueado_ate:
        restante = int(bloqueado_ate - agora)
        raise HTTPException(
            status_code=429,
            detail=f"Muitas tentativas incorretas. Aguarde {restante} segundos.",
            headers={"Retry-After": str(restante)},
        )
    if bloqueado_ate and agora >= bloqueado_ate:
        del _bloqueados[ip]


def _registrar_falha(ip: str) -> None:
    agora = time.monotonic()
    _falhas[ip] = [t for t in _falhas[ip] if agora - t < _JANELA_SEG]
    _falhas[ip].append(agora)
    if len(_falhas[ip]) >= _MAX_TENTATIVAS:
        _bloqueados[ip] = agora + _BLOQUEIO_SEG
        _falhas[ip].clear()


def _registrar_sucesso(ip: str) -> None:
    _falhas.pop(ip, None)


# ============================================================
# JWT
# ============================================================
def criar_token() -> str:
    payload = {
        "sub": "operador",
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HORAS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def token_valido(token: str | None) -> bool:
    if not token:
        return False
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return True
    except JWTError:
        return False


# ============================================================
# Middleware — protege só a entrada da SPA ("/" e "/index.html").
# CSS/JS/assets ficam liberados (não contêm dados de participantes;
# o import da planilha acontece só depois do login, no navegador).
# ============================================================
ROTAS_PROTEGIDAS = {"/", "/index.html"}


@app.middleware("http")
async def auth_gate(request: Request, call_next):
    if request.url.path in ROTAS_PROTEGIDAS:
        token = request.cookies.get(COOKIE_NAME)
        if not token_valido(token):
            return RedirectResponse(url="/login.html", status_code=302)
    return await call_next(request)


# ============================================================
# Login
# ============================================================
class LoginInput(BaseModel):
    senha: str


@app.get("/login.html")
def pagina_login():
    return FileResponse(BASE_DIR / "login.html")


@app.post("/login")
def login(payload: LoginInput, request: Request):
    ip = request.client.host if request.client else "desconhecido"
    _verificar_bloqueio(ip)

    if not ADMIN_PASSWORD_HASH or not pwd_ctx.verify(payload.senha, ADMIN_PASSWORD_HASH):
        _registrar_falha(ip)
        raise HTTPException(status_code=401, detail="Senha incorreta.")

    _registrar_sucesso(ip)
    token = criar_token()
    resp = JSONResponse({"ok": True})
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=APP_ENV == "production",
        max_age=TOKEN_EXPIRE_HORAS * 3600,
    )
    return resp


@app.get("/logout")
def logout():
    resp = RedirectResponse(url="/login.html")
    resp.delete_cookie(COOKIE_NAME)
    return resp


# ============================================================
# Arquivos estáticos da SPA — montado por último (menor prioridade)
# ============================================================
app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="static")
