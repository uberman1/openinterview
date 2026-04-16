from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from .metrics_ext import inc
from .audit_ext import append_audit

router = APIRouter()

class Org(BaseModel):
    id: int
    name: str
    owner: str
    members: Dict[str, str]
    invites: Dict[str, str]

ORGS: Dict[int, Org] = {}
ORG_SEQ = 1

def actor_from_header(x_demo_user: Optional[str]) -> str:
    return x_demo_user or "owner@example.com"

def require_owner(org: Org, actor: str):
    role = org.members.get(actor, "none")
    if role != "owner":
        raise HTTPException(status_code=403, detail="owner required")

class CreateOrg(BaseModel):
    name: str

@router.post("/api/org", tags=["org"])
def create_org(body: CreateOrg, x_demo_user: Optional[str] = Header(None)):
    global ORG_SEQ
    actor = actor_from_header(x_demo_user)
    org = Org(id=ORG_SEQ, name=body.name, owner=actor, members={actor:"owner"}, invites={})
    ORGS[ORG_SEQ] = org
    ORG_SEQ += 1
    append_audit(actor, "create_org", f"org:{org.id}", {"name": body.name})
    inc("app_actions_total", '{action="create_org"} 1')
    return org

class Invite(BaseModel):
    org_id: int
    email: str
    role: str = "member"

@router.post("/api/org/invite", tags=["org"])
def invite(body: Invite, x_demo_user: Optional[str] = Header(None)):
    actor = actor_from_header(x_demo_user)
    org = ORGS.get(body.org_id)
    if not org: raise HTTPException(status_code=404, detail="org not found")
    require_owner(org, actor)
    org.invites[body.email] = body.role
    append_audit(actor, "invite_sent", f"org:{org.id}", {"email": body.email, "role": body.role})
    inc("app_actions_total", '{action="invite"} 1')
    return {"status":"ok"}

class Accept(BaseModel):
    org_id: int
    email: str

@router.post("/api/org/accept", tags=["org"])
def accept(body: Accept):
    org = ORGS.get(body.org_id)
    if not org: raise HTTPException(status_code=404, detail="org not found")
    role = org.invites.pop(body.email, None)
    if not role: raise HTTPException(status_code=400, detail="no invite")
    org.members[body.email] = role
    append_audit(body.email, "invite_accepted", f"org:{org.id}", {"role": role})
    inc("app_actions_total", '{action="accept_invite"} 1')
    return {"status":"ok"}

@router.get("/api/org/members", tags=["org"])
def members(org_id: int, x_demo_user: Optional[str] = Header(None)):
    actor = actor_from_header(x_demo_user)
    org = ORGS.get(org_id)
    if not org: raise HTTPException(status_code=404, detail="org not found")
    if actor not in org.members:
        raise HTTPException(status_code=403, detail="forbidden")
    return {"org_id": org.id, "members": org.members}

class SetRole(BaseModel):
    org_id: int
    email: str
    role: str

@router.post("/api/org/role", tags=["org"])
def set_role(body: SetRole, x_demo_user: Optional[str] = Header(None)):
    actor = actor_from_header(x_demo_user)
    org = ORGS.get(body.org_id)
    if not org: raise HTTPException(status_code=404, detail="org not found")
    require_owner(org, actor)
    if body.email not in org.members:
        raise HTTPException(status_code=404, detail="member not found")
    org.members[body.email] = body.role
    append_audit(actor, "role_changed", f"org:{org.id}", {"email": body.email, "role": body.role})
    inc("app_actions_total", '{action="role_change"} 1')
    return {"status":"ok"}
