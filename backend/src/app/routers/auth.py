from fastapi import APIRouter, Depends, HTTPException
from psycopg.errors import UniqueViolation

from ..auth_state import build_auth_state
from ..db import get_connection
from ..dependencies import get_current_user, get_token
from ..schemas import AuthResponse, AuthState, LoginRequest, SignupRequest
from ..security import generate_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _create_session(connection, user_id: int) -> str:
    token = generate_token()
    connection.execute(
        "insert into sessions (token, user_id) values (%s, %s)", (token, user_id)
    )
    return token


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest):
    with get_connection() as connection:
        try:
            user = connection.execute(
                """
                insert into users (hospital_id, name, email, password_hash, role)
                values (null, %s, %s, %s, 'staff')
                returning id
                """,
                (
                    payload.name,
                    str(payload.email).lower(),
                    hash_password(payload.password),
                ),
            ).fetchone()
        except UniqueViolation:
            raise HTTPException(
                status_code=409, detail="An account with this email already exists"
            )

        token = _create_session(connection, user["id"])
        state = build_auth_state(connection, user["id"])

    return AuthResponse(token=token, **state.model_dump())


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    with get_connection() as connection:
        user = connection.execute(
            """
            select id, name, email, password_hash, is_active
            from users where lower(email) = %s
            """,
            (str(payload.email).lower(),),
        ).fetchone()

        if (
            user is None
            or not user["is_active"]
            or not verify_password(payload.password, user["password_hash"])
        ):
            raise HTTPException(
                status_code=401, detail="Invalid email or password"
            )

        token = _create_session(connection, user["id"])
        state = build_auth_state(connection, user["id"])

    return AuthResponse(token=token, **state.model_dump())


@router.post("/logout")
def logout(token: str = Depends(get_token)):
    with get_connection() as connection:
        connection.execute("delete from sessions where token = %s", (token,))
    return {"status": "ok"}


@router.get("/me", response_model=AuthState)
def read_me(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        return build_auth_state(connection, user["id"])
