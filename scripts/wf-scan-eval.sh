#!/usr/bin/env bash
# wf-scan-eval.sh — Evaluate scan fixtures against the vision model,
# then always restore the coding model.
#
# Usage:
#   ./scripts/wf-scan-eval.sh
#
# Required env (or set defaults below):
#   SCAN_API_BASE_URL  — Ollama /v1 endpoint reachable from this host
#   SCAN_API_KEY       — API key (ollama ignores it; "ollama" is fine)
#   SCAN_MODEL         — Vision model tag  (default: qwen3.6:27b)
#   CODING_MODEL       — Coding model tag   (default: llama3.3:8b)
#   OLLAMA_HOST        — Ollama API base   (default: http://127.0.0.1:11434)
#
# Results go to ~/wf-helper-evals/<timestamp>/

set -euo pipefail

# ── Configuration ───────────────────────────────────────────────────
SCAN_API_BASE_URL="${SCAN_API_BASE_URL:-http://127.0.0.1:11434/v1}"
SCAN_API_KEY="${SCAN_API_KEY:-ollama}"
SCAN_MODEL="${SCAN_MODEL:-qwen3.6:27b}"
CODING_MODEL="${CODING_MODEL:-llama3.3:8b}"
OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"

EVAL_DIR="${HOME}/wf-helper-evals"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="${EVAL_DIR}/${TIMESTAMP}"

# Timeouts (seconds)
PULL_TIMEOUT=300        # vision model pull
EVAL_TIMEOUT=600        # entire fixture evaluation
RESTORE_TIMEOUT=300     # restore coding model
HEALTH_INTERVAL=5       # polling interval for ollama health

# ── Helpers ─────────────────────────────────────────────────────────
log() { printf '[%s] %s\n' "$(date +%T)" "$*" >&2; }
die() { log "FATAL: $*"; exit 1; }

mkdir -p "$RUN_DIR"

# Redirect stdout+stderr of this script into a persistent log too
exec > >(tee "${RUN_DIR}/run.log") 2> >(tee "${RUN_DIR}/run.log" >&2)

# ── Restore function (called by trap on EXIT/INT/TERM) ──────────────
restore_coding_model() {
    local exit_code=$?
    log "─────────────────────────────────────────────"
    log "RESTORE: ensuring coding model ${CODING_MODEL} is running"

    # Check if already loaded
    if curl -sf "${OLLAMA_HOST}/api/tags" | grep -q "\"name\":\"${CODING_MODEL}\""; then
        log "RESTORE: ${CODING_MODEL} already loaded — skipping pull"
    else
        log "RESTORE: loading ${CODING_MODEL}"
        timeout "${RESTORE_TIMEOUT}" ollama pull "${CODING_MODEL}" \
            || log "RESTORE: ollama pull ${CODING_MODEL} failed or timed out"
    fi

    # Warm it with a trivial call so it stays resident
    log "RESTORE: warming ${CODING_MODEL}"
    timeout 60 curl -sf -X POST "${OLLAMA_HOST}/api/generate" \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"${CODING_MODEL}\",\"prompt\":\".\",\"stream\":false}" \
        >/dev/null 2>&1 \
        || log "RESTORE: warm call to ${CODING_MODEL} timed out (may still load)"

    log "RESTORE: done"

    # Summary
    if [ "${exit_code}" -eq 0 ]; then
        log "RESULT: evaluation PASSED"
    else
        log "RESULT: evaluation FAILED (exit ${exit_code})"
    fi

    log "LOGS: ${RUN_DIR}/"
}
trap restore_coding_model EXIT INT TERM

# ── Phase 0: Pre-flight ─────────────────────────────────────────────
log "═══════════════════════════════════════════════"
log "wf-scan-eval v1"
log "Vision model : ${SCAN_MODEL}"
log "Coding model : ${CODING_MODEL}"
log "Ollama host  : ${OLLAMA_HOST}"
log "Results dir  : ${RUN_DIR}"
log "═══════════════════════════════════════════════"

# Verify Ollama is reachable
log "CHECK: Ollama connectivity"
if ! curl -sf "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
    die "Ollama is not reachable at ${OLLAMA_HOST}. Start Ollama first."
fi

# ── Phase 1: Load vision model ──────────────────────────────────────
log "PHASE 1: loading vision model ${SCAN_MODEL}"

if curl -sf "${OLLAMA_HOST}/api/tags" | grep -q "\"name\":\"${SCAN_MODEL}\""; then
    log "PHASE 1: ${SCAN_MODEL} already loaded"
else
    log "PHASE 1: pulling ${SCAN_MODEL} (timeout ${PULL_TIMEOUT}s)"
    timeout "${PULL_TIMEOUT}" ollama pull "${SCAN_MODEL}" || {
        die "Failed to pull ${SCAN_MODEL}. Restore will still run."
    }
fi

# Warm the vision model so the first eval call isn't cold
log "PHASE 1: warming ${SCAN_MODEL}"
timeout 120 curl -sf -X POST "${OLLAMA_HOST}/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"${SCAN_MODEL}\",\"prompt\":\".\",\"stream\":false}" \
    >/dev/null 2>&1 \
    || log "PHASE 1: warm call timed out (will proceed anyway)"

# ── Phase 2: Run scan-fixture evaluation ────────────────────────────
log "PHASE 2: running scan-fixture evaluation (timeout ${EVAL_TIMEOUT}s)"

cd "$(dirname "$0")/.."

export SCAN_API_BASE_URL
export SCAN_API_KEY
export SCAN_MODEL

# Capture eval output separately
EVAL_OUTPUT="${RUN_DIR}/eval-output.txt"

# Capture exit code despite set -e
set +e
timeout "${EVAL_TIMEOUT}" \
    pnpm --filter @workspace/api-server run eval:scan-fixtures \
    > "${EVAL_OUTPUT}" 2>&1
EVAL_EXIT=$?
set -e

# Copy the full log into the run directory for persistence
cp "${RUN_DIR}/run.log" "${RUN_DIR}/full-run.log"

if [ "${EVAL_EXIT}" -ne 0 ]; then
    log "PHASE 2: evaluation exited with code ${EVAL_EXIT}"
    log "PHASE 2: see ${EVAL_OUTPUT} for details"
    exit 1
fi

log "PHASE 2: evaluation completed successfully"
log "PHASE 2: results → ${EVAL_OUTPUT}"

log "═══════════════════════════════════════════════"
log "All done. Restore will run automatically."
log "═══════════════════════════════════════════════"

exit 0
