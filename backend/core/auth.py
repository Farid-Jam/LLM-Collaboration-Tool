from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.database import AsyncSessionLocal, get_session

_ALGORITHM = "HS256"
_EXPIRE_DAYS = 7

_bearer = HTTPBearer()


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(account_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": account_id, "exp": expire},
        settings.secret_key,
        algorithm=_ALGORITHM,
    )


async def get_current_account_from_token(token: str):
    """Standalone coroutine for WebSocket use (no HTTP context)."""
    # Import here to avoid circular dependency at module load time
    from models.database import AuthAccount

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
        account_id: str | None = payload.get("sub")
        if not account_id:
            return None
    except JWTError:
        return None

    async with AsyncSessionLocal() as db:
        return await db.get(AuthAccount, account_id)


async def get_current_account(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_session),
):
    """FastAPI dependency for protected REST endpoints."""
    from models.database import AuthAccount

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials, settings.secret_key, algorithms=[_ALGORITHM]
        )
        account_id: str | None = payload.get("sub")
        if not account_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    account = await db.get(AuthAccount, account_id)
    if not account:
        raise credentials_exception
    return account
