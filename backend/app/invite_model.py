import secrets
import string
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from .database import Base


def _gen_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "TAI-" + "".join(secrets.choice(chars) for _ in range(8))


class InviteKey(Base):
    __tablename__ = "invite_keys"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False, default=_gen_code)
    note = Column(String, nullable=True)
    is_used = Column(Boolean, default=False, nullable=False)
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
