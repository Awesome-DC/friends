# server/app.py
# ─────────────────────────────────────────────────────────────
# FriendQuiz v2 — Flask + SQLite backend
#
# Setup:
#   cd server
#   pip install flask flask-cors
#   python app.py
#
# Runs on: http://localhost:3001
# ─────────────────────────────────────────────────────────────

import sqlite3
import json
import uuid
import random
import string
from flask import Flask, request, jsonify, g
from flask_cors import CORS

app = Flask(__name__)
CORS(
    app,
    origins=["http://localhost:5173"],
    methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=False,
)

DB_PATH = "friendquiz.db"


# ── DB helpers ───────────────────────────────────────────────

def get_db():
    if "db" not in g:
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


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS quizzes (
            id           TEXT PRIMARY KEY,
            code         TEXT UNIQUE NOT NULL,
            creator_name TEXT NOT NULL,
            answers      TEXT NOT NULL,
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

        CREATE INDEX IF NOT EXISTS idx_quizzes_code      ON quizzes(code);
        CREATE INDEX IF NOT EXISTS idx_results_quiz_id   ON quiz_results(quiz_id);
        CREATE INDEX IF NOT EXISTS idx_notifs_quiz_id    ON notifications(quiz_id);
    """)
    db.commit()
    db.close()
    print("✅ SQLite database ready (friendquiz.db)")


def make_code(length=8):
    """Generate a short random alphanumeric share code."""
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


def row_to_dict(row):
    return dict(row)


# ── Fuzzy match ──────────────────────────────────────────────

def fuzzy_match(correct: str, given: str) -> bool:
    """
    Returns True if the given answer is close enough to correct.
    Rules:
      - Case insensitive
      - Strip whitespace
      - One contains the other (handles 'jollof' vs 'jollof rice')
      - OR they share enough words (2+ words in common)
    """
    c = correct.lower().strip()
    g_ans = given.lower().strip()

    if not c or not g_ans:
        return False

    # Exact match
    if c == g_ans:
        return True

    # One contains the other
    if c in g_ans or g_ans in c:
        return True

    # Word overlap — if they share at least one meaningful word (len > 2)
    c_words = set(w for w in c.split() if len(w) > 2)
    g_words = set(w for w in g_ans.split() if len(w) > 2)
    if c_words and g_words and c_words & g_words:
        return True

    return False


# ── Routes ──────────────────────────────────────────────────

# POST /quizzes — create a new quiz
@app.post("/quizzes")
def create_quiz():
    data = request.get_json()
    creator_name = (data.get("creatorName") or "").strip()
    answers = data.get("answers")

    if not creator_name or not answers:
        return jsonify({"error": "creatorName and answers are required"}), 400

    quiz_id = str(uuid.uuid4())
    code = make_code()

    try:
        db = get_db()
        db.execute(
            "INSERT INTO quizzes (id, code, creator_name, answers) VALUES (?, ?, ?, ?)",
            (quiz_id, code, creator_name, json.dumps(answers)),
        )
        db.commit()
        return jsonify({"id": quiz_id, "code": code}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET /quizzes/:code — load a quiz by share code
@app.get("/quizzes/<code>")
def get_quiz(code):
    db = get_db()
    row = db.execute(
        "SELECT * FROM quizzes WHERE code = ?", (code.lower(),)
    ).fetchone()

    if row is None:
        return jsonify({"error": "Quiz not found"}), 404

    quiz = row_to_dict(row)
    quiz["answers"] = json.loads(quiz["answers"])
    return jsonify(quiz)


# POST /results — save a player's result (with fuzzy scoring + notification)
@app.post("/results")
def save_result():
    data = request.get_json()

    quiz_id     = data.get("quizId")
    player_name = (data.get("playerName") or "").strip()
    relation    = (data.get("relation") or "Friend").strip()
    player_answers = data.get("answers")   # list of { key, given }

    if not all([quiz_id, player_name, player_answers]):
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()

    # Load the quiz to get correct answers
    quiz_row = db.execute(
        "SELECT creator_name, answers FROM quizzes WHERE id = ?", (quiz_id,)
    ).fetchone()

    if quiz_row is None:
        return jsonify({"error": "Quiz not found"}), 404

    creator_name = quiz_row["creator_name"]
    correct_answers = json.loads(quiz_row["answers"])

    # Score each answer with fuzzy matching
    scored = []
    for item in player_answers:
        key = item.get("key")
        given = (item.get("given") or "").strip()
        correct = (correct_answers.get(key) or "").strip()
        is_correct = fuzzy_match(correct, given)
        scored.append({
            "key": key,
            "question": item.get("question", ""),
            "correct": correct,
            "given": given,
            "isCorrect": is_correct,
        })

    total = len(scored)
    score = sum(1 for s in scored if s["isCorrect"])
    percentage = round((score / total) * 100) if total > 0 else 0

    result_id = str(uuid.uuid4())

    try:
        # Save result
        db.execute(
            """INSERT INTO quiz_results
               (id, quiz_id, player_name, relation, score, total, percentage, answers)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (result_id, quiz_id, player_name, relation,
             score, total, percentage, json.dumps(scored)),
        )

        # Create notification for creator
        notif_id = str(uuid.uuid4())
        message = f"Your {relation} {player_name} filled your quiz and got {percentage}%!"
        db.execute(
            "INSERT INTO notifications (id, quiz_id, message) VALUES (?, ?, ?)",
            (notif_id, quiz_id, message),
        )

        db.commit()
        return jsonify({
            "id": result_id,
            "score": score,
            "total": total,
            "percentage": percentage,
            "scored": scored,
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET /results/:quiz_id — get all results for a quiz
@app.get("/results/<quiz_id>")
def get_results(quiz_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM quiz_results WHERE quiz_id = ? ORDER BY taken_at DESC",
        (quiz_id,),
    ).fetchall()

    results = []
    for row in rows:
        r = row_to_dict(row)
        r["answers"] = json.loads(r["answers"])
        results.append(r)

    return jsonify(results)


# GET /notifications/:quiz_id — get all notifications for a quiz
@app.get("/notifications/<quiz_id>")
def get_notifications(quiz_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM notifications WHERE quiz_id = ? ORDER BY created_at DESC",
        (quiz_id,),
    ).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


# GET /notifications/:quiz_id/unread-count
@app.get("/notifications/<quiz_id>/unread-count")
def unread_count(quiz_id):
    db = get_db()
    row = db.execute(
        "SELECT COUNT(*) as count FROM notifications WHERE quiz_id = ? AND is_read = 0",
        (quiz_id,),
    ).fetchone()
    return jsonify({"count": row["count"]})


# PATCH /notifications/:quiz_id/mark-read — mark all as read
@app.patch("/notifications/<quiz_id>/mark-read")
def mark_read(quiz_id):
    db = get_db()
    db.execute(
        "UPDATE notifications SET is_read = 1 WHERE quiz_id = ?", (quiz_id,)
    )
    db.commit()
    return jsonify({"ok": True})


# ── Explicit OPTIONS preflight handler (safety net) ─────────
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        from flask import make_response
        res = make_response()
        res.headers["Access-Control-Allow-Origin"]  = "http://localhost:5173"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
        res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return res, 200


# ── Run ─────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    print("🚀 FriendQuiz server running at http://localhost:3001")
    print("   Frontend: http://localhost:5173")
    app.run(port=3001, debug=True)
