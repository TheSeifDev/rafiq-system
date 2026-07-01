# beta_telemetry.py — Lightweight Beta Session Tracker
# Records per-session voice pipeline events into the observability DB
# for collecting real-world false cutoffs, false activations, STT latency,
# RAG quality, and structured output failures.

import time
import json
import logging
import sqlite3
from pathlib import Path
from src.config import settings

log = logging.getLogger("rafiq.beta")

BETA_DB_PATH = settings.BASE_DIR / "data/.rafiq_cache" / "observability.db"

_beta_conn = None

def _get_conn():
    global _beta_conn
    if _beta_conn is None:
        try:
            BETA_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            _beta_conn = sqlite3.connect(str(BETA_DB_PATH), check_same_thread=False)
            _beta_conn.execute("""
                CREATE TABLE IF NOT EXISTS beta_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_ts REAL NOT NULL,
                    vad_method TEXT NOT NULL,
                    speech_detected INTEGER NOT NULL,
                    vad_duration_ms REAL,
                    stt_latency_ms REAL,
                    stt_text TEXT,
                    stt_language TEXT,
                    rag_used INTEGER DEFAULT 0,
                    rag_chunks_returned INTEGER DEFAULT 0,
                    rag_latency_ms REAL,
                    structured_output_success INTEGER DEFAULT 0,
                    structured_output_failure INTEGER DEFAULT 0,
                    fallback_parser_used INTEGER DEFAULT 0,
                    llm_latency_ms REAL,
                    error TEXT
                )
            """)
            _beta_conn.execute("PRAGMA journal_mode=WAL")
            _beta_conn.commit()
        except Exception as e:
            log.warning(f"Beta telemetry DB init failed: {e}")
    return _beta_conn


def record_vad_event(vad_method: str, speech_detected: bool, duration_ms: float):
    """Record a VAD detection event (speech found or silence timeout)."""
    conn = _get_conn()
    if not conn:
        return
    try:
        conn.execute(
            "INSERT INTO beta_sessions (session_ts, vad_method, speech_detected, vad_duration_ms) VALUES (?, ?, ?, ?)",
            (time.time(), vad_method, int(speech_detected), duration_ms)
        )
        conn.commit()
    except Exception:
        pass


def record_stt_result(latency_ms: float, text: str | None, language: str | None):
    """Update the most recent beta session row with STT results."""
    conn = _get_conn()
    if not conn:
        return
    try:
        conn.execute(
            "UPDATE beta_sessions SET stt_latency_ms=?, stt_text=?, stt_language=? WHERE id=(SELECT MAX(id) FROM beta_sessions)",
            (latency_ms, text or "", language or "")
        )
        conn.commit()
    except Exception:
        pass


def record_rag_result(chunks_returned: int, latency_ms: float):
    """Update the most recent beta session row with RAG retrieval results."""
    conn = _get_conn()
    if not conn:
        return
    try:
        conn.execute(
            "UPDATE beta_sessions SET rag_used=1, rag_chunks_returned=?, rag_latency_ms=? WHERE id=(SELECT MAX(id) FROM beta_sessions)",
            (chunks_returned, latency_ms)
        )
        conn.commit()
    except Exception:
        pass


def record_structured_output(success: bool, fallback_used: bool):
    """Update the most recent beta session row with structured output parsing results."""
    conn = _get_conn()
    if not conn:
        return
    try:
        conn.execute(
            "UPDATE beta_sessions SET structured_output_success=?, structured_output_failure=?, fallback_parser_used=? WHERE id=(SELECT MAX(id) FROM beta_sessions)",
            (int(success), int(not success), int(fallback_used))
        )
        conn.commit()
    except Exception:
        pass


def record_llm_latency(latency_ms: float):
    """Update the most recent beta session row with LLM generation latency."""
    conn = _get_conn()
    if not conn:
        return
    try:
        conn.execute(
            "UPDATE beta_sessions SET llm_latency_ms=? WHERE id=(SELECT MAX(id) FROM beta_sessions)",
            (latency_ms,)
        )
        conn.commit()
    except Exception:
        pass


