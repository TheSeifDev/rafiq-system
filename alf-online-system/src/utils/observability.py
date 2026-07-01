# observability.py — Unified JSON Logging, Request Tracing, and SQLite Metrics Store

import os
import sys
import json
import time
import sqlite3
import logging
import traceback
import contextvars
import datetime
from pathlib import Path
from src.config import settings

# Tracing context variables
request_id_var = contextvars.ContextVar("request_id", default="-")
session_id_var = contextvars.ContextVar("session_id", default="-")

OBS_DB_PATH = settings.BASE_DIR / "data/.rafiq_cache" / "observability.db"

# Internal connection tracker
_db_conn = None

def get_obs_db():
    global _db_conn
    if _db_conn is None:
        try:
            OBS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            _db_conn = sqlite3.connect(str(OBS_DB_PATH), check_same_thread=False)
            _db_conn.execute("""
                CREATE TABLE IF NOT EXISTS latency_metrics (
                    timestamp REAL NOT NULL,
                    metric_type TEXT NOT NULL,
                    latency_ms REAL NOT NULL,
                    request_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    extra_info TEXT
                )
            """)
            _db_conn.execute("""
                CREATE TABLE IF NOT EXISTS cache_metrics (
                    timestamp REAL NOT NULL,
                    metric_type TEXT NOT NULL,
                    hit_or_miss TEXT NOT NULL,
                    request_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    cache_key TEXT NOT NULL
                )
            """)
            _db_conn.execute("""
                CREATE TABLE IF NOT EXISTS error_logs (
                    timestamp REAL NOT NULL,
                    error_class TEXT NOT NULL,
                    error_message TEXT NOT NULL,
                    traceback TEXT NOT NULL,
                    request_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    context TEXT
                )
            """)
            _db_conn.execute("""
                CREATE TABLE IF NOT EXISTS tts_metrics (
                    timestamp REAL NOT NULL,
                    text_length INTEGER NOT NULL,
                    queue_size INTEGER NOT NULL,
                    interrupted INTEGER NOT NULL,
                    overlap_prevented INTEGER NOT NULL
                )
            """)
            _db_conn.execute("PRAGMA journal_mode=WAL")
            _db_conn.commit()
        except Exception as e:
            # Silence internal DB errors to avoid logging loops
            pass
    return _db_conn

class JSONFormatter(logging.Formatter):
    """Formats log records as raw structured JSON."""
    def format(self, record):
        log_entry = {
            "timestamp": datetime.datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(),
            "session_id": session_id_var.get()
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
            
        # Append extra fields if passed via extra={}
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)
            
        if hasattr(record, "metrics"):
            log_entry["metrics"] = record.metrics
            
        return json.dumps(log_entry, ensure_ascii=False)

def setup_structured_logging():
    """Converts the root logger and standard handlers to JSON output format."""
    root_logger = logging.getLogger()
    # Clear existing stdout handlers
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

# Structured Logging & Metrics APIs
def log_latency(metric_type: str, latency_ms: float, extra_info: dict = None):
    """Logs a latency metric and persists it to the local SQLite database."""
    req_id = request_id_var.get()
    sess_id = session_id_var.get()
    timestamp = time.time()
    
    # Write to local DB
    db = get_obs_db()
    if db:
        try:
            extra_str = json.dumps(extra_info, ensure_ascii=False) if extra_info else None
            db.execute(
                "INSERT INTO latency_metrics (timestamp, metric_type, latency_ms, request_id, session_id, extra_info) VALUES (?, ?, ?, ?, ?, ?)",
                (timestamp, metric_type, latency_ms, req_id, sess_id, extra_str)
            )
            db.commit()
        except Exception:
            pass
            
    # Output structured log
    logger = logging.getLogger(f"rafiq.metrics.{metric_type}")
    logger.info(
        f"Metric: {metric_type} completed in {latency_ms:.2f} ms",
        extra={
            "metrics": {
                "metric_type": metric_type,
                "latency_ms": latency_ms,
                "extra_info": extra_info
            }
        }
    )

