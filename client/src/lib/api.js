// client/src/lib/api.js
// ─────────────────────────────────────────────────────────────
// FriendQuiz v2 — API client for Flask + SQLite backend
// ─────────────────────────────────────────────────────────────

const BASE = "https://lucky-curiosity-production.up.railway.app";

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── Quizzes ──────────────────────────────────────────────────

// Create a quiz → returns { id, code }
export async function createQuiz({ creatorName, answers }) {
  return request("POST", "/quizzes", { creatorName, answers });
}

// Load quiz by share code
export async function getQuizByCode(code) {
  return request("GET", `/quizzes/${code}`);
}

// ── Results ──────────────────────────────────────────────────

// Save player answers → backend scores with fuzzy match
// answers = [{ key, question, given }]
// returns { id, score, total, percentage, scored }
export async function saveResult({ quizId, playerName, relation, answers }) {
  return request("POST", "/results", { quizId, playerName, relation, answers });
}

// Get all results for a quiz
export async function getResultsForQuiz(quizId) {
  return request("GET", `/results/${quizId}`);
}

// ── Notifications ─────────────────────────────────────────────

// Get all notifications for a quiz
export async function getNotifications(quizId) {
  return request("GET", `/notifications/${quizId}`);
}

// Get unread count
export async function getUnreadCount(quizId) {
  return request("GET", `/notifications/${quizId}/unread-count`);
}

// Mark all notifications as read
export async function markNotificationsRead(quizId) {
  return request("PATCH", `/notifications/${quizId}/mark-read`);
}
