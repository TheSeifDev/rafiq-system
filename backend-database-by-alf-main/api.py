"""FastAPI service for the Rafiq local DB."""
from __future__ import annotations

import logging
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, Security
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security.api_key import APIKeyHeader
from pydantic import AwareDatetime, BaseModel, Field, model_validator

import db
import sync
from settings import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("rafiq.api")

SETTINGS = get_settings()
API_KEY = SETTINGS.resolved_api_key
if SETTINGS.allow_insecure_dev_api_key and not SETTINGS.api_key:
    logger.warning("Running with insecure development API key. Set API_KEY for production.")


def ok(data: Any, **extra: Any) -> dict[str, Any]:
    return {"success": True, "data": data, **extra}


def error_payload(code: str, message: str, details: Any = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "success": False,
        "error": {"code": code, "message": message},
    }
    if details is not None:
        payload["error"]["details"] = details
    return payload


def _raise_not_found(entity: str) -> None:
    raise HTTPException(
        status_code=404,
        detail={"code": "not_found", "message": f"{entity} not found"},
    )


def _raise_invalid_foreign_key() -> None:
    raise HTTPException(
        status_code=400,
        detail={
            "code": "invalid_foreign_key",
            "message": "Referenced patient does not exist or foreign key is invalid",
        },
    )


class PatientIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    age: int | None = Field(None, ge=0, le=150)
    gender: str | None = Field(None, pattern="^(male|female)$")
    blood_type: str | None = Field(None, pattern=r"^(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)$")
    medical_history: str | None = None


class PatientUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    age: int | None = Field(None, ge=0, le=150)
    gender: str | None = Field(None, pattern="^(male|female)$")
    blood_type: str | None = Field(None, pattern=r"^(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)$")
    medical_history: str | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> PatientUpdate:
        changes = self.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("At least one field must be provided for update")
        if "name" in changes and changes["name"] is None:
            raise ValueError("name cannot be null")
        return self


class AlertIn(BaseModel):
    patient_id: int = Field(ge=1)
    type: str = Field(min_length=1, max_length=50)
    message: str = Field(min_length=1, max_length=500)
    severity: str = Field(pattern="^(low|medium|high|critical)$")


class DeviceIn(BaseModel):
    patient_id: int = Field(ge=1)
    device_name: str = Field(min_length=1, max_length=100)
    type: str = Field(min_length=1, max_length=50)
    status: str = Field(default="offline", pattern="^(online|offline|error)$")


class HeartbeatIn(BaseModel):
    status: str = Field(default="online", pattern="^(online|offline|error)$")


class ContactIn(BaseModel):
    patient_id: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=200)
    relationship: str | None = Field(None, max_length=50)
    phone_number: str = Field(pattern=r"^\+?[\d\s\-]*\d[\d\s\-]*$")
    priority: int = Field(default=1, ge=1, le=10)


class LocationIn(BaseModel):
    patient_id: int = Field(ge=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ReminderIn(BaseModel):
    patient_id: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    time: AwareDatetime
    is_active: bool = True


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    db.reset_paths_from_settings()
    db.init_db()
    sync.start_background()
    yield


api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)


async def get_api_key(api_key: str = Security(api_key_header)) -> str:
    if api_key != API_KEY:
        raise HTTPException(
            status_code=401,
            detail={"code": "invalid_api_key", "message": "Could not validate API key"},
        )
    return api_key


