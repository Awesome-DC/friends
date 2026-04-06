// client/src/lib/api.js
// ─────────────────────────────────────────────────────────────
// FriendQuiz v2 — API client for Flask + SQLite backend
// ─────────────────────────────────────────────────────────────

const BASE = "https://lucky-curiosity-production.up.railway.app";

async function request(method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : undefined;
  if (path === "/quizzes" && method === "POST") {
    console.log("[api.js] createQuiz raw body length:", bodyStr?.length);
    const parsed = bodyStr ? JSON.parse(bodyStr) : {};
    console.log("[api.js] createQuiz parsed sets count:", parsed.sets?.length);
    console.log("[api.js] createQuiz parsed sets ids:", parsed.sets?.map(s=>s.id));
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: bodyStr,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const createQuiz        = ({ creatorName, answers, sets }) => {
  console.log("[api.js] createQuiz called, sets:", sets?.length, sets?.map(s=>s.id));
  return request("POST", "/quizzes", { creatorName, answers, sets });
};

export const getQuizByCode     = (code) =>
  request("GET", `/quizzes/${code}`);

export const saveResult        = ({ quizId, playerName, relation, answers }) =>
  request("POST", "/results", { quizId, playerName, relation, answers });

export const getResultsForQuiz = (quizId) =>
  request("GET", `/results/${quizId}`);

export const getNotifications      = (quizId) =>
  request("GET", `/notifications/${quizId}`);

export const getUnreadCount        = (quizId) =>
  request("GET", `/notifications/${quizId}/unread-count`);

export const markNotificationsRead = (quizId) =>
  request("PATCH", `/notifications/${quizId}/mark-read`);
