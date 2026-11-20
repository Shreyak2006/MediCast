from fastapi import APIRouter, Depends, HTTPException

from ..auth_state import build_auth_state
from ..db import get_connection
from ..dependencies import get_current_user
from ..schemas import (
    JoinRequestCreate,
    MemberResponse,
    OrganizationCreate,
    OrganizationResponse,
)
from ..security import generate_join_code

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationResponse, status_code=201)
def create_organization(
    payload: OrganizationCreate, user: dict = Depends(get_current_user)
):
    with get_connection() as connection:
        current = connection.execute(
            "select hospital_id from users where id = %s", (user["id"],)
        ).fetchone()
        if current["hospital_id"] is not None:
            raise HTTPException(
                status_code=409, detail="You already belong to an organization"
            )

        for _ in range(10):
            code = generate_join_code()
            taken = connection.execute(
                "select 1 from hospitals where join_code = %s", (code,)
            ).fetchone()
            if taken is None:
                break
        else:
            raise HTTPException(
                status_code=500, detail="Could not generate an organization code"
            )

        hospital = connection.execute(
            """
            insert into hospitals
                (name, state, district, pincode, hospital_type, join_code)
            values (%s, %s, %s, %s, %s, %s)
            returning id, name, join_code, state, district, pincode, hospital_type
            """,
            (
                payload.name,
                payload.state,
                payload.district,
                payload.pincode,
                payload.hospital_type,
                code,
            ),
        ).fetchone()

        connection.execute(
            "update users set hospital_id = %s, role = 'admin' where id = %s",
            (hospital["id"], user["id"]),
        )
        connection.execute(
            """
            update join_requests set status = 'rejected', resolved_at = now()
            where user_id = %s and status = 'pending'
            """,
            (user["id"],),
        )

        return OrganizationResponse(
            id=str(hospital["id"]),
            name=hospital["name"],
            code=hospital["join_code"],
            state=hospital["state"],
            district=hospital["district"],
            pincode=hospital["pincode"],
            hospital_type=hospital["hospital_type"],
        )


@router.post("/join")
def request_to_join(
    payload: JoinRequestCreate, user: dict = Depends(get_current_user)
):
    with get_connection() as connection:
        current = connection.execute(
            "select hospital_id from users where id = %s", (user["id"],)
        ).fetchone()
        if current["hospital_id"] is not None:
            raise HTTPException(
                status_code=409, detail="You already belong to an organization"
            )

        hospital = connection.execute(
            "select id, join_code from hospitals where join_code = %s",
            (payload.code,),
        ).fetchone()
        if hospital is None:
            raise HTTPException(status_code=404, detail="Organization not found")

        existing = connection.execute(
            """
            select 1 from join_requests
            where user_id = %s and hospital_id = %s and status = 'pending'
            """,
            (user["id"], hospital["id"]),
        ).fetchone()
        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="You already have a pending request for this organization",
            )

        connection.execute(
            "insert into join_requests (hospital_id, user_id) values (%s, %s)",
            (hospital["id"], user["id"]),
        )
        return build_auth_state(connection, user["id"]).model_dump()


@router.get("/me", response_model=OrganizationResponse | None)
def read_organization(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        hospital = connection.execute(
            """
            select id, name, join_code, state, district, pincode, hospital_type
            from hospitals where id = %s
            """,
            (user["hospital_id"],),
        ).fetchone() if user["hospital_id"] is not None else None

    if hospital is None:
        return None

    return OrganizationResponse(
        id=str(hospital["id"]),
        name=hospital["name"],
        code=hospital["join_code"],
        state=hospital["state"],
        district=hospital["district"],
        pincode=hospital["pincode"],
        hospital_type=hospital["hospital_type"],
    )


@router.get("/me/members", response_model=list[MemberResponse])
def read_members(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        if user["hospital_id"] is None:
            return []

        rows = connection.execute(
            """
            select id, name, email, role from users
            where hospital_id = %s order by id
            """,
            (user["hospital_id"],),
        ).fetchall()

    return [
        MemberResponse(
            id=str(row["id"]),
            name=row["name"],
            email=row["email"],
            role="admin" if row["role"] == "admin" else "member",
        )
        for row in rows
    ]


@router.post("/me/leave")
def leave_organization(user: dict = Depends(get_current_user)):
    with get_connection() as connection:
        current = connection.execute(
            "select role from users where id = %s", (user["id"],)
        ).fetchone()
        if current["role"] == "admin":
            raise HTTPException(
                status_code=400, detail="Admins cannot leave their organization"
            )

        connection.execute(
            "update users set hospital_id = null, role = 'staff' where id = %s",
            (user["id"],),
        )
        return build_auth_state(connection, user["id"]).model_dump()