def log_cache_event(metric_type: str, hit_or_miss: str, cache_key: str):
    """Persists a cache hit/miss metric event to the SQLite database."""
    req_id = request_id_var.get()
    sess_id = session_id_var.get()
    timestamp = time.time()
    
    db = get_obs_db()
    if db:
        try:
            db.execute(
                "INSERT INTO cache_metrics (timestamp, metric_type, hit_or_miss, request_id, session_id, cache_key) VALUES (?, ?, ?, ?, ?, ?)",
                (timestamp, metric_type, hit_or_miss, req_id, sess_id, cache_key)
            )
            db.commit()
        except Exception:
            pass
            
    # Structured cache logging
    logger = logging.getLogger(f"rafiq.metrics.cache.{metric_type}")
    logger.info(
        f"Cache {hit_or_miss.upper()} on '{metric_type}': {cache_key}",
        extra={
            "metrics": {
                "metric_type": f"cache_{metric_type}",
                "hit_or_miss": hit_or_miss,
                "cache_key": cache_key
            }
        }
    )

def log_exception(exc: Exception, context: str = "", extra_info: dict = None):
    """Logs an exception with traceback and records it in the aggregated error database."""
    req_id = request_id_var.get()
    sess_id = session_id_var.get()
    timestamp = time.time()
    
    err_class = exc.__class__.__name__
    err_msg = str(exc)
    tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    
    db = get_obs_db()
    if db:
        try:
            db.execute(
                "INSERT INTO error_logs (timestamp, error_class, error_message, traceback, request_id, session_id, context) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (timestamp, err_class, err_msg, tb_str, req_id, sess_id, context)
            )
            db.commit()
        except Exception:
            pass
            
    # Write to error log
    logger = logging.getLogger("rafiq.errors")
    logger.error(
        f"Exception occurred in context '{context}': {err_class}: {err_msg}",
        exc_info=exc,
        extra={
            "extra_fields": {
                "context": context,
                "error_class": err_class,
                "extra_info": extra_info
            }
        }
    )

def log_tts_metric(text_length: int, queue_size: int, interrupted: bool, overlap_prevented: bool):
    """Persists a TTS metric event to the SQLite database."""
    timestamp = time.time()
    db = get_obs_db()
    if db:
        try:
            db.execute(
                "INSERT INTO tts_metrics (timestamp, text_length, queue_size, interrupted, overlap_prevented) VALUES (?, ?, ?, ?, ?)",
                (timestamp, text_length, queue_size, int(interrupted), int(overlap_prevented))
            )
            db.commit()
        except Exception:
            pass

class measure_latency:
    """Context manager to measure latency of code blocks and log it."""
    def __init__(self, metric_type: str, extra_info: dict = None):
        self.metric_type = metric_type
        self.extra_info = extra_info
        
    def __enter__(self):
        self.start = time.perf_counter()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (time.perf_counter() - self.start) * 1000
        if exc_type:
            log_exception(exc_val, context=f"latency_measure:{self.metric_type}", extra_info=self.extra_info)
        log_latency(self.metric_type, duration, self.extra_info)

