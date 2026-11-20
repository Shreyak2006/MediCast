from psycopg import Connection

from .schemas import (
    AuthState,
    MemberResponse,
    OrganizationResponse,
    Role,
    UserResponse,
)


def _to_role(value: str) -> Role:
    """The database stores 'admin'/'staff'; the UI uses 'admin'/'member'."""
    return "admin" if value == "admin" else "member"


def build_auth_state(connection: Connection[dict], user_id: int) -> AuthState:
    user = connection.execute(
        "select id, name, email, role, hospital_id from users where id = %s",
        (user_id,),
    ).fetchone()
    if user is None:
        raise ValueError(f"User {user_id} does not exist")

    organization = None
    members: list[MemberResponse] = []
    role: Role | None = None

    if user["hospital_id"] is not None:
        hospital = connection.execute(
            """
            select id, name, join_code, state, district, pincode, hospital_type
            from hospitals where id = %s
            """,
            (user["hospital_id"],),
        ).fetchone()
        if hospital is not None:
            organization = OrganizationResponse(
                id=str(hospital["id"]),
                name=hospital["name"],
                code=hospital["join_code"],
                state=hospital["state"],
                district=hospital["district"],
                pincode=hospital["pincode"],
                hospital_type=hospital["hospital_type"],
            )

        member_rows = connection.execute(
            """
            select id, name, email, role from users
            where hospital_id = %s order by id
            """,
            (user["hospital_id"],),
        ).fetchall()
        members = [
            MemberResponse(
                id=str(member["id"]),
                name=member["name"],
                email=member["email"],
                role=_to_role(member["role"]),
            )
            for member in member_rows
        ]
        role = _to_role(user["role"])

    pending = connection.execute(
        """
        select h.join_code
        from join_requests jr
        join hospitals h on h.id = jr.hospital_id
        where jr.user_id = %s and jr.status = 'pending'
        order by jr.id desc limit 1
        """,
        (user_id,),
    ).fetchone()

    return AuthState(
        user=UserResponse(
            id=str(user["id"]), name=user["name"], email=user["email"]
        ),
        organization=organization,
        role=role,
        members=members,
        pending_join_code=pending["join_code"] if pending else None,
    )
