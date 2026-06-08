import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Local dev: SQLite. Production: set DATABASE_URL to a PostgreSQL URL.
# Free PostgreSQL options: neon.tech (free, no expiry, no CC required).
# Render note: free web services have ephemeral filesystem — use DATABASE_URL.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./tennisai_users.db")

# Render/Heroku ship "postgres://" but SQLAlchemy 2.x needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