def record_error(error_msg: str):
    """Update the most recent beta session row with an error."""
    conn = _get_conn()
    if not conn:
        return
    try:
        conn.execute(
            "UPDATE beta_sessions SET error=? WHERE id=(SELECT MAX(id) FROM beta_sessions)",
            (error_msg,)
        )
        conn.commit()
    except Exception:
        pass


def get_beta_summary() -> dict:
    """Generate aggregate summary of all beta sessions collected so far."""
    conn = _get_conn()
    if not conn:
        return {"error": "DB unavailable"}

    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM beta_sessions")
        total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM beta_sessions WHERE speech_detected=1")
        speech_detected = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM beta_sessions WHERE speech_detected=0")
        no_speech = cursor.fetchone()[0]

        # VAD method distribution
        cursor.execute("SELECT vad_method, COUNT(*) FROM beta_sessions GROUP BY vad_method")
        vad_methods = {r[0]: r[1] for r in cursor.fetchall()}

        # STT latency stats
        cursor.execute("SELECT AVG(stt_latency_ms), MIN(stt_latency_ms), MAX(stt_latency_ms) FROM beta_sessions WHERE stt_latency_ms IS NOT NULL")
        stt_row = cursor.fetchone()

        # RAG stats
        cursor.execute("SELECT COUNT(*), AVG(rag_chunks_returned), AVG(rag_latency_ms) FROM beta_sessions WHERE rag_used=1")
        rag_row = cursor.fetchone()

        # Structured output stats
        cursor.execute("SELECT SUM(structured_output_success), SUM(structured_output_failure), SUM(fallback_parser_used) FROM beta_sessions")
        so_row = cursor.fetchone()

        # LLM latency
        cursor.execute("SELECT AVG(llm_latency_ms), MIN(llm_latency_ms), MAX(llm_latency_ms) FROM beta_sessions WHERE llm_latency_ms IS NOT NULL")
        llm_row = cursor.fetchone()

        # Error count
        cursor.execute("SELECT COUNT(*) FROM beta_sessions WHERE error IS NOT NULL AND error != ''")
        error_count = cursor.fetchone()[0]

        # False cutoffs = speech_detected=0 AND vad_duration < timeout (approx: short sessions with no speech)
        # False activations = speech_detected=1 AND stt_text is empty or None
        cursor.execute("SELECT COUNT(*) FROM beta_sessions WHERE speech_detected=1 AND (stt_text IS NULL OR stt_text='')")
        false_activations = cursor.fetchone()[0]

        # TTS stats
        try:
            cursor.execute("SELECT COUNT(*), SUM(interrupted), SUM(overlap_prevented) FROM tts_metrics")
            tts_row = cursor.fetchone()
            tts_total = tts_row[0] or 0
            tts_interrupted = tts_row[1] or 0
            tts_prevented = tts_row[2] or 0
        except Exception:
            tts_total, tts_interrupted, tts_prevented = 0, 0, 0

        return {
            "total_sessions": total,
            "speech_detected": speech_detected,
            "no_speech_timeout": no_speech,
            "false_activations": false_activations,
            "vad_method_distribution": vad_methods,
            "stt_latency_avg_ms": round(stt_row[0] or 0, 1),
            "stt_latency_min_ms": round(stt_row[1] or 0, 1),
            "stt_latency_max_ms": round(stt_row[2] or 0, 1),
            "rag_queries": rag_row[0] or 0,
            "rag_avg_chunks": round(rag_row[1] or 0, 1),
            "rag_avg_latency_ms": round(rag_row[2] or 0, 1),
            "structured_output_successes": so_row[0] or 0,
            "structured_output_failures": so_row[1] or 0,
            "fallback_parser_used": so_row[2] or 0,
            "llm_latency_avg_ms": round(llm_row[0] or 0, 1),
            "llm_latency_min_ms": round(llm_row[1] or 0, 1),
            "llm_latency_max_ms": round(llm_row[2] or 0, 1),
            "error_count": error_count,
            "tts_total_plays": tts_total,
            "tts_interrupted_count": tts_interrupted,
            "tts_overlap_prevented_count": tts_prevented,
        }
    except Exception as e:
        return {"error": str(e)}
