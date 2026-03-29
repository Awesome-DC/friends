// client/src/FriendQuiz.jsx  —  FriendQuiz v2
// New screens: ProfileCreated, Welcome, PlayerIntro
// New features: relation dropdown, fuzzy scoring, notifications

import { useState, useEffect, useCallback } from "react";
import { QUESTIONS, RELATIONS } from "./lib/questions";
import {
  createQuiz, getQuizByCode, saveResult,
  getResultsForQuiz,
} from "./lib/api";
import { useNotifications } from "./hooks/useNotifications";

// ── Fonts ────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("fq-fonts")) {
  const l = document.createElement("link");
  l.id = "fq-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap";
  document.head.appendChild(l);
}

// ── Tokens ───────────────────────────────────────────────────
const C = {
  purple: "#7C3AED", pink: "#EC4899", yellow: "#F59E0B",
  cyan: "#06B6D4",   green: "#10B981", orange: "#F97316",
  dark: "#1e1b2e",
};

// ── URL helpers ──────────────────────────────────────────────
function useUrlCode() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("quiz");
}
function shareUrl(code) {
  return `${window.location.origin}${window.location.pathname}?quiz=${code}`;
}

// ── Score message ────────────────────────────────────────────
function getScoreMessage(pct) {
  if (pct === 100) return ["🥇 PERFECT!", "You know them better than they know themselves!"];
  if (pct >= 80)  return ["🎉 Amazing!", "You're practically the same person!"];
  if (pct >= 60)  return ["😄 Pretty good!", "You definitely know them well."];
  if (pct >= 40)  return ["😅 Getting there!", "Spend more time together!"];
  if (pct >= 20)  return ["😬 Oof…", "Do you actually know this person?"];
  return ["💀 Yikes!", "Are you sure you have the right quiz?"];
}

