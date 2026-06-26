"""
Gera o hash pbkdf2_sha256 da senha de acesso do Sorteio EcoUrbis.

O hash gerado deve ser definido como variável de ambiente ADMIN_PASSWORD_HASH
no Render (Dashboard -> seu serviço -> Environment -> Add Environment Variable).
Nunca commitar a senha em texto puro nem o hash no repositório.

Uso:
    pip install -r requirements.txt
    python gerar_hash.py
"""
import getpass

from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def main():
    senha = getpass.getpass("Senha de acesso ao sorteio: ")
    confirma = getpass.getpass("Confirme a senha: ")
    if not senha:
        print("Senha vazia. Cancelado.")
        return
    if senha != confirma:
        print("As senhas não coincidem. Tente novamente.")
        return

    hash_gerado = pwd_ctx.hash(senha)
    print("\nADMIN_PASSWORD_HASH=" + hash_gerado)
    print("\nCopie o valor acima e defina no Render como variável de ambiente")
    print("ADMIN_PASSWORD_HASH (nunca commite isso no git).")


if __name__ == "__main__":
    main()
