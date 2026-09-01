"""MineMind local Python backend and web server."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import UUID, uuid4

from flask import Flask, jsonify, request, send_from_directory

PROJECT_ROOT = Path(__file__).resolve().parent
DIST_DIR = PROJECT_ROOT / "dist"
PORT = int(os.getenv("PORT", "3000"))
STORAGE_BUCKET = "app-files"

app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024


def load_dotenv() -> None:
    """Load local environment values without requiring a Python dotenv package."""
    env_file = PROJECT_ROOT / ".env"
    if not env_file.exists():
        return

    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def ensure_frontend_build() -> None:
    """Build the React application with the current local environment values."""
    print("Building the React frontend for Flask...")
    npm_command = shutil.which("npm.cmd") or shutil.which("npm") or "npm.cmd"
    subprocess.run([npm_command, "run", "build"], cwd=PROJECT_ROOT, check=True)


def json_post(url: str, payload: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request_headers = {"Content-Type": "application/json", **headers}
    api_request = Request(url, data=body, headers=request_headers, method="POST")
    with urlopen(api_request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def safe_uuid(val: Any) -> str | None:
    if not val or not isinstance(val, str):
        return None
    try:
        return str(UUID(val))
    except (ValueError, AttributeError, TypeError):
        return None


def supabase_settings() -> tuple[str, str]:
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL") or ""
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY") or ""
    return url.rstrip("/"), key


def authenticated_supabase_user() -> tuple[dict[str, Any] | None, str | None]:
    supabase_url, publishable_key = supabase_settings()
    authorization = request.headers.get("Authorization", "")
    if not supabase_url or not publishable_key or not authorization.startswith("Bearer "):
        return None, None

    access_token = authorization.removeprefix("Bearer ").strip()
    user_request = Request(
        f"{supabase_url}/auth/v1/user",
        headers={"apikey": publishable_key, "Authorization": f"Bearer {access_token}"},
    )
    try:
        with urlopen(user_request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8")), access_token
    except (HTTPError, URLError, json.JSONDecodeError) as error:
        print(f"Supabase user validation failed: {error}")
        return None, None


def get_user_and_token_or_fallback(meta_user_id: str | None = None, meta_user_name: str | None = None) -> tuple[dict[str, Any], str]:
    user, access_token = authenticated_supabase_user()
    if user and access_token:
        return user, access_token

    _, key = supabase_settings()
    fallback_id = safe_uuid(meta_user_id) or "00000000-0000-0000-0000-000000000000"
    fallback_name = meta_user_name or "MineMind User"
    fallback_user = {
        "id": fallback_id,
        "email": f"user_{fallback_id[:8]}@minemind.ai",
        "name": fallback_name,
        "user_metadata": {"name": fallback_name},
    }
    return fallback_user, key


def persist_supabase_record(table: str, record: dict[str, Any], access_token: str) -> tuple[dict[str, Any], int]:
    supabase_url, publishable_key = supabase_settings()
    database_request = Request(
        f"{supabase_url}/rest/v1/{table}",
        data=json.dumps(record).encode("utf-8"),
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
        method="POST",
    )
    try:
        with urlopen(database_request, timeout=20) as response:
            return {"record": json.loads(response.read().decode("utf-8"))}, response.status
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        print(f"Supabase {table} write failed: {detail}")
        return {"error": "Supabase rejected the database write", "details": detail}, error.code
    except URLError as error:
        return {"error": "Unable to reach Supabase", "details": str(error.reason)}, 502


def delete_supabase_record(table: str, record_id: str, access_token: str) -> None:
    """Best-effort rollback helper; failures here are logged, not raised."""
    supabase_url, publishable_key = supabase_settings()
    delete_request = Request(
        f"{supabase_url}/rest/v1/{table}?id=eq.{quote(record_id)}",
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {access_token}",
            "Prefer": "return=minimal",
        },
        method="DELETE",
    )
    try:
        with urlopen(delete_request, timeout=20) as response:
            response.read()
    except (HTTPError, URLError) as error:
        print(f"Supabase {table} rollback delete failed: {error}")


def storage_upload_bytes(path: str, data: bytes, content_type: str, access_token: str) -> tuple[bool, str]:
    supabase_url, publishable_key = supabase_settings()
    upload_request = Request(
        f"{supabase_url}/storage/v1/object/{STORAGE_BUCKET}/{quote(path)}",
        data=data,
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "true",
        },
        method="POST",
    )
    try:
        with urlopen(upload_request, timeout=60) as response:
            response.read()
        return True, ""
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        print(f"Supabase Storage upload failed: {detail}")
        return False, detail
    except URLError as error:
        return False, str(error.reason)


def storage_delete_object(path: str, access_token: str) -> None:
    """Best-effort rollback helper; failures here are logged, not raised."""
    supabase_url, publishable_key = supabase_settings()
    delete_request = Request(
        f"{supabase_url}/storage/v1/object/{STORAGE_BUCKET}/{quote(path)}",
        headers={"apikey": publishable_key, "Authorization": f"Bearer {access_token}"},
        method="DELETE",
    )
    try:
        with urlopen(delete_request, timeout=20) as response:
            response.read()
    except (HTTPError, URLError) as error:
        print(f"Supabase Storage rollback delete failed: {error}")


def approved_matches(
    question: str,
    chunks: list[dict[str, Any]],
    subsidiary: str | None,
    selected_document_id: str | None = None,
) -> list[dict[str, Any]]:
    query = question.lower().strip()
    terms = [term for term in re.sub(r"[^a-z0-9\s]", " ", query).split() if len(term) > 2]
    candidates = [chunk for chunk in chunks if chunk.get("isApproved")]
    if subsidiary and subsidiary not in {"ALL", "CMPDI HQ"}:
        candidates = [
            chunk for chunk in candidates
            if chunk.get("subsidiary") in {subsidiary, "CMPDI HQ"}
        ]
    if selected_document_id:
        candidates = [chunk for chunk in candidates if chunk.get("documentId") == selected_document_id]

    matches: list[dict[str, Any]] = []
    for chunk in candidates:
        text = str(chunk.get("text", "")).lower()
        title = str(chunk.get("documentTitle", "")).lower()
        code = str(chunk.get("documentCode", "")).lower()
        tag = str(chunk.get("topicTag", "")).lower()
        score = 10 if query and query in text else 0
        for term in terms:
            score += 2 if term in text else 0
            score += 3.5 if term in title else 0
            score += 4 if term in code else 0
            score += 2.5 if term in tag else 0
        if str(chunk.get("subsidiary", "")).lower() in query:
            score += 3
        if score > 2:
            matches.append({"chunk": chunk, "score": score})

    return sorted(matches, key=lambda item: item["score"], reverse=True)


def ambiguous_document_matches(question: str, matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return one representative chunk per similarly relevant document."""
    if "compare" in question.lower() or len(matches) < 2:
        return []

    best_by_document: dict[str, dict[str, Any]] = {}
    for match in matches:
        document_id = str(match["chunk"].get("documentId") or "")
        if document_id and document_id not in best_by_document:
            best_by_document[document_id] = match

    candidates = list(best_by_document.values())
    if len(candidates) < 2:
        return []

    highest_score = candidates[0]["score"]
    similarly_relevant = [
        candidate for candidate in candidates
        if candidate["score"] >= max(3, highest_score * 0.55)
    ][:3]
    return similarly_relevant if len(similarly_relevant) > 1 else []


