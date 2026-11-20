from fastapi import Depends, Header, HTTPException

from .db import get_connection

_BEARER_PREFIX = "Bearer "


def get_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith(_BEARER_PREFIX):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = authorization[len(_BEARER_PREFIX) :].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    return token


def get_current_user(token: str = Depends(get_token)) -> dict:
    with get_connection() as connection:
        user = connection.execute(
            """
            select u.id, u.name, u.email, u.role, u.hospital_id, u.is_active
            from sessions s
            join users u on u.id = s.user_id
            where s.token = %s
            """,
            (token,),
        ).fetchone()

    if user is None or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return dict(user)


def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user["hospital_id"] is None or user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
