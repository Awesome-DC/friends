import os
import json
import uuid
import random
import string
from flask import Flask, request, jsonify, g, make_response
from flask_cors import CORS

app = Flask(__name__)

# ── CORS ─────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    # "http://localhost:5173",
    # "http://localhost:4173",
    "https://friends.hazel.vercel.app",
]

CORS(
    app,
    origins=ALLOWED_ORIGINS,
    methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=False,
)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get("Origin", "")
        res = make_response()
        if origin in ALLOWED_ORIGINS:
            res.headers["Access-Control-Allow-Origin"]  = origin
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
        res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return res, 200


# ── DB detection ─────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")
USE_POSTGRES  = bool(DATABASE_URL)

if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras
    print("🐘 Using Postgres")
else:
    import sqlite3
    DB_PATH = "friendquiz.db"
    print("🗄️  Using SQLite")


# ── DB connection ─────────────────────────────────────────────

def get_db():
    if "db" not in g:
        if USE_POSTGRES:
            g.db = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        else:
            g.db = sqlite3.connect(DB_PATH)
            g.db.row_factory = sqlite3.Row
            g.db.execute("PRAGMA journal_mode=WAL")
            g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db:
        db.close()


def db_exec(sql, params=(), fetchone=False, fetchall=False):
    """Unified query runner — swaps ? to %s for Postgres automatically.
    Only replaces ? that are actual placeholders (not inside strings).
    """
    db = get_db()
    if USE_POSTGRES:
        # Replace only standalone ? placeholders, not ? inside strings
        # We do this by counting params and replacing exactly that many ?
        pg_sql = sql
        count = len(params)
        result = []
        placeholder_n = 0
        i = 0
        while i < len(pg_sql):
            if pg_sql[i] == "?" and placeholder_n < count:
                result.append("%s")
                placeholder_n += 1
            else:
                result.append(pg_sql[i])
            i += 1
        pg_sql = "".join(result)
        cur = db.cursor()
        cur.execute(pg_sql, params)
        if fetchone:  return cur.fetchone()
        if fetchall:  return cur.fetchall()
        return cur
    else:
        if fetchone:  return db.execute(sql, params).fetchone()
        if fetchall:  return db.execute(sql, params).fetchall()
        return db.execute(sql, params)


def db_commit():
    get_db().commit()


def row_to_dict(row):
    return dict(row) if row else None