// ── Global CSS ───────────────────────────────────────────────
const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; background: ${C.dark}; }
  #root { height: 100%; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes scaleIn  { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
  @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @keyframes confettiFall {
    0%  { transform:translateY(-20px) rotate(0deg); opacity:1; }
    100%{ transform:translateY(100vh) rotate(720deg); opacity:0; }
  }
  @keyframes bellShake {
    0%,100%{transform:rotate(0)} 20%{transform:rotate(-18deg)}
    40%{transform:rotate(18deg)} 60%{transform:rotate(-10deg)}
    80%{transform:rotate(10deg)}
  }

  .fq-input, .fq-select {
    width:100%; background:rgba(255,255,255,0.13); backdrop-filter:blur(12px);
    border:2px solid rgba(255,255,255,0.28); border-radius:18px;
    padding:16px 20px; font-family:'Nunito',sans-serif; font-size:1rem;
    font-weight:700; color:#fff; outline:none;
    transition:border 0.2s,background 0.2s; caret-color:#fff;
  }
  .fq-input::placeholder { color:rgba(255,255,255,0.45); font-weight:600; }
  .fq-input:focus, .fq-select:focus {
    border-color:rgba(255,255,255,0.75); background:rgba(255,255,255,0.2);
  }
  .fq-select option { background:#2d1458; color:#fff; }

  .fq-btn {
    display:flex; align-items:center; justify-content:center; gap:8px;
    width:100%; padding:16px 24px; border:none; border-radius:20px;
    font-family:'Nunito',sans-serif; font-size:1.05rem; font-weight:800;
    cursor:pointer; transition:transform 0.13s,box-shadow 0.13s; letter-spacing:0.3px;
  }
  .fq-btn:active { transform:scale(0.96) !important; }
  .fq-btn:disabled { opacity:0.5; cursor:not-allowed; }

  .fq-btn-primary  { background:linear-gradient(135deg,${C.purple},${C.pink}); color:#fff; box-shadow:0 6px 24px rgba(124,58,237,0.45); }
  .fq-btn-primary:hover:not(:disabled)  { transform:translateY(-2px); box-shadow:0 10px 32px rgba(124,58,237,0.55); }
  .fq-btn-white    { background:#fff; color:${C.purple}; box-shadow:0 4px 20px rgba(0,0,0,0.15); }
  .fq-btn-white:hover:not(:disabled)    { transform:translateY(-2px); }
  .fq-btn-ghost    { background:rgba(255,255,255,0.1); color:#fff; border:2px solid rgba(255,255,255,0.28); backdrop-filter:blur(8px); }
  .fq-btn-ghost:hover:not(:disabled)    { background:rgba(255,255,255,0.18); }
  .fq-btn-green    { background:linear-gradient(135deg,#059669,${C.green}); color:#fff; box-shadow:0 6px 24px rgba(16,185,129,0.4); }
  .fq-btn-green:hover:not(:disabled)    { transform:translateY(-2px); }

  .dot-indicator { display:inline-block; width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.3); transition:all 0.3s; }
  .dot-indicator.active { background:#fff; width:24px; border-radius:100px; }

  .confetti-piece { position:fixed; width:10px; height:10px; border-radius:2px; animation:confettiFall linear forwards; z-index:9999; pointer-events:none; }

  .notif-badge {
    position:absolute; top:-5px; right:-5px; background:${C.pink};
    color:#fff; border-radius:100px; font-size:0.7rem; font-weight:900;
    min-width:18px; height:18px; display:flex; align-items:center; justify-content:center;
    padding:0 4px; border:2px solid ${C.dark};
  }

  .notif-item {
    padding:12px 14px; border-radius:14px; margin-bottom:8px;
    background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
    font-family:'Nunito',sans-serif; font-size:0.88rem; color:rgba(255,255,255,0.85);
    line-height:1.5;
  }
  .notif-item.unread { background:rgba(124,58,237,0.2); border-color:rgba(124,58,237,0.4); }

  .score-ring-wrap { position:relative; display:inline-flex; align-items:center; justify-content:center; }
`;

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById("fq-styles")) return;
    const s = document.createElement("style");
    s.id = "fq-styles";
    s.textContent = globalCSS;
    document.head.appendChild(s);
  }, []);
  return null;
}

// ── Confetti ─────────────────────────────────────────────────
function Confetti() {
  useEffect(() => {
    const colors = [C.purple, C.pink, C.yellow, C.cyan, C.green, C.orange];
    const pieces = Array.from({ length: 70 }, (_, i) => {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.cssText = `
        left:${Math.random()*100}vw; top:-20px;
        background:${colors[i % colors.length]};
        animation-duration:${1.5+Math.random()*2}s;
        animation-delay:${Math.random()*0.8}s;
        transform:rotate(${Math.random()*360}deg);
        width:${6+Math.random()*10}px; height:${6+Math.random()*10}px;
      `;
      document.body.appendChild(el);
      return el;
    });
    const t = setTimeout(() => pieces.forEach(el => el.remove()), 4500);
    return () => { clearTimeout(t); pieces.forEach(el => el.remove()); };
  }, []);
  return null;
}

// ── Score Ring (SVG circle) ───────────────────────────────────
function ScoreRing({ pct, size = 160 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  const color = pct >= 80 ? C.green : pct >= 50 ? C.yellow : C.pink;

  return (
    <div className="score-ring-wrap" style={{ width: size, height: size, margin: "0 auto 12px" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s ease" }}
        />
      </svg>
      <div style={{ position:"absolute", textAlign:"center" }}>
        <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"2.4rem", color:"#fff", lineHeight:1 }}>{pct}%</div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.75rem", color:"rgba(255,255,255,0.5)", marginTop:2 }}>score</div>
      </div>
    </div>
  );
}

// ── Reusable full-bleed photo slide layout ────────────────────
function PhotoSlide({ question, children, index, total }) {
  return (
    <div style={{ position:"relative", height:"100%", width:"100%", overflow:"hidden" }}>
      <img src={question.photo} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }} />
      <div style={{ position:"absolute", inset:0, background:question.color }} />
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 20%, rgba(10,8,28,0.7) 60%, rgba(10,8,28,0.97) 100%)" }} />

      {/* Top dots */}
      <div style={{ position:"absolute", top:0, left:0, right:0, padding:"20px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`dot-indicator ${i === index ? "active" : ""}`} />
          ))}
        </div>
        <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:"0.9rem", color:"rgba(255,255,255,0.75)", background:"rgba(0,0,0,0.3)", backdropFilter:"blur(8px)", padding:"4px 14px", borderRadius:100 }}>
          {index + 1} / {total}
        </span>
      </div>

      {/* Emoji */}
      <div style={{ position:"absolute", top:"18%", left:"50%", transform:"translateX(-50%)", fontSize:"4.5rem", filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.4))", animation:"pulse 3s ease-in-out infinite" }}>
        {question.emoji}
      </div>

      {/* Bottom content */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"28px 24px 40px", animation:"fadeUp 0.45s ease both" }}>
        {children}
      </div>
    </div>
  );
}

// ── Centered dark screen wrapper ──────────────────────────────
function DarkScreen({ children, style = {} }) {
  return (
    <div style={{
      height:"100%",
      background:`linear-gradient(145deg, ${C.dark} 0%, #2d1458 55%, #1a0a3d 100%)`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"2rem 1.5rem", overflowY:"auto", ...style,
    }}>
      <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.5s ease" }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared typography helpers ─────────────────────────────────
function Logo({ text = "FriendQuiz", size = "2.4rem" }) {
  return (
    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:size, background:`linear-gradient(135deg,#a78bfa,${C.pink},${C.yellow})`, backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"shimmer 4s linear infinite", textAlign:"center", marginBottom:6 }}>
      {text}
    </div>
  );
}

function Sub({ children, mb = "1.8rem" }) {
  return <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.97rem", color:"rgba(255,255,255,0.55)", textAlign:"center", marginBottom:mb, lineHeight:1.6 }}>{children}</p>;
}

function FQInput({ value, onChange, placeholder, onEnter, style = {}, autoFocus }) {
  return (
    <input
      className="fq-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter(); }}
      style={{ marginBottom:14, ...style }}
      autoFocus={autoFocus}
    />
  );
}

function Row({ children, gap = 12 }) {
  return <div style={{ display:"flex", gap }}>{children}</div>;
}

function BackBtn({ onClick }) {
  return <button className="fq-btn fq-btn-ghost" onClick={onClick} style={{ flex:"0 0 56px", borderRadius:16, fontSize:"1.2rem" }}>←</button>;
}

// ════════════════════════════════════════════════════════════
//  SCREENS
// ════════════════════════════════════════════════════════════

// ── Home ─────────────────────────────────────────────────────
function HomeScreen({ onCreate, onTake }) {
  return (
    <DarkScreen>
      <Logo size="clamp(2.6rem,9vw,3.8rem)" />
      <Sub mb="2.5rem">Create a quiz about yourself.<br />See how well your friends really know you 👀</Sub>
      <div style={{ fontSize:"2.4rem", textAlign:"center", letterSpacing:10, marginBottom:"2.5rem" }}>🧠💛🤩🫶🔥</div>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <button className="fq-btn fq-btn-primary" onClick={onCreate} style={{ fontSize:"1.1rem", padding:"18px" }}>✏️ Create My Quiz</button>
        <button className="fq-btn fq-btn-ghost" onClick={onTake}>🔗 Enter a Friend's Code</button>
      </div>
    </DarkScreen>
  );
}

// ── Creator: enter name ───────────────────────────────────────
function CreatorNameScreen({ onBack, onNext }) {
  const [name, setName] = useState("");
  return (
    <DarkScreen>
      <div style={{ fontSize:"3.5rem", textAlign:"center", marginBottom:16 }}>👋</div>
      <Logo text="What's your name?" size="1.9rem" />
      <Sub>Friends will see this on the quiz link</Sub>
      <FQInput value={name} onChange={setName} placeholder="Your name…" onEnter={() => name.trim() && onNext(name.trim())} autoFocus />
      <Row>
        <BackBtn onClick={onBack} />
        <button className="fq-btn fq-btn-primary" onClick={() => onNext(name.trim())} disabled={!name.trim()} style={{ flex:1 }}>Let's go →</button>
      </Row>
    </DarkScreen>
  );
}

// ── Creator: answer questions (swipe) ─────────────────────────
function CreateQuizScreen({ creatorName, onBack, onDone }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const q = QUESTIONS[current];
  const val = answers[q.key] || "";

  async function handleNext() {
    if (current < QUESTIONS.length - 1) {
      setCurrent(c => c + 1);
    } else {
      setSaving(true);
      try {
        const { id, code } = await createQuiz({ creatorName, answers });
        onDone({ id, code });
      } catch (err) {
        alert("Error saving quiz: " + err.message);
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <PhotoSlide question={q} index={current} total={QUESTIONS.length}>
      <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.78rem", fontWeight:800, letterSpacing:"2px", textTransform:"uppercase", color:"rgba(255,255,255,0.5)", marginBottom:8 }}>
        {q.label}
      </p>
      <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"clamp(1.35rem,5vw,1.8rem)", color:"#fff", marginBottom:18, lineHeight:1.25, textShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>
        Your {q.label.toLowerCase()}?
      </h2>
      <input
        className="fq-input"
        type="text"
        placeholder="Type your answer…"
        value={val}
        onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) handleNext(); }}
        style={{ marginBottom:16 }}
        autoFocus
      />
      <Row>
        {current > 0 && <BackBtn onClick={() => setCurrent(c => c - 1)} />}
        <button className="fq-btn fq-btn-primary" onClick={handleNext} disabled={!val.trim() || saving} style={{ flex:1 }}>
          {saving ? "Saving…" : current === QUESTIONS.length - 1 ? "✅ Finish & Create Link" : "Next →"}
        </button>
      </Row>
    </PhotoSlide>
  );
}

// ── Profile Created (success page) ───────────────────────────
function ProfileCreatedScreen({ creatorName, quizCode, quizId, onViewDashboard }) {
  const [copied, setCopied] = useState(false);
  const url = shareUrl(quizCode);

  function copy() {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <DarkScreen style={{ justifyContent:"flex-start", paddingTop:"3rem" }}>
      <Confetti />
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:"4rem", marginBottom:12, animation:"bounce 1.5s ease infinite" }}>🎉</div>
        <Logo text="Profile Created!" size="2rem" />
        <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.65)", fontSize:"1rem", lineHeight:1.6, marginTop:8 }}>
          You have successfully created your<br />
          <span style={{ color:"#fff", fontWeight:800 }}>{creatorName}</span>'s friendship profile!<br />
          Share your link with friends to participate.
        </p>
      </div>

      {/* Link card */}
      <div style={{ background:"rgba(255,255,255,0.07)", border:"2px dashed rgba(255,255,255,0.22)", borderRadius:20, padding:"20px", marginBottom:14, textAlign:"center" }}>
        <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.78rem", fontWeight:800, letterSpacing:"2px", textTransform:"uppercase", color:"rgba(255,255,255,0.4)", marginBottom:10 }}>Your Link</p>
        <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.85rem", color:"rgba(255,255,255,0.8)", wordBreak:"break-all", marginBottom:14 }}>{url}</p>

        {/* Code pill */}
        <div style={{ display:"inline-block", fontFamily:"'Fredoka One',cursive", fontSize:"1.6rem", color:"#fff", background:"rgba(124,58,237,0.35)", border:"2px solid rgba(124,58,237,0.55)", borderRadius:14, padding:"6px 24px", letterSpacing:5, marginBottom:14 }}>
          {quizCode}
        </div>
        <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.75rem", color:"rgba(255,255,255,0.35)" }}>Friends can also type this code manually</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <button className="fq-btn fq-btn-primary" onClick={copy}>{copied ? "✅ Copied!" : "📋 Copy Link"}</button>
        <button className="fq-btn fq-btn-green" onClick={onViewDashboard}>📊 View My Dashboard →</button>
      </div>
    </DarkScreen>
  );
}