# Report Generation
def generate_daily_report() -> str:
    """Queries SQLite tables to build a markdown summary report of metrics and errors."""
    db = get_obs_db()
    if not db:
        return "Observability database unavailable."
        
    now = time.time()
    one_day_ago = now - 24 * 60 * 60
    
    try:
        # 1. Latency Metrics
        cursor = db.cursor()
        cursor.execute("""
            SELECT metric_type, COUNT(*), AVG(latency_ms), MIN(latency_ms), MAX(latency_ms)
            FROM latency_metrics
            WHERE timestamp >= ?
            GROUP BY metric_type
        """, (one_day_ago,))
        latency_rows = cursor.fetchall()
        
        # 2. Cache Metrics
        cursor.execute("""
            SELECT metric_type, hit_or_miss, COUNT(*)
            FROM cache_metrics
            WHERE timestamp >= ?
            GROUP BY metric_type, hit_or_miss
        """, (one_day_ago,))
        cache_rows = cursor.fetchall()
        
        # 3. Error logs
        cursor.execute("""
            SELECT error_class, context, COUNT(*)
            FROM error_logs
            WHERE timestamp >= ?
            GROUP BY error_class, context
            ORDER BY COUNT(*) DESC
        """, (one_day_ago,))
        error_rows = cursor.fetchall()
        
        # 4. TTS Metrics
        cursor.execute("""
            SELECT COUNT(*), SUM(interrupted), SUM(overlap_prevented), MAX(queue_size), AVG(queue_size)
            FROM tts_metrics
            WHERE timestamp >= ?
        """, (one_day_ago,))
        tts_row = cursor.fetchone()
        
    except Exception as e:
        return f"Failed to generate report from database: {e}"

    # Parse Cache hits/misses
    cache_stats = {}
    for mtype, outcome, count in cache_rows:
        if mtype not in cache_stats:
            cache_stats[mtype] = {"hits": 0, "misses": 0}
        if outcome == "hit":
            cache_stats[mtype]["hits"] += count
        else:
            cache_stats[mtype]["misses"] += count
            
    # Parse TTS metrics
    tts_stats = {"count": 0, "interrupted": 0, "prevented": 0, "max_queue": 0, "avg_queue": 0.0}
    if tts_row and tts_row[0] > 0:
        tts_stats = {
            "count": tts_row[0],
            "interrupted": tts_row[1] or 0,
            "prevented": tts_row[2] or 0,
            "max_queue": tts_row[3] or 0,
            "avg_queue": round(tts_row[4] or 0.0, 2)
        }

    # Format Report Markdown
    lines = [
        "# 📊 Rafiq Daily System Metrics Summary Report",
        f"Generated at: {datetime.datetime.now().isoformat()}",
        "",
        "## ⏱️ Subsystem Latency Metrics (Last 24 Hours)",
        "| Subsystem Type | Request Count | Average Latency | Min Latency | Max Latency |",
        "| :--- | :---: | :---: | :---: | :---: |"
    ]
    
    if not latency_rows:
        lines.append("| No latency data recorded | - | - | - | - |")
    else:
        for mtype, count, avg, min_val, max_val in latency_rows:
            lines.append(f"| **{mtype.upper()}** | {count} | {avg:.2f} ms | {min_val:.2f} ms | {max_val:.2f} ms |")
            
    lines.extend([
        "",
        "## 💾 Cache Hit / Miss Ratios (Last 24 Hours)",
        "| Cache Category | Hit Count | Miss Count | Hit Rate |",
        "| :--- | :---: | :---: | :---: |"
    ])
    
    if not cache_stats:
        lines.append("| No cache actions recorded | - | - | - |")
    else:
        for mtype, stats in cache_stats.items():
            hits = stats["hits"]
            misses = stats["misses"]
            total = hits + misses
            hit_rate = (hits / total * 100) if total > 0 else 0.0
            lines.append(f"| **{mtype.upper()}** | {hits} | {misses} | {hit_rate:.1f}% |")
            
    lines.extend([
        "",
        "## ⚠️ Aggregated Error Logs (Last 24 Hours)",
        "| Error Class | Call Context | Occurrence Count |",
        "| :--- | :--- | :---: |"
    ])
    
    if not error_rows:
        lines.append("| No errors recorded (Healthy system) | - | 0 |")
    else:
        for err_cls, ctx, count in error_rows:
            lines.append(f"| `{err_cls}` | {ctx} | **{count}** |")
            
    lines.extend([
        "",
        "## 📢 TTS Playout & Concurrency Metrics (Last 24 Hours)",
        f"- **Total Speech Plays**: {tts_stats['count']}",
        f"- **Interrupted Speech Events (Barge-in/Preemption)**: {tts_stats['interrupted']}",
        f"- **Overlap Prevention Events (Queued/Avoided)**: {tts_stats['prevented']}",
        f"- **Max Playout Queue Size**: {tts_stats['max_queue']}",
        f"- **Average Playout Queue Size**: {tts_stats['avg_queue']}",
    ])
            
    return "\n".join(lines)