def citations_from_matches(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    for match in matches:
        chunk = match["chunk"]
        citations.append({
            "chunkId": chunk.get("id"),
            "documentId": chunk.get("documentId"),
            "documentTitle": chunk.get("documentTitle"),
            "documentCode": chunk.get("documentCode"),
            "versionNumber": chunk.get("versionNumber"),
            "pageOrSheetRef": chunk.get("pageOrSheetRef"),
            "excerpt": f"{str(chunk.get('text', ''))[:160]}...",
            "relevanceScore": 0.98,
            "subsidiary": chunk.get("subsidiary"),
        })
    return citations


def missing_knowledge_result() -> dict[str, Any]:
    return {
        "foundInKnowledgeBase": False,
        "answer": "No supporting information was found in the available organizational documents.",
        "citations": [],
        "confidence": 0,
        "provider": "local-grounded-engine",
    }


def ask_xai(question: str, matches: list[dict[str, Any]]) -> dict[str, Any] | None:
    api_key = os.getenv("XAI_API_KEY", "").strip()
    if not api_key or api_key == "MY_XAI_API_KEY":
        return None

    context = "\n\n".join(
        f"[CHUNK {index}] {item['chunk'].get('text', '')}"
        for index, item in enumerate(matches, start=1)
    )
    prompt = (
        "Answer only from the approved chunks. Return JSON with foundInKnowledgeBase, answer, "
        "aiSummary, confidence, draftOfficialReply, citedChunkIndices.\n\n"
        f"Question: {question}\n\nApproved chunks:\n{context}"
    )
    response = json_post(
        "https://api.x.ai/v1/chat/completions",
        {
            "model": os.getenv("GROK_MODEL", "grok-4"),
            "messages": [
                {"role": "system", "content": "Never use knowledge beyond the supplied chunks. Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        },
        {"Authorization": f"Bearer {api_key}"},
    )
    raw_content = response["choices"][0]["message"]["content"]
    return json.loads(raw_content)


def ask_groq(question: str, matches: list[dict[str, Any]]) -> dict[str, Any] | None:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key or api_key == "MY_GROQ_API_KEY":
        return None

    context = "\n\n".join(
        f"[CHUNK {index}] {item['chunk'].get('text', '')}"
        for index, item in enumerate(matches, start=1)
    )
    prompt = (
        "Answer only from the approved chunks. Return JSON with foundInKnowledgeBase, answer, "
        "aiSummary, confidence, draftOfficialReply, citedChunkIndices.\n\n"
        f"Question: {question}\n\nApproved chunks:\n{context}"
    )
    response = json_post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            "messages": [
                {"role": "system", "content": "Never use knowledge beyond the supplied chunks. Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        },
        {"Authorization": f"Bearer {api_key}"},
    )
    return json.loads(response["choices"][0]["message"]["content"])


def call_llm_json(system_prompt: str, user_prompt: str, temperature: float = 0.15) -> tuple[dict[str, Any] | None, str]:
    """Generic grounded JSON-completion helper shared by the report AI endpoints.

    Tries xAI Grok first, then Groq, using whichever key is present in .env
    (same env vars as ask_xai/ask_groq above). Returns (parsed_json, provider)
    or (None, "local-heuristic-engine") if no provider is configured or every
    call fails, so callers can fall back to deterministic logic.
    """
    providers = (
        ("xai-grok", "XAI_API_KEY", "MY_XAI_API_KEY", "https://api.x.ai/v1/chat/completions", os.getenv("GROK_MODEL", "grok-4")),
        ("groq", "GROQ_API_KEY", "MY_GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions", os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")),
    )
    for provider_name, env_key, placeholder, url, model in providers:
        api_key = os.getenv(env_key, "").strip()
        if not api_key or api_key == placeholder:
            continue
        try:
            response = json_post(
                url,
                {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": temperature,
                },
                {"Authorization": f"Bearer {api_key}"},
            )
            raw_content = response["choices"][0]["message"]["content"]
            return json.loads(raw_content), provider_name
        except (HTTPError, URLError, KeyError, IndexError, json.JSONDecodeError) as error:
            print(f"{provider_name} call failed: {error}")
            continue
    return None, "local-heuristic-engine"


# ---------------------------------------------------------------------------
# Report intent extraction (Step 2 of the report wizard) — mirrors the
# frontend heuristic parse in ReportGenerator.tsx so the wizard behaves
# consistently even if a request skips the network, then lets a live LLM
# (when XAI_API_KEY / GROQ_API_KEY is present in .env) confirm or correct it.
# ---------------------------------------------------------------------------
REPORT_TYPE_KEYWORDS: list[tuple[str, list[str]]] = [
    ("production_variance", ["production", "variance", "target", "actual", "dispatch", "output"]),
    ("reserve_assessment", ["reserve", "geological", "seam", "borehole", "assay", "geology"]),
    ("compliance_brief", ["compliance", "dgms", "environmental", "groundwater", "slope", "audit"]),
    ("safety_memo", ["incident", "water influx", "inundation", "strata", "safety memo", "accident"]),
]

METRIC_SETS: dict[str, list[str]] = {
    "production_variance": ["Production Target", "Actual Production", "Variance", "Achievement %", "Grade", "Reasons for Deviation"],
    "reserve_assessment": ["Proved Reserves", "Indicated Reserves", "Inferred Reserves", "Seam-wise Breakdown", "Grade Distribution"],
    "compliance_brief": ["Groundwater Setback Compliance", "Slope Stability Factor of Safety", "DGMS Observations", "Corrective Actions"],
    "safety_memo": ["Incident Timeline", "Water Influx Volume", "Barrier Pillar Status", "Precedent Cases", "Mitigation Steps"],
}

SOURCE_SETS: dict[str, list[str]] = {
    "production_variance": ["Production records", "Monthly reports", "Dispatch data", "Historical reports"],
    "reserve_assessment": ["Geological survey reports", "Borehole logs", "Seam assay data"],
    "compliance_brief": ["Environmental audit reports", "DGMS circulars", "Slope stability studies"],
    "safety_memo": ["Incident reports", "SOP documents", "Historical safety memos"],
}

MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

SUBSIDIARY_CODES = ("CMPDI HQ", "BCCL", "SECL", "NCL", "CCL", "ECL", "WCL", "MCL")


def infer_report_type(text: str) -> str:
    lower = text.lower()
    for report_type, keywords in REPORT_TYPE_KEYWORDS:
        if any(keyword in lower for keyword in keywords):
            return report_type
    return "production_variance"


def infer_subsidiary(text: str) -> str:
    upper = text.upper()
    for code in SUBSIDIARY_CODES:
        if code in upper:
            return code
    return "ALL"


def infer_period(text: str) -> str:
    lower = text.lower()
    now = datetime.now(timezone.utc)
    year_match = re.search(r"\b(20\d{2})\b", text)
    year = year_match.group(1) if year_match else str(now.year)

    month_idx = next((i for i, name in enumerate(MONTH_NAMES) if name in lower), -1)
    if month_idx >= 0:
        return f"{MONTH_NAMES[month_idx].capitalize()} {year}"

    quarter_match = re.search(r"q([1-4])", lower)
    if quarter_match or "quarter" in lower:
        quarter = quarter_match.group(1) if quarter_match else str((now.month - 1) // 3 + 1)
        return f"FY {year}-{str(int(year) + 1)[2:]} (Q{quarter})"

    if "annual" in lower or "full year" in lower:
        return f"FY {year}-{str(int(year) + 1)[2:]} (Annual)"

    return now.strftime("%B %Y")


@app.get("/api/health")
def health() -> Any:
    return jsonify({
        "status": "ok",
        "service": "MineMind AI Knowledge & Reporting Engine (Python)",
        "hasXAIKey": bool(os.getenv("XAI_API_KEY")),
        "hasGroqKey": bool(os.getenv("GROQ_API_KEY")),
        "provider": "python-flask",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@app.post("/api/persistence/profile")
def persist_profile() -> Any:
    data = request.get_json(silent=True) or {}
    user, access_token = get_user_and_token_or_fallback(data.get("id"), data.get("name"))

    user_id = safe_uuid(user.get("id")) or str(uuid4())
    record = {
        "id": user_id,
        "email": user.get("email", "").lower(),
        "name": data.get("name") or user.get("user_metadata", {}).get("name") or user.get("email", "").split("@")[0],
        "employee_id": data.get("employeeId"),
        "role": data.get("role", "employee"),
        "subsidiary": data.get("subsidiary", "CMPDI HQ"),
        "department": data.get("department", "Central Directorate"),
        "designation": data.get("designation", "Mining Technical Officer"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result, status = persist_supabase_record("profiles", record, access_token)
    return jsonify(result), status


@app.post("/api/persistence/query-history")
def persist_query_history() -> Any:
    data = request.get_json(silent=True) or {}
    user, access_token = get_user_and_token_or_fallback(data.get("userId"), data.get("userName"))

    user_id = safe_uuid(user.get("id")) or str(uuid4())
    record = {
        "id": data.get("id"),
        "user_id": user_id,
        "user_name": data.get("userName") or user.get("email", "Authorized User"),
        "user_role": data.get("userRole", "employee"),
        "question_text": data.get("questionText"),
        "answer_text": data.get("answerText"),
        "ai_summary": data.get("aiSummary"),
        "citations": data.get("citations", []),
        "confidence": data.get("confidence", 0),
        "found_in_knowledge_base": data.get("foundInKnowledgeBase", False),
        "draft_official_reply": data.get("draftOfficialReply"),
        "created_at": data.get("createdAt") or datetime.now(timezone.utc).isoformat(),
    }
    if not record["id"] or not record["question_text"] or not record["answer_text"]:
        return jsonify({"error": "Incomplete query history record"}), 400
    result, status = persist_supabase_record("query_history", record, access_token)
    return jsonify(result), status


@app.post("/api/persistence/report")
def persist_report_record() -> Any:
    data = request.get_json(silent=True) or {}
    generated_by = data.get("generatedBy") or {}
    user, access_token = get_user_and_token_or_fallback(generated_by.get("id"), generated_by.get("name"))

    user_id = safe_uuid(user.get("id")) or str(uuid4())
    record = {
        "id": data.get("id"),
        "title": data.get("title"),
        "report_code": data.get("reportCode"),
        "type": data.get("type"),
        "period": data.get("period"),
        "subsidiary": data.get("subsidiary"),
        "generated_by_id": user_id,
        "generated_by_name": generated_by.get("name") or user.get("email", "Authorized User"),
        "generated_by_role": generated_by.get("role", "employee"),
        "content": data.get("content"),
        "summary": data.get("summary") or data.get("summaryExecutive"),
        "citations": data.get("citations", []),
        "status": data.get("status", "draft"),
        "created_at": data.get("createdAt") or datetime.now(timezone.utc).isoformat(),
    }
    required_fields = ("id", "title", "report_code", "type", "period", "subsidiary", "content")
    if any(not record[field] for field in required_fields):
        return jsonify({"error": "Incomplete report record"}), 400
    result, status = persist_supabase_record("reports", record, access_token)
    return jsonify(result), status


@app.post("/api/persistence/document-upload")
def persist_document_upload() -> Any:
    """Single authoritative path: receives the file + metadata from the browser and
    writes the Storage object plus the documents/document_versions/approvals/document_chunks
    rows. Works for all users (Supabase Auth, demo accounts, or local logins)."""
    uploaded_file = request.files.get("file")
    meta_raw = request.form.get("meta")
    if not uploaded_file or not meta_raw:
        return jsonify({"error": "Missing file or document metadata"}), 400

    try:
        meta = json.loads(meta_raw)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid metadata payload"}), 400

    user, access_token = get_user_and_token_or_fallback(meta.get("uploadedById"), meta.get("uploadedByName"))

    document_id = meta.get("documentId")
    version_id = meta.get("versionId")
    is_update = bool(meta.get("isUpdate"))
    subsidiary = meta.get("subsidiary")
    reason_for_change = meta.get("reasonForChange")

    if not document_id or not version_id or not subsidiary or not reason_for_change:
        return jsonify({"error": "Incomplete document metadata"}), 400
    if not is_update and any(not meta.get(field) for field in ("title", "documentCode", "type", "department")):
        return jsonify({"error": "Incomplete new document metadata"}), 400

    file_bytes = uploaded_file.read()
    extension = Path(uploaded_file.filename or "file").suffix.lstrip(".") or "bin"
    uploader_folder = user.get("id") or "public_user"
    storage_path = f"{uploader_folder}/documents/{document_id}/{uuid4()}.{extension}"

    uploaded_ok, upload_error = storage_upload_bytes(
        storage_path, file_bytes, uploaded_file.mimetype, access_token
    )
    if not uploaded_ok:
        return jsonify({"error": "Supabase Storage rejected the file upload", "details": upload_error}), 502

    if not is_update:
        document_record = {
            "id": document_id,
            "document_code": meta["documentCode"],
            "title": meta["title"],
            "type": meta["type"],
            "department": meta["department"],
            "subsidiary": subsidiary,
            "created_at": meta.get("createdAt") or datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        _, doc_status = persist_supabase_record("documents", document_record, access_token)
        if doc_status >= 300:
            storage_delete_object(storage_path, access_token)
            return jsonify({"error": "Failed to save the document record"}), 502

    uploaded_at = meta.get("uploadedAt") or datetime.now(timezone.utc).isoformat()
    approval_status = meta.get("approvalStatus", "pending")
    approval_priority = meta.get("approvalPriority", "normal")
    uploaded_by_id = safe_uuid(meta.get("uploadedById") or user.get("id"))
    version_record = {
        "id": version_id,
        "document_id": document_id,
        "version_number": meta.get("versionNumber", 1),
        "file_name": uploaded_file.filename,
        "file_size": meta.get("fileSize"),
        "file_path": storage_path,
        "storage_bucket": STORAGE_BUCKET,
        "uploaded_by_id": uploaded_by_id,
        "uploaded_by_name": meta.get("uploadedByName") or user.get("name") or "Authorized User",
        "uploaded_by_subsidiary": subsidiary,
        "uploaded_at": uploaded_at,
        "reason_for_change": reason_for_change,
        "extracted_text": meta.get("extractedText", ""),
        "key_metrics": meta.get("keyMetrics") or [],
        "ocr_confidence": meta.get("ocrConfidence", 98.0),
        "approval_status": approval_status,
        "approval_priority": approval_priority,
        "ai_risk_reason": meta.get("aiRiskReason"),
    }
    _, version_status = persist_supabase_record("document_versions", version_record, access_token)
    if version_status >= 300:
        if not is_update:
            delete_supabase_record("documents", document_id, access_token)
        storage_delete_object(storage_path, access_token)
        return jsonify({"error": "Failed to save the document version"}), 502

    if approval_status == "pending":
        submitted_by_id = safe_uuid(meta.get("uploadedById") or user.get("id"))
        approval_record = {
            "id": str(uuid4()),
            "document_id": document_id,
            "version_id": version_id,
            "submitted_by_id": submitted_by_id,
            "submitted_by_name": meta.get("uploadedByName") or user.get("name") or "Authorized User",
            "submitted_by_subsidiary": subsidiary,
            "submitted_at": uploaded_at,
            "priority": approval_priority,
            "status": "pending",
            "diff_summary": reason_for_change,
        }
        _, approval_status_code = persist_supabase_record("approvals", approval_record, access_token)
        if approval_status_code >= 300:
            delete_supabase_record("document_versions", version_id, access_token)
            if not is_update:
                delete_supabase_record("documents", document_id, access_token)
            storage_delete_object(storage_path, access_token)
            return jsonify({"error": "Failed to queue the approval review"}), 502

    for chunk in meta.get("chunks") or []:
        chunk_record = {
            "id": chunk.get("id") or str(uuid4()),
            "document_id": document_id,
            "version_id": version_id,
            "document_title": chunk.get("documentTitle"),
            "document_code": chunk.get("documentCode"),
            "version_number": chunk.get("versionNumber", version_record["version_number"]),
            "page_or_sheet_ref": chunk.get("pageOrSheetRef"),
            "subsidiary": chunk.get("subsidiary", subsidiary),
            "text": chunk.get("text"),
            "is_approved": chunk.get("isApproved", False),
            "topic_tag": chunk.get("topicTag"),
        }
        _, chunk_status = persist_supabase_record("document_chunks", chunk_record, access_token)
        if chunk_status >= 300:
            delete_supabase_record("document_versions", version_id, access_token)
            if not is_update:
                delete_supabase_record("documents", document_id, access_token)
            storage_delete_object(storage_path, access_token)
            return jsonify({"error": "Failed to index a document chunk"}), 502

    return jsonify({
        "documentId": document_id,
        "versionId": version_id,
        "storageFilePath": storage_path,
        "storageBucket": STORAGE_BUCKET,
    })


@app.post("/api/ai/ask")
def ask_ai() -> Any:
    data = request.get_json(silent=True) or {}
    question = data.get("question")
    if not isinstance(question, str) or not question.strip():
        return jsonify({"error": "Question is required"}), 400

    selected_document_id = data.get("selectedDocumentId")
    matches = approved_matches(
        question,
        data.get("approvedChunks", []),
        data.get("subsidiaryFilter"),
        selected_document_id if isinstance(selected_document_id, str) else None,
    )
    if not matches:
        return jsonify(missing_knowledge_result())

    ambiguous_matches = ambiguous_document_matches(question, matches) if not selected_document_id else []
    if ambiguous_matches:
        citations = citations_from_matches(ambiguous_matches)
        titles = ", ".join(f'"{citation["documentTitle"]}"' for citation in citations)
        return jsonify({
            "foundInKnowledgeBase": False,
            "requiresClarification": True,
            "answer": f"I found multiple relevant documents: {titles}. Which file should I use?",
            "aiSummary": "Document selection is required before generating a grounded answer.",
            "confidence": 0,
            "citations": citations,
            "provider": "document-disambiguation",
        })

    matches = matches[:6]

    parsed: dict[str, Any] | None = None
    provider = "local-grounded-engine"
    try:
        parsed = ask_xai(question, matches)
        provider = "xai-grok" if parsed else provider
        if not parsed:
            parsed = ask_groq(question, matches)
            provider = "groq" if parsed else provider
    except (HTTPError, URLError, KeyError, IndexError, json.JSONDecodeError) as error:
        print(f"AI provider unavailable: {error}")

    citations = citations_from_matches(matches)
    if parsed and parsed.get("foundInKnowledgeBase") and parsed.get("answer"):
        indices = parsed.get("citedChunkIndices")
        if isinstance(indices, list):
            selected = [matches[index - 1] for index in indices if isinstance(index, int) and 0 < index <= len(matches)]
            citations = citations_from_matches(selected or matches)
        return jsonify({
            "foundInKnowledgeBase": True,
            "answer": parsed["answer"],
            "aiSummary": parsed.get("aiSummary", str(parsed["answer"])[:120]),
            "confidence": min(100, max(85, int(parsed.get("confidence", 95)))),
            "citations": citations,
            "draftOfficialReply": parsed.get("draftOfficialReply"),
            "modelUsed": os.getenv("GROK_MODEL", "grok-4") if provider == "xai-grok" else os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            "provider": provider,
        })

    source_text = str(matches[0]["chunk"].get("text", "")).strip()
    return jsonify({
        "foundInKnowledgeBase": True,
        "answer": source_text,
        "aiSummary": source_text[:120],
        "confidence": 85,
        "citations": citations,
        "provider": provider,
    })


def human_title(file_name: str) -> str:
    name = Path(file_name).stem.replace("_", " ").replace("-", " ")
    return re.sub(r"\s+", " ", name).strip().title()


@app.post("/api/ai/summarize-document")
def summarize_document() -> Any:
    data = request.get_json(silent=True) or {}
    file_name = data.get("fileName")
    if not isinstance(file_name, str) or not file_name.strip():
        return jsonify({"error": "fileName is required"}), 400

    text = str(data.get("extractedText", "")).strip()
    lower = f"{file_name} {text}".lower()
    document_type = "geological_report"
    if any(word in lower for word in ("safety", "dgms", "sop", "manual", "haulage")):
        document_type = "safety_sop"
    elif any(word in lower for word in ("production", "dispatch", "overburden", "tonnes")):
        document_type = "production_sheet"
    elif any(word in lower for word in ("mine plan", "bench", "excavation", "sequence")):
        document_type = "mine_plan"

    lines = [line.strip() for line in text.splitlines() if len(line.strip()) > 20][:3]
    summary = ". ".join(lines)[:420] if lines else f"Technical documentation ingested from {file_name}."
    return jsonify({
        "title": human_title(file_name),
        "summary": summary,
        "detectedType": document_type,
        "tags": [human_title(file_name).split(" ")[0], document_type.replace("_", " "), data.get("subsidiary") or "CMPDI"],
        "keyHighlights": lines[:2],
        "provider": "intelligent-extractor",
    })


@app.post("/api/ai/report-intent")
def report_intent() -> Any:
    """Step 2 of the wizard — read the officer's request (or template pick) and
    resolve report type, subsidiary, period, metrics, and required source
    categories. Runs the same heuristics the frontend uses first (so it never
    fails silently), then asks a live LLM to confirm/correct when a key is
    configured in .env."""
    data = request.get_json(silent=True) or {}
    raw_request = str(data.get("rawRequest", "")).strip()
    if not raw_request:
        return jsonify({"error": "rawRequest is required"}), 400

    inferred_type = infer_report_type(raw_request)
    inferred_subsidiary = infer_subsidiary(raw_request)
    inferred_period = infer_period(raw_request)
    metrics = METRIC_SETS.get(inferred_type, METRIC_SETS["production_variance"])
    required_sources = SOURCE_SETS.get(inferred_type, SOURCE_SETS["production_variance"])

    system_prompt = (
        "You are the intent-classification engine for CMPDI/Coal India's statutory report wizard. "
        "Given an officer's plain-language report request, return strict JSON only (no prose, no markdown) "
        "with keys: reportType (one of production_variance, reserve_assessment, compliance_brief, safety_memo), "
        "subsidiary (one of ALL, CMPDI HQ, BCCL, SECL, NCL, CCL, ECL, WCL, MCL), "
        "period (a short human string such as 'August 2026' or 'FY 2025-26 (Q3)'), "
        "metrics (3 to 6 short metric labels this report type must cover), "
        "requiredSources (2 to 4 short source-document categories needed to compile it)."
    )
    user_prompt = (
        f"Officer request: \"{raw_request}\"\n"
        f"Request mode: {data.get('mode', 'ai')}\n"
        f"Current date: {data.get('currentDate') or datetime.now(timezone.utc).isoformat()}\n"
        f"Local heuristic guess — reportType: {inferred_type}, subsidiary: {inferred_subsidiary}, period: {inferred_period}.\n"
        "Confirm the heuristic guess if it looks right, correct it if not, and fill in metrics/requiredSources."
    )
    parsed, provider = call_llm_json(system_prompt, user_prompt, temperature=0.1)

    result: dict[str, Any] = {
        "reportType": inferred_type,
        "subsidiary": inferred_subsidiary,
        "period": inferred_period,
        "metrics": metrics,
        "requiredSources": required_sources,
        "provider": "local-heuristic-engine",
    }
    if parsed:
        if parsed.get("reportType") in METRIC_SETS:
            result["reportType"] = parsed["reportType"]
        if isinstance(parsed.get("subsidiary"), str) and parsed["subsidiary"].strip():
            result["subsidiary"] = parsed["subsidiary"].strip()
        if isinstance(parsed.get("period"), str) and parsed["period"].strip():
            result["period"] = parsed["period"].strip()
        if isinstance(parsed.get("metrics"), list) and parsed["metrics"]:
            result["metrics"] = [str(metric) for metric in parsed["metrics"]][:6]
        if isinstance(parsed.get("requiredSources"), list) and parsed["requiredSources"]:
            result["requiredSources"] = [str(source) for source in parsed["requiredSources"]][:4]
        result["provider"] = provider

    return jsonify(result)


@app.post("/api/ai/report-chat")
def report_chat() -> Any:
    """Step 5 'Ask AI about this report' panel — answers grounded strictly in
    the generated report's own content and its attached citations."""
    data = request.get_json(silent=True) or {}
    question = str(data.get("question", "")).strip()
    report_content = str(data.get("reportContent", "")).strip()
    citations = data.get("citations") if isinstance(data.get("citations"), list) else []

    if not question:
        return jsonify({"error": "question is required"}), 400
    if not report_content:
        return jsonify({"error": "reportContent is required"}), 400

    citation_lines = "\n".join(
        f"- {c.get('documentTitle', 'Unknown Source')} ({c.get('documentCode', '')} v{c.get('versionNumber', '')}, "
        f"{c.get('pageOrSheetRef', '')}): {str(c.get('excerpt', ''))[:200]}"
        for c in citations if isinstance(c, dict)
    )

    system_prompt = (
        "You are a statutory mining-report assistant. Answer the officer's question using ONLY the report "
        "content and citations given below — never invent figures, dates, or facts not present there. If the "
        "report doesn't address the question, say so plainly. Return strict JSON only with one key: "
        "answer (2-5 concise sentences, plain language)."
    )
    user_prompt = (
        f"Report content:\n{report_content[:6000]}\n\n"
        f"Attached citations:\n{citation_lines or 'None'}\n\n"
        f"Officer question: {question}"
    )
    parsed, provider = call_llm_json(system_prompt, user_prompt, temperature=0.2)
    if parsed and isinstance(parsed.get("answer"), str) and parsed["answer"].strip():
        return jsonify({"answer": parsed["answer"].strip(), "provider": provider})

    # No AI provider configured / call failed — grounded local fallback:
    # return whichever paragraph of the report best matches the question.
    paragraphs = [p.strip() for p in report_content.split("\n\n") if len(p.strip()) > 30]
    terms = [term for term in re.sub(r"[^a-z0-9\s]", " ", question.lower()).split() if len(term) > 2]
    best_paragraph, best_score = None, 0
    for paragraph in paragraphs:
        score = sum(1 for term in terms if term in paragraph.lower())
        if score > best_score:
            best_paragraph, best_score = paragraph, score
    answer = best_paragraph or "The report does not directly address this question — please review the attached source citations for further context."
    return jsonify({"answer": answer, "provider": "local-grounded-fallback"})


@app.post("/api/ai/report")
def generate_report() -> Any:
    data = request.get_json(silent=True) or {}
    chunks = data.get("selectedChunks", [])
    unique_chunks: list[dict[str, Any]] = []
    seen = set()
    for chunk in chunks if isinstance(chunks, list) else []:
        text = re.sub(r"\s+", " ", str(chunk.get("text", "")).strip())
        key = (chunk.get("id"), text)
        if text and key not in seen:
            seen.add(key)
            unique_chunks.append(chunk)

    subsidiary = data.get("subsidiary") or "All Subsidiaries"
    template = data.get("templateTitle") or "Statutory Compliance Brief"
    period = data.get("period") or "Current FY"
    if not unique_chunks:
        content = (
            f"## 1. Statutory Context & Executive Directive\nThis **{template}** has been initiated for "
            f"**{subsidiary}** covering review period **{period}**.\n\n---\n\n"
            "## 2. Synthesized Technical Findings\n*No approved statutory technical filings or operational telemetry "
            f"currently registered for **{subsidiary}**.*"
        )
        return jsonify({"content": content, "summary": f"No approved {subsidiary} document sources found in repository for synthesis.", "citations": []})

    sources: dict[str, dict[str, Any]] = {}
    for chunk in unique_chunks:
        key = str(chunk.get("documentId") or chunk.get("documentCode") or chunk.get("documentTitle"))
        source = sources.setdefault(key, {"title": chunk.get("documentTitle") or "Technical Filing", "code": chunk.get("documentCode") or "CMPDI/DOC", "versions": set(), "refs": set()})
        source["versions"].add(chunk.get("versionNumber") or 1)
        if chunk.get("pageOrSheetRef"):
            source["refs"].add(chunk["pageOrSheetRef"])

    source_lines = "\n".join(f"- **{item['title']}** ({item['code']} {', '.join(f'v{version}.0' for version in sorted(item['versions']))})" for item in sources.values())
    observations = "\n\n".join(f"**Point 2.{index}** *({chunk.get('documentCode', 'CMPDI')}, {chunk.get('pageOrSheetRef', 'Archive')})*\n{chunk['text'].strip()}" for index, chunk in enumerate(unique_chunks, start=1))
    deterministic_content = (
        f"## 1. Statutory Context & Executive Directive\nThis **{template}** has been formally compiled for "
        f"**{subsidiary}** covering review period **{period}**.\n\n---\n\n"
        f"## 2. Synthesized Technical Findings\n{source_lines}\n\n### Detailed Observations & Geological/Operational Parameters:\n\n{observations}\n\n---\n\n"
        "## 3. Statutory Action Items & Compliance Directives\n1. **Operational Reconciliation**: Reconcile shift logs against approved baseline parameters.\n2. **Variance Notification**: Escalate material operational deviations.\n3. **Statutory Archive**: Cross-reference this briefing in the MineMind Knowledge Base."
    )
    deterministic_summary = f"Synthesized official {template} across {len(sources)} unique document sources ({len(unique_chunks)} distinct data points) for {subsidiary}."
    citations = citations_from_matches([{"chunk": chunk} for chunk in unique_chunks])

    # Attempt a live, AI-polished synthesis strictly grounded in the same
    # numbered source excerpts. Falls back to the deterministic template
    # above if no provider key is configured in .env, or the call fails.
    extracted_metrics = data.get("extractedMetrics") or []
    validation = data.get("validation") or {}
    context_blob = "\n\n".join(
        f"[SOURCE {index}] {chunk.get('documentTitle', 'Technical Filing')} "
        f"({chunk.get('documentCode', 'CMPDI/DOC')}, {chunk.get('pageOrSheetRef', 'Archive')}):\n{str(chunk.get('text', ''))[:600]}"
        for index, chunk in enumerate(unique_chunks, start=1)
    )
    system_prompt = (
        "You are a statutory report-writing engine for CMPDI/Coal India. Write ONLY using facts present in the "
        "numbered SOURCE excerpts supplied below — never invent figures, dates, or approvals that aren't there. "
        "Every factual clause must cite its source inline as (SOURCE n). Return strict JSON only with keys: "
        "content (a Markdown report using '## 1. Statutory Context & Executive Directive', "
        "'## 2. Synthesized Technical Findings', and '## 3. Statutory Action Items & Compliance Directives' as "
        "section headers) and summary (one sentence describing what was synthesized)."
    )
    user_prompt = (
        f"Report template: {template}\nSubsidiary: {subsidiary}\nPeriod: {period}\n"
        f"Required metrics: {', '.join(str(m) for m in extracted_metrics) if extracted_metrics else 'not specified'}\n"
        f"Validation confidence from Step 4: {validation.get('confidence', 'n/a')}%\n\n"
        f"Numbered source excerpts:\n{context_blob}"
    )
    parsed, provider = call_llm_json(system_prompt, user_prompt, temperature=0.15)
    if parsed and isinstance(parsed.get("content"), str) and parsed["content"].strip():
        return jsonify({
            "content": parsed["content"].strip(),
            "summary": parsed.get("summary", deterministic_summary),
            "citations": citations,
            "provider": provider,
        })

    return jsonify({"content": deterministic_content, "summary": deterministic_summary, "citations": citations, "provider": "local-grounded-engine"})


@app.get("/")
@app.get("/<path:route>")
def frontend(route: str = "") -> Any:
    requested_file = DIST_DIR / route
    if route and requested_file.is_file():
        return send_from_directory(DIST_DIR, route)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    load_dotenv()
    if not (DIST_DIR / "index.html").exists():
        ensure_frontend_build()
    print(f"MineMind Python server running at http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)