// ── Creator Dashboard (with real browser notifications) ───────
function DashboardScreen({ creatorName, quizCode, quizId, onHome }) {
  const [results, setResults]       = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [copied, setCopied]         = useState(false);
  const url = shareUrl(quizCode);

  const { notifs, unread, permission, requestPermission, markRead } =
    useNotifications(quizId, creatorName);

  // Poll results every 8s
  useEffect(() => {
    let alive = true;
    async function poll() {
      if (!alive) return;
      try { const r = await getResultsForQuiz(quizId); if (alive) setResults(r); } catch {}
    }
    poll();
    const t = setInterval(poll, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [quizId]);

  async function openNotifs() {
    setShowNotifs(true);
    await markRead();
  }

  function copy() {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div style={{ height:"100%", background:`linear-gradient(145deg,${C.dark},#1a2744)`, overflowY:"auto", padding:"1.5rem 1rem 2.5rem" }}>
      <div style={{ maxWidth:440, margin:"0 auto" }}>

        {/* Browser notification permission banner */}
        {permission === "default" && (
          <div style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.4)", borderRadius:16, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:"1.4rem" }}>🔔</span>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.85rem", color:"rgba(255,255,255,0.8)", fontWeight:700, marginBottom:2 }}>Enable notifications</p>
              <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.78rem", color:"rgba(255,255,255,0.5)" }}>Get notified when friends take your quiz</p>
            </div>
            <button
              onClick={requestPermission}
              style={{ background:"rgba(245,158,11,0.3)", border:"1px solid rgba(245,158,11,0.5)", borderRadius:10, padding:"6px 14px", color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"0.8rem", cursor:"pointer", whiteSpace:"nowrap" }}
            >
              Allow
            </button>
          </div>
        )}

        {permission === "denied" && (
          <div style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:16, padding:"12px 16px", marginBottom:16 }}>
            <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.82rem", color:"rgba(255,255,255,0.6)" }}>
              🚫 Browser notifications are blocked. To enable: click the 🔒 lock icon in your browser's address bar → Notifications → Allow.
            </p>
          </div>
        )}

        {permission === "granted" && (
          <div style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:16, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <span>✅</span>
            <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.82rem", color:"rgba(255,255,255,0.6)" }}>Browser notifications enabled — you'll get alerted when friends respond!</p>
          </div>
        )}

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.5rem", color:"#fff" }}>My Dashboard</div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.82rem", color:"rgba(255,255,255,0.45)" }}>{creatorName}'s quiz</div>
          </div>
          {/* Bell */}
          <button
            onClick={openNotifs}
            style={{ position:"relative", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:14, width:48, height:48, fontSize:"1.4rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", animation: unread > 0 ? "bellShake 1s ease infinite" : "none" }}
          >
            🔔
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
          {[
            { label:"Participants", value: results.length },
            { label:"Avg Score", value: results.length ? Math.round(results.reduce((s,r) => s + r.percentage, 0) / results.length) + "%" : "—" },
          ].map(stat => (
            <div key={stat.label} style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, padding:"14px 16px", border:"1px solid rgba(255,255,255,0.09)" }}>
              <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.78rem", color:"rgba(255,255,255,0.45)", marginBottom:4 }}>{stat.label}</p>
              <p style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.8rem", color:"#fff" }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Share link */}
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:18, padding:"14px 16px", marginBottom:18, border:"1px solid rgba(255,255,255,0.09)" }}>
          <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.78rem", color:"rgba(255,255,255,0.4)", marginBottom:6, textTransform:"uppercase", letterSpacing:"1.5px" }}>Share link</p>
          <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.82rem", color:"rgba(255,255,255,0.7)", wordBreak:"break-all", marginBottom:10 }}>{url}</p>
          <button className="fq-btn fq-btn-ghost" onClick={copy} style={{ padding:"10px 16px", fontSize:"0.88rem" }}>{copied ? "✅ Copied!" : "📋 Copy Link"}</button>
        </div>

        {/* Results list */}
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:20, padding:"16px 18px", marginBottom:18 }}>
          <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.15rem", color:"#fff", marginBottom:14 }}>🏆 Friend Scores</h3>
          {results.length === 0 ? (
            <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.35)", fontSize:"0.9rem" }}>No one has taken it yet — share the link!</p>
          ) : results.map((r, i) => (
            <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom: i < results.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div>
                <p style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, color:"#fff", fontSize:"0.95rem" }}>{r.player_name}</p>
                <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.75rem", color:"rgba(255,255,255,0.38)" }}>{r.relation} · {new Date(r.taken_at).toLocaleDateString()}</p>
              </div>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.4rem", color: r.percentage >= 80 ? C.green : r.percentage >= 50 ? C.yellow : C.pink }}>
                {r.percentage}%
              </span>
            </div>
          ))}
        </div>

        <button className="fq-btn fq-btn-ghost" onClick={onHome}>🏠 Back to Home</button>
      </div>

      {/* Notifications slide-over panel */}
      {showNotifs && (
        <div style={{ position:"fixed", inset:0, zIndex:100 }}>
          <div onClick={() => setShowNotifs(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }} />
          <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"min(360px,100vw)", background:"#1a1730", borderLeft:"1px solid rgba(255,255,255,0.1)", padding:"24px 18px", overflowY:"auto", animation:"slideInRight 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.4rem", color:"#fff" }}>🔔 Notifications</h2>
              <button onClick={() => setShowNotifs(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:"1.5rem", cursor:"pointer" }}>✕</button>
            </div>
            {notifs.length === 0 ? (
              <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.35)", fontSize:"0.9rem" }}>No notifications yet.</p>
            ) : notifs.map(n => (
              <div key={n.id} className={`notif-item ${n.is_read ? "" : "unread"}`}>
                <p>{n.message}</p>
                <p style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.35)", marginTop:4 }}>{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Enter Code (friend) ───────────────────────────────────────
function EnterCodeScreen({ onBack, onLoad }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLoad() {
    setError(""); setLoading(true);
    try {
      const quiz = await getQuizByCode(code.trim().toLowerCase());
      onLoad(quiz);
    } catch {
      setError("Quiz not found. Check the code and try again.");
    } finally { setLoading(false); }
  }

  return (
    <DarkScreen>
      <div style={{ fontSize:"3.5rem", textAlign:"center", marginBottom:16 }}>🔗</div>
      <Logo text="Enter the code" size="1.9rem" />
      <Sub>Your friend shared a quiz code with you</Sub>
      <input className="fq-input" placeholder="e.g. ab3x9f2k" value={code}
        onChange={e => { setCode(e.target.value); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter" && code.trim()) handleLoad(); }}
        style={{ marginBottom:12, textAlign:"center", fontSize:"1.3rem", letterSpacing:5 }}
        autoFocus
      />
      {error && <p style={{ fontFamily:"'Nunito',sans-serif", color:"#f87171", textAlign:"center", fontSize:"0.88rem", marginBottom:12 }}>{error}</p>}
      <Row>
        <BackBtn onClick={onBack} />
        <button className="fq-btn fq-btn-primary" onClick={handleLoad} disabled={!code.trim() || loading} style={{ flex:1 }}>
          {loading ? "Loading…" : "Open Quiz →"}
        </button>
      </Row>
    </DarkScreen>
  );
}

// ── Welcome screen (friend lands on link) ─────────────────────
function WelcomeScreen({ quiz, onNext }) {
  return (
    <DarkScreen>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:"4rem", marginBottom:12, animation:"bounce 2s ease infinite" }}>👋</div>
        <Logo text="Welcome!" size="2.2rem" />
        <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.6)", fontSize:"1rem", lineHeight:1.7, marginTop:10 }}>
          You've been invited to take
        </p>
        <p style={{ fontFamily:"'Fredoka One',cursive", fontSize:"2rem", background:`linear-gradient(135deg,#a78bfa,${C.pink})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:"6px 0" }}>
          {quiz.creator_name}'s
        </p>
        <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.6)", fontSize:"1rem" }}>
          Friendship Profile Quiz!
        </p>
      </div>
      <button className="fq-btn fq-btn-primary" onClick={onNext} style={{ fontSize:"1.1rem", padding:"18px" }}>
        Let's do this! 🎯
      </button>
    </DarkScreen>
  );
}

// ── Player intro: name + relation ─────────────────────────────
function PlayerIntroScreen({ quiz, onBack, onStart }) {
  const [name, setName]         = useState("");
  const [relation, setRelation] = useState("");

  return (
    <DarkScreen>
      <div style={{ fontSize:"3rem", textAlign:"center", marginBottom:14 }}>🧠</div>
      <Logo text="First, about you" size="1.8rem" />
      <Sub>Tell {quiz.creator_name} who you are</Sub>

      <label style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.8rem", fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"1.5px", display:"block", marginBottom:6 }}>Your name</label>
      <FQInput value={name} onChange={setName} placeholder="Your name…" style={{ marginBottom:14 }} autoFocus />

      <label style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.8rem", fontWeight:800, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"1.5px", display:"block", marginBottom:6 }}>Your relation to {quiz.creator_name}</label>
      <select
        className="fq-select"
        value={relation}
        onChange={e => setRelation(e.target.value)}
        style={{ marginBottom:20 }}
      >
        <option value="" disabled>Select relation…</option>
        {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      <Row>
        <BackBtn onClick={onBack} />
        <button className="fq-btn fq-btn-primary" onClick={() => onStart(name.trim(), relation)} disabled={!name.trim() || !relation} style={{ flex:1 }}>
          Continue →
        </button>
      </Row>
    </DarkScreen>
  );
}

// ── Pre-start screen ──────────────────────────────────────────
function PlayerReadyScreen({ playerName, quiz, onStart }) {
  return (
    <DarkScreen>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"4rem", marginBottom:14, animation:"pulse 2s ease-in-out infinite" }}>🎮</div>
        <Logo text={`Ready, ${playerName}?`} size="2rem" />
        <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.6)", lineHeight:1.7, margin:"12px 0 32px" }}>
          You'll answer <strong style={{ color:"#fff" }}>{QUESTIONS.length} questions</strong> about <strong style={{ color:"#fff" }}>{quiz.creator_name}</strong>.<br />
          Answer honestly — your score gets sent to them!
        </p>
        <button className="fq-btn fq-btn-primary" onClick={onStart} style={{ fontSize:"1.15rem", padding:"20px" }}>
          🚀 Press Start to Begin
        </button>
      </div>
    </DarkScreen>
  );
}

// ── Play (friend answers) ─────────────────────────────────────
function PlayScreen({ quiz, playerName, relation, onFinish }) {
  const [current, setCurrent]       = useState(0);
  const [playerAnswers, setPlayerAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const q = QUESTIONS[current];
  const val = playerAnswers[q.key] || "";

  async function handleNext() {
    if (current < QUESTIONS.length - 1) {
      setCurrent(c => c + 1);
    } else {
      setSubmitting(true);
      try {
        const answersPayload = QUESTIONS.map(question => ({
          key: question.key,
          question: question.question.replace("{name}", quiz.creator_name),
          given: (playerAnswers[question.key] || "").trim(),
        }));
        const result = await saveResult({
          quizId: quiz.id,
          playerName,
          relation,
          answers: answersPayload,
        });
        onFinish(result);
      } catch (err) {
        alert("Error saving result: " + err.message);
      } finally { setSubmitting(false); }
    }
  }

  return (
    <PhotoSlide question={q} index={current} total={QUESTIONS.length}>
      <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.78rem", fontWeight:800, letterSpacing:"2px", textTransform:"uppercase", color:"rgba(255,255,255,0.5)", marginBottom:8 }}>
        {q.label}
      </p>
      <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"clamp(1.3rem,5vw,1.75rem)", color:"#fff", marginBottom:18, lineHeight:1.25, textShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>
        {q.question.replace("{name}", quiz.creator_name)}
      </h2>
      <input
        className="fq-input"
        type="text"
        placeholder="Type your answer…"
        value={val}
        onChange={e => setPlayerAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) handleNext(); }}
        style={{ marginBottom:16 }}
        autoFocus
      />
      <Row>
        {current > 0 && <BackBtn onClick={() => setCurrent(c => c - 1)} />}
        <button className="fq-btn fq-btn-primary" onClick={handleNext} disabled={!val.trim() || submitting} style={{ flex:1 }}>
          {submitting ? "Submitting…" : current === QUESTIONS.length - 1 ? "✅ Submit Answers" : "Next →"}
        </button>
      </Row>
    </PhotoSlide>
  );
}

// ── Results (friend's results page) ──────────────────────────
function ResultsScreen({ quiz, playerName, relation, result, onHome }) {
  const { percentage, score, total, scored } = result;
  const [title, subtitle] = getScoreMessage(percentage);

  return (
    <div style={{ height:"100%", background:`linear-gradient(145deg,${C.dark},#1a2744)`, overflowY:"auto", padding:"2rem 1rem 2.5rem" }}>
      <Confetti />
      <div style={{ maxWidth:420, margin:"0 auto", animation:"fadeUp 0.5s ease" }}>

        {/* Score ring */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <ScoreRing pct={percentage} size={170} />
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.7rem", color:"#fff", marginBottom:6 }}>{title}</h2>
          <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.55)", fontSize:"0.95rem" }}>{subtitle}</p>
          <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.35)", fontSize:"0.82rem", marginTop:8 }}>
            You got <strong style={{ color:"#fff" }}>{score}/{total}</strong> correct
          </p>
        </div>

        {/* Sent notification */}
        <div style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.35)", borderRadius:16, padding:"12px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:"1.4rem" }}>📨</span>
          <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:"0.88rem", color:"rgba(255,255,255,0.75)", lineHeight:1.5 }}>
            Your score has been sent to <strong style={{ color:"#fff" }}>{quiz.creator_name}</strong>!
          </p>
        </div>

        {/* Answer review */}
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:20, padding:"16px 18px", marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.1rem", color:"#fff", marginBottom:14 }}>📋 How you did</h3>
          {(scored || []).map((a, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 0", borderBottom: i < scored.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <span style={{ fontSize:"1.1rem", marginTop:2 }}>{a.isCorrect ? "✅" : "❌"}</span>
              <div>
                <p style={{ fontFamily:"'Nunito',sans-serif", color:"rgba(255,255,255,0.45)", fontSize:"0.78rem", marginBottom:2 }}>{a.question}</p>
                <p style={{ fontFamily:"'Nunito',sans-serif", color:"#fff", fontWeight:700, fontSize:"0.9rem" }}>✓ {a.correct}</p>
                {!a.isCorrect && <p style={{ fontFamily:"'Nunito',sans-serif", color:"#f87171", fontSize:"0.84rem" }}>✗ You said: {a.given || "(blank)"}</p>}
              </div>
            </div>
          ))}
        </div>

        <button className="fq-btn fq-btn-primary" onClick={onHome} style={{ marginBottom:12 }}>🏠 Back to Home</button>
        <button className="fq-btn fq-btn-ghost" onClick={() => window.location.href = window.location.pathname}>✏️ Create My Own Quiz</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ROOT APP