def init_db():
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        cur  = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS quizzes (
                id           TEXT PRIMARY KEY,
                code         TEXT UNIQUE NOT NULL,
                creator_name TEXT NOT NULL,
                answers      TEXT NOT NULL DEFAULT '{}',
                sets         TEXT DEFAULT '[]',
                created_at   TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS quiz_results (
                id           TEXT PRIMARY KEY,
                quiz_id      TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                player_name  TEXT NOT NULL,
                relation     TEXT NOT NULL DEFAULT 'Friend',
                score        INTEGER NOT NULL,
                total        INTEGER NOT NULL,
                percentage   INTEGER NOT NULL,
                answers      TEXT NOT NULL,
                taken_at     TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS notifications (
                id           TEXT PRIMARY KEY,
                quiz_id      TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                message      TEXT NOT NULL,
                is_read      INTEGER NOT NULL DEFAULT 0,
                created_at   TIMESTAMPTZ DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_quizzes_code ON quizzes(code);
            CREATE INDEX IF NOT EXISTS idx_results_quiz ON quiz_results(quiz_id);
            CREATE INDEX IF NOT EXISTS idx_notifs_quiz  ON notifications(quiz_id);
        """)
        conn.commit()
        cur.close()
        conn.close()
        # Safe migrations using fresh connections
        for migration in [
            "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS sets TEXT DEFAULT '[]'",
            "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS password TEXT DEFAULT ''",
        ]:
            conn2 = psycopg2.connect(DATABASE_URL)
            try:
                cur2 = conn2.cursor()
                cur2.execute(migration)
                conn2.commit()
                print(f"✅ Migration ok: {migration[:50]}")
            except Exception as e:
                conn2.rollback()
                print(f"Migration note: {e}")
            finally:
                cur2.close()
                conn2.close()
        print("✅ Postgres tables ready")
    else:
        db = sqlite3.connect(DB_PATH)
        db.executescript("""
            CREATE TABLE IF NOT EXISTS quizzes (
                id           TEXT PRIMARY KEY,
                code         TEXT UNIQUE NOT NULL,
                creator_name TEXT NOT NULL,
                answers      TEXT NOT NULL DEFAULT '{}',
                sets         TEXT DEFAULT '[]',
                created_at   TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS quiz_results (
                id           TEXT PRIMARY KEY,
                quiz_id      TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                player_name  TEXT NOT NULL,
                relation     TEXT NOT NULL DEFAULT 'Friend',
                score        INTEGER NOT NULL,
                total        INTEGER NOT NULL,
                percentage   INTEGER NOT NULL,
                answers      TEXT NOT NULL,
                taken_at     TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS notifications (
                id           TEXT PRIMARY KEY,
                quiz_id      TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                message      TEXT NOT NULL,
                is_read      INTEGER NOT NULL DEFAULT 0,
                created_at   TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_quizzes_code ON quizzes(code);
            CREATE INDEX IF NOT EXISTS idx_results_quiz ON quiz_results(quiz_id);
            CREATE INDEX IF NOT EXISTS idx_notifs_quiz  ON notifications(quiz_id);
        """)
        db.commit()
        # Safe migrations for existing SQLite DBs
        for migration in [
            "ALTER TABLE quizzes ADD COLUMN sets TEXT DEFAULT '[]'",
            "ALTER TABLE quizzes ADD COLUMN password TEXT DEFAULT ''",
        ]:
            try:
                db.execute(migration)
                db.commit()
            except Exception:
                pass  # column already exists
        db.close()
        print("✅ SQLite database ready (friendquiz.db)")


# ── Utils ─────────────────────────────────────────────────────

def make_code(length=8):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def fuzzy_match(correct: str, given: str) -> bool:
    c = correct.lower().strip()
    g = given.lower().strip()
    if not c or not g:            return False
    if c == g:                    return True
    if c in g or g in c:         return True
    cw = set(w for w in c.split() if len(w) > 2)
    gw = set(w for w in g.split() if len(w) > 2)
    return bool(cw and gw and cw & gw)


# ── Routes ────────────────────────────────────────────────────

@app.post("/quizzes")
def create_quiz():
    data         = request.get_json() or {}
    creator_name = (data.get("creatorName") or "").strip()
    answers      = data.get("answers")
    if not creator_name or not answers:
        return jsonify({"error": "creatorName and answers are required"}), 400
    sets         = data.get("sets", [])
    password     = (data.get("password") or "").strip()
    quiz_id      = str(uuid.uuid4())
    code         = make_code()
    sets_json    = json.dumps(sets)
    answers_json = json.dumps(answers)
    print(f"[create_quiz] creator={creator_name} sets_count={len(sets)} sets_json_len={len(sets_json)}")
    try:
        if USE_POSTGRES:
            db = get_db()
            cur = db.cursor()
            cur.execute(
                "INSERT INTO quizzes (id, code, creator_name, answers, sets, password) VALUES (%s, %s, %s, %s, %s, %s)",
                (quiz_id, code, creator_name, answers_json, sets_json, password)
            )
            db.commit()
            cur.execute("SELECT sets FROM quizzes WHERE id = %s", (quiz_id,))
            row = cur.fetchone()
            raw = row["sets"] if row else "[]"
            saved_count = len(json.loads(raw or "[]"))
        else:
            db = get_db()
            db.execute(
                "INSERT INTO quizzes (id, code, creator_name, answers, sets, password) VALUES (?, ?, ?, ?, ?, ?)",
                (quiz_id, code, creator_name, answers_json, sets_json, password)
            )
            db.commit()
            row = db.execute("SELECT sets FROM quizzes WHERE id = ?", (quiz_id,)).fetchone()
            saved_count = len(json.loads(row["sets"] or "[]")) if row else 0
        print(f"[create_quiz] VERIFIED saved sets_count={saved_count}")
        return jsonify({"id": quiz_id, "code": code, "sets_count": saved_count}), 201
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.post("/login")
def login():
    data     = request.get_json() or {}
    username = (data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if USE_POSTGRES:
        db = get_db()
        cur = db.cursor()
        cur.execute(
            "SELECT id, code, creator_name, password FROM quizzes WHERE LOWER(creator_name) = %s ORDER BY created_at DESC LIMIT 1",
            (username,)
        )
        row = cur.fetchone()
    else:
        row = db_exec(
            "SELECT id, code, creator_name, password FROM quizzes WHERE LOWER(creator_name) = ? ORDER BY created_at DESC LIMIT 1",
            (username,), fetchone=True
        )
    if row is None:
        return jsonify({"error": "No quiz found for that username"}), 404
    r = dict(row)
    stored_pw = (r.get("password") or "").strip()
    if stored_pw and stored_pw != password:
        return jsonify({"error": "Wrong password"}), 401
    return jsonify({"id": r["id"], "code": r["code"], "creator_name": r["creator_name"]}), 200


@app.get("/quizzes/<code>")
def get_quiz(code):
    row = db_exec("SELECT * FROM quizzes WHERE code = ?",
                  (code.lower().strip(),), fetchone=True)
    if row is None:
        return jsonify({"error": "Quiz not found"}), 404
    quiz = row_to_dict(row)
    # Safely parse JSON fields — handle None, empty string, and bad JSON
    try:
        quiz["answers"] = json.loads(quiz["answers"] or "{}")
    except Exception:
        quiz["answers"] = {}
    try:
        raw_sets = quiz.get("sets") or "[]"
        quiz["sets"] = json.loads(raw_sets) if raw_sets else []
    except Exception:
        quiz["sets"] = []
    # Log for debugging
    print(f"[get_quiz] code={code} sets_count={len(quiz['sets'])} answers_keys={list(quiz['answers'].keys())}")
    return jsonify(quiz)


@app.post("/results")
def save_result():
    data           = request.get_json() or {}
    quiz_id        = data.get("quizId")
    player_name    = (data.get("playerName") or "").strip()
    relation       = (data.get("relation") or "Friend").strip()
    player_answers = data.get("answers")

    if not all([quiz_id, player_name, player_answers]):
        return jsonify({"error": "Missing required fields"}), 400

    quiz_row = db_exec("SELECT creator_name, answers FROM quizzes WHERE id = ?",
                       (quiz_id,), fetchone=True)
    if quiz_row is None:
        return jsonify({"error": "Quiz not found"}), 404

    creator_name    = quiz_row["creator_name"]
    correct_answers = json.loads(quiz_row["answers"])

    scored = []
    for item in player_answers:
        key        = item.get("key", "")
        given      = (item.get("given") or "").strip()
        correct    = (correct_answers.get(key) or "").strip()
        scored.append({
            "key": key, "question": item.get("question", ""),
            "correct": correct, "given": given,
            "isCorrect": fuzzy_match(correct, given),
        })

    total      = len(scored)
    score      = sum(1 for s in scored if s["isCorrect"])
    percentage = round((score / total) * 100) if total > 0 else 0
    result_id  = str(uuid.uuid4())
    message    = f"Your {relation} {player_name} filled your quiz and got {percentage}%!"

    try:
        db_exec(
            """INSERT INTO quiz_results
               (id, quiz_id, player_name, relation, score, total, percentage, answers)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (result_id, quiz_id, player_name, relation,
             score, total, percentage, json.dumps(scored)),
        )
        db_exec("INSERT INTO notifications (id, quiz_id, message) VALUES (?, ?, ?)",
                (str(uuid.uuid4()), quiz_id, message))
        db_commit()
        return jsonify({"id": result_id, "score": score,
                        "total": total, "percentage": percentage,
                        "scored": scored}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/results/<quiz_id>")
def get_results(quiz_id):
    rows = db_exec("SELECT * FROM quiz_results WHERE quiz_id = ? ORDER BY taken_at DESC",
                   (quiz_id,), fetchall=True)
    results = []
    for row in rows:
        r = row_to_dict(row)
        r["answers"] = json.loads(r["answers"])
        results.append(r)
    return jsonify(results)


@app.get("/notifications/<quiz_id>")
def get_notifications(quiz_id):
    rows = db_exec("SELECT * FROM notifications WHERE quiz_id = ? ORDER BY created_at DESC",
                   (quiz_id,), fetchall=True)
    return jsonify([row_to_dict(r) for r in rows])


@app.get("/notifications/<quiz_id>/unread-count")
def unread_count(quiz_id):
    row = db_exec(
        "SELECT COUNT(*) as count FROM notifications WHERE quiz_id = ? AND is_read = 0",
        (quiz_id,), fetchone=True)
    return jsonify({"count": row["count"]})


@app.patch("/notifications/<quiz_id>/mark-read")
def mark_read(quiz_id):
    db_exec("UPDATE notifications SET is_read = 1 WHERE quiz_id = ?", (quiz_id,))
    db_commit()
    return jsonify({"ok": True})


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/debug/quiz/<code>")
def debug_quiz(code):
    """Debug endpoint — shows raw DB values for a quiz."""
    row = db_exec("SELECT id, code, creator_name, sets, answers FROM quizzes WHERE code = ?",
                  (code.lower().strip(),), fetchone=True)
    if row is None:
        return jsonify({"error": "not found"}), 404
    r = row_to_dict(row)
    return jsonify({
        "id": r["id"],
        "code": r["code"],
        "creator_name": r["creator_name"],
        "sets_raw": r.get("sets"),
        "sets_length": len(json.loads(r.get("sets") or "[]")),
        "answers_raw": r.get("answers"),
    })


# ── Run ───────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 3001))
    print(f"🚀 FriendQuiz running at http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=not USE_POSTGRES)


# ── Init DB at module level so gunicorn triggers it too ───────
# This runs whether started via "python app.py" OR "gunicorn app:app"
with app.app_context():
    init_db()