def create_app() -> FastAPI:
    app = FastAPI(title="Rafiq Local API", version="3.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(SETTINGS.cors_origins),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_router = APIRouter(dependencies=[Depends(get_api_key)])

    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = jsonable_encoder(exc.errors())
        return JSONResponse(
            status_code=422,
            content=error_payload("validation_error", "Request validation failed", details),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail and "message" in detail:
            code = str(detail["code"])
            message = str(detail["message"])
            details = detail.get("details")
            return JSONResponse(status_code=exc.status_code, content=error_payload(code, message, details))
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload("http_error", str(detail), detail),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled API error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content=error_payload("internal_error", "Internal server error"),
        )

    # ------------------------- health -------------------------
    @api_router.get("/health")
    def health() -> dict[str, Any]:
        return {"success": True, "status": "ok"}

    # ------------------------- patients -------------------------
    @api_router.get("/patients")
    def list_patients(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000)) -> dict[str, Any]:
        return ok(db.list_patients(skip, limit))

    @api_router.get("/patients/{pid}")
    def get_patient(pid: int) -> dict[str, Any]:
        patient = db.get_patient(pid)
        if not patient:
            _raise_not_found("Patient")
        return ok(patient)

    @api_router.post("/patients", status_code=201)
    def create_patient(body: PatientIn) -> dict[str, Any]:
        patient_id = db.create_patient(body.model_dump())
        return ok(db.get_patient(patient_id))

    @api_router.put("/patients/{pid}")
    def update_patient(pid: int, body: PatientUpdate) -> dict[str, Any]:
        if not db.get_patient(pid):
            _raise_not_found("Patient")
        try:
            db.update_patient(pid, body.model_dump(exclude_unset=True))
        except sqlite3.IntegrityError as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "invalid_update", "message": "Update violates database constraints"},
            ) from exc
        return ok(db.get_patient(pid))

    @api_router.delete("/patients/{pid}")
    def delete_patient(pid: int) -> dict[str, Any]:
        if not db.delete_patient(pid):
            _raise_not_found("Patient")
        return ok({"deleted": pid})

    # ------------------------- alerts -------------------------
    @api_router.get("/alerts")
    def list_alerts(patient_id: int | None = None, limit: int = Query(50, ge=1, le=1000)) -> dict[str, Any]:
        return ok(db.list_alerts(patient_id, limit))

    @api_router.get("/alerts/unread/{patient_id}")
    def unread_alerts(patient_id: int) -> dict[str, Any]:
        rows = db.unread_alerts(patient_id)
        return ok(rows, count=len(rows))

    @api_router.get("/alerts/critical")
    def critical_alerts() -> dict[str, Any]:
        return ok(db.critical_alerts())

    @api_router.post("/alerts", status_code=201)
    def create_alert(body: AlertIn) -> dict[str, Any]:
        try:
            alert_id = db.create_alert(body.model_dump())
        except sqlite3.IntegrityError:
            _raise_invalid_foreign_key()
        return ok({"id": alert_id})

    @api_router.post("/alerts/{aid}/read")
    def mark_read(aid: int) -> dict[str, Any]:
        if not db.mark_alert_read(aid):
            _raise_not_found("Alert")
        return ok({"id": aid, "is_read": True})

    # ------------------------- devices -------------------------
    @api_router.get("/devices")
    def list_devices(
        patient_id: int | None = None,
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
    ) -> dict[str, Any]:
        return ok(db.list_devices(patient_id, skip, limit))

    @api_router.get("/devices/system-check")
    def system_check() -> dict[str, Any]:
        rows = db.system_check()
        online = sum(1 for row in rows if row["status"] == "online")
        return ok(rows, online=online, total=len(rows))

    @api_router.post("/devices", status_code=201)
    def register_device(body: DeviceIn) -> dict[str, Any]:
        try:
            device_id = db.register_device(body.model_dump())
        except sqlite3.IntegrityError:
            _raise_invalid_foreign_key()
        return ok({"id": device_id})

    @api_router.post("/devices/{did}/heartbeat")
    def heartbeat(did: int, body: HeartbeatIn) -> dict[str, Any]:
        if not db.device_heartbeat(did, body.status):
            _raise_not_found("Device")
        return ok({"id": did, "status": body.status})

    # ------------------------- contacts -------------------------
    @api_router.get("/contacts/{patient_id}")
    def list_contacts(
        patient_id: int,
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
    ) -> dict[str, Any]:
        return ok(db.list_contacts(patient_id, skip, limit))

    @api_router.post("/contacts", status_code=201)
    def add_contact(body: ContactIn) -> dict[str, Any]:
        try:
            contact_id = db.add_contact(body.model_dump())
        except sqlite3.IntegrityError:
            _raise_invalid_foreign_key()
        return ok({"id": contact_id})

    @api_router.delete("/contacts/{cid}")
    def delete_contact(cid: int) -> dict[str, Any]:
        if not db.delete_contact(cid):
            _raise_not_found("Contact")
        return ok({"deleted": cid})

    # ------------------------- locations -------------------------
    @api_router.get("/locations/latest/{patient_id}")
    def latest_location(patient_id: int) -> dict[str, Any]:
        location = db.latest_location(patient_id)
        if not location:
            _raise_not_found("Location")
        return ok(location)

    @api_router.get("/locations/history/{patient_id}")
    def location_history(patient_id: int, limit: int = Query(50, ge=1, le=1000)) -> dict[str, Any]:
        return ok(db.location_history(patient_id, limit))

    @api_router.post("/locations", status_code=201)
    def record_location(body: LocationIn) -> dict[str, Any]:
        try:
            location_id = db.record_location(body.patient_id, body.latitude, body.longitude)
        except sqlite3.IntegrityError:
            _raise_invalid_foreign_key()
        return ok({"id": location_id})

    # ------------------------- reminders -------------------------
    @api_router.get("/reminders/{patient_id}")
    def list_reminders(patient_id: int, active_only: bool = False) -> dict[str, Any]:
        return ok(db.list_reminders(patient_id, active_only))

    @api_router.post("/reminders", status_code=201)
    def add_reminder(body: ReminderIn) -> dict[str, Any]:
        reminder_data = body.model_dump()
        reminder_data["time"] = body.time.isoformat(timespec="seconds")
        try:
            reminder_id = db.add_reminder(reminder_data)
        except sqlite3.IntegrityError:
            _raise_invalid_foreign_key()
        return ok({"id": reminder_id})

    @api_router.patch("/reminders/{rid}/toggle")
    def toggle_reminder(rid: int, active: bool) -> dict[str, Any]:
        if not db.toggle_reminder(rid, active):
            _raise_not_found("Reminder")
        return ok({"id": rid, "is_active": active})

    @api_router.delete("/reminders/{rid}")
    def delete_reminder(rid: int) -> dict[str, Any]:
        if not db.delete_reminder(rid):
            _raise_not_found("Reminder")
        return ok({"deleted": rid})

    # ------------------------- sync -------------------------
    @api_router.get("/sync/status")
    def sync_status() -> dict[str, Any]:
        return ok(sync.status())

    @api_router.post("/sync/push")
    def sync_push() -> dict[str, Any]:
        if not sync.enabled():
            raise HTTPException(
                status_code=400,
                detail={"code": "sync_not_configured", "message": "Supabase not configured"},
            )
        return ok(sync.flush_queue())

    @api_router.post("/sync/pull")
    def sync_pull() -> dict[str, Any]:
        if not sync.enabled():
            raise HTTPException(
                status_code=400,
                detail={"code": "sync_not_configured", "message": "Supabase not configured"},
            )
        return ok(sync.pull_fresh())

    @api_router.post("/sync/full")
    def sync_full() -> dict[str, Any]:
        if not sync.enabled():
            raise HTTPException(
                status_code=400,
                detail={"code": "sync_not_configured", "message": "Supabase not configured"},
            )
        return ok(sync.full_sync())

    app.include_router(api_router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