// ════════════════════════════════════════════════════════════

export default function FriendQuiz() {
  const urlCode = useUrlCode();

  const [screen, setScreen]         = useState(() => urlCode ? "loading" : "home");
  const [creatorName, setCreatorName] = useState("");
  const [quizMeta, setQuizMeta]     = useState(null);   // { id, code }
  const [activeQuiz, setActiveQuiz] = useState(null);   // full quiz object from DB
  const [playerName, setPlayerName] = useState("");
  const [relation, setRelation]     = useState("");
  const [finalResult, setFinalResult] = useState(null);

  const go = useCallback(s => setScreen(s), []);

  // Auto-load quiz from URL
  useEffect(() => {
    if (!urlCode) return;
    getQuizByCode(urlCode)
      .then(quiz => { setActiveQuiz(quiz); go("welcome"); })
      .catch(() => go("enter-code"));
  }, []);

  return (
    <div style={{ height:"100%", fontFamily:"'Nunito',sans-serif" }}>
      <InjectStyles />

      {screen === "loading" && (
        <DarkScreen><p style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.5rem", color:"rgba(255,255,255,0.4)", textAlign:"center" }}>Loading quiz…</p></DarkScreen>
      )}

      {screen === "home" && (
        <HomeScreen onCreate={() => go("creator-name")} onTake={() => go("enter-code")} />
      )}

      {screen === "creator-name" && (
        <CreatorNameScreen onBack={() => go("home")} onNext={name => { setCreatorName(name); go("create-quiz"); }} />
      )}

      {screen === "create-quiz" && (
        <CreateQuizScreen creatorName={creatorName} onBack={() => go("creator-name")}
          onDone={meta => { setQuizMeta(meta); go("profile-created"); }} />
      )}

      {screen === "profile-created" && quizMeta && (
        <ProfileCreatedScreen
          creatorName={creatorName}
          quizCode={quizMeta.code}
          quizId={quizMeta.id}
          onViewDashboard={() => go("dashboard")}
        />
      )}

      {screen === "dashboard" && quizMeta && (
        <DashboardScreen
          creatorName={creatorName}
          quizCode={quizMeta.code}
          quizId={quizMeta.id}
          onHome={() => go("home")}
        />
      )}

      {screen === "enter-code" && (
        <EnterCodeScreen onBack={() => go("home")} onLoad={quiz => { setActiveQuiz(quiz); go("welcome"); }} />
      )}

      {screen === "welcome" && activeQuiz && (
        <WelcomeScreen quiz={activeQuiz} onNext={() => go("player-intro")} />
      )}

      {screen === "player-intro" && activeQuiz && (
        <PlayerIntroScreen quiz={activeQuiz} onBack={() => go("welcome")}
          onStart={(name, rel) => { setPlayerName(name); setRelation(rel); go("player-ready"); }} />
      )}

      {screen === "player-ready" && activeQuiz && (
        <PlayerReadyScreen playerName={playerName} quiz={activeQuiz} onStart={() => go("play")} />
      )}

      {screen === "play" && activeQuiz && (
        <PlayScreen quiz={activeQuiz} playerName={playerName} relation={relation}
          onFinish={result => { setFinalResult(result); go("results"); }} />
      )}

      {screen === "results" && activeQuiz && finalResult && (
        <ResultsScreen
          quiz={activeQuiz} playerName={playerName} relation={relation}
          result={finalResult}
          onHome={() => { go("home"); setActiveQuiz(null); setFinalResult(null); }}
        />
      )}
    </div>
  );
}
