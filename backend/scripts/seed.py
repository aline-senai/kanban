"""Cria o professor inicial para uso local/desenvolvimento.

Uso: python scripts/seed.py <nome> <email> <senha>
"""

import sys

sys.path.append(".")

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole


def main():
    if len(sys.argv) != 4:
        print("Uso: python scripts/seed.py <nome> <email> <senha>")
        sys.exit(1)

    name, email, password = sys.argv[1], sys.argv[2], sys.argv[3]

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"Usuário {email} já existe.")
            return

        user = User(name=name, email=email, hashed_password=hash_password(password), role=UserRole.PROFESSOR)
        db.add(user)
        db.commit()
        print(f"Professor criado: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
