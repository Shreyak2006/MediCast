from fastapi import APIRouter, Depends, HTTPException

from ..db import get_connection
from ..dependencies import get_admin_user
from ..schemas import MemberResponse, PendingRequestResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/join-requests", response_model=list[PendingRequestResponse])
def list_join_requests(admin: dict = Depends(get_admin_user)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            select jr.id, u.name, u.email, jr.created_at
            from join_requests jr
            join users u on u.id = jr.user_id
            where jr.hospital_id = %s and jr.status = 'pending'
            order by jr.created_at desc, jr.id desc
            """,
            (admin["hospital_id"],),
        ).fetchall()

    return [
        PendingRequestResponse(
            id=str(row["id"]),
            name=row["name"],
            email=row["email"],
            requested_at=row["created_at"].date().isoformat(),
        )
        for row in rows
    ]


def _get_pending_request(connection, request_id: int, hospital_id: int) -> dict:
    request = connection.execute(
        """
        select id, user_id, status from join_requests
        where id = %s and hospital_id = %s
        """,
        (request_id, hospital_id),
    ).fetchone()
    if request is None:
        raise HTTPException(status_code=404, detail="Join request not found")
    if request["status"] != "pending":
        raise HTTPException(status_code=409, detail="Request already resolved")
    return dict(request)


@router.post("/join-requests/{request_id}/accept", response_model=MemberResponse)
def accept_join_request(request_id: int, admin: dict = Depends(get_admin_user)):
    with get_connection() as connection:
        request = _get_pending_request(
            connection, request_id, admin["hospital_id"]
        )

        connection.execute(
            "update users set hospital_id = %s, role = 'staff' where id = %s",
            (admin["hospital_id"], request["user_id"]),
        )
        connection.execute(
            """
            update join_requests set status = 'approved', resolved_at = now()
            where id = %s
            """,
            (request_id,),
        )
        member = connection.execute(
            "select id, name, email, role from users where id = %s",
            (request["user_id"],),
        ).fetchone()

    return MemberResponse(
        id=str(member["id"]),
        name=member["name"],
        email=member["email"],
        role="member",
    )


@router.post("/join-requests/{request_id}/reject")
def reject_join_request(request_id: int, admin: dict = Depends(get_admin_user)):
    with get_connection() as connection:
        _get_pending_request(connection, request_id, admin["hospital_id"])
        connection.execute(
            """
            update join_requests set status = 'rejected', resolved_at = now()
            where id = %s
            """,
            (request_id,),
        )
    return {"status": "ok"}


@router.delete("/members/{member_id}", status_code=204)
def remove_member(member_id: int, admin: dict = Depends(get_admin_user)):
    if member_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")

    with get_connection() as connection:
        member = connection.execute(
            "select id from users where id = %s and hospital_id = %s",
            (member_id, admin["hospital_id"]),
        ).fetchone()
        if member is None:
            raise HTTPException(status_code=404, detail="Member not found")

        connection.execute(
            "update users set hospital_id = null, role = 'staff' where id = %s",
            (member_id,),
        )
