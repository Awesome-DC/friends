// client/src/FriendQuiz.jsx — FriendQuiz v3 (Multiple choice + Custom questions + Share card)

import { useState, useEffect, useCallback, useRef } from "react";
import { RELATIONS } from "./lib/questions";
import { PRESET_SETS, getUnsplashPhoto } from "./lib/presets";
import { createQuiz, getQuizByCode, saveResult, getResultsForQuiz } from "./lib/api";
import { useNotifications } from "./hooks/useNotifications";

// ── Fonts ──────────────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("fq-fonts")) {
  const l = document.createElement("link");
  l.id = "fq-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap";
  document.head.appendChild(l);
}

const C = {
  purple:"#7C3AED", pink:"#EC4899", yellow:"#F59E0B",
  cyan:"#06B6D4", green:"#10B981", orange:"#F97316", dark:"#1e1b2e",
};

function useUrlCode() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("quiz");
}
function shareUrl(code) {
  return `${window.location.origin}${window.location.pathname}?quiz=${code}`;
}
function getScoreMessage(pct) {
  if (pct === 100) return ["🥇 PERFECT!",      "You know them better than they know themselves!"];
  if (pct >= 80)   return ["🎉 Amazing!",       "You're practically the same person!"];
  if (pct >= 60)   return ["😄 Pretty good!",   "You definitely know them well."];
  if (pct >= 40)   return ["😅 Getting there!", "Spend more time together!"];
  if (pct >= 20)   return ["😬 Oof…",           "Do you actually know this person?"];
  return             ["💀 Yikes!",              "Are you sure you have the right quiz?"];
}

// ── Global CSS ─────────────────────────────────────────────────────────────
const globalCSS = `
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html, body { height:100%; background:${C.dark}; }
#root { height:100%; }

@keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
@keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
@keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
@keyframes bellShake { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-18deg)} 40%{transform:rotate(18deg)} 60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)} }
@keyframes slideInRight { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
@keyframes timerShrink { from{width:100%} to{width:0%} }

.fq-input, .fq-select {
  width:100%; background:rgba(255,255,255,0.13); backdrop-filter:blur(12px);
  border:2px solid rgba(255,255,255,0.28); border-radius:18px;
  padding:16px 20px; font-family:'Nunito',sans-serif; font-size:1rem;
  font-weight:700; color:#fff; outline:none;
  transition:border 0.2s,background 0.2s; caret-color:#fff;
}
.fq-input::placeholder { color:rgba(255,255,255,0.45); font-weight:600; }
.fq-input:focus, .fq-select:focus { border-color:rgba(255,255,255,0.75); background:rgba(255,255,255,0.2); }
.fq-select option { background:#2d1458; color:#fff; }

.fq-btn {
  display:flex; align-items:center; justify-content:center; gap:8px;
  width:100%; padding:16px 24px; border:none; border-radius:20px;
  font-family:'Nunito',sans-serif; font-size:1.05rem; font-weight:800;
  cursor:pointer; transition:transform 0.13s,box-shadow 0.13s;
}
.fq-btn:active { transform:scale(0.96) !important; }
.fq-btn:disabled { opacity:0.5; cursor:not-allowed; }
.fq-btn-primary { background:linear-gradient(135deg,${C.purple},${C.pink}); color:#fff; box-shadow:0 6px 24px rgba(124,58,237,0.45); }
.fq-btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 32px rgba(124,58,237,0.55); }
.fq-btn-ghost { background:rgba(255,255,255,0.1); color:#fff; border:2px solid rgba(255,255,255,0.28); }
.fq-btn-ghost:hover:not(:disabled) { background:rgba(255,255,255,0.18); }
.fq-btn-green { background:linear-gradient(135deg,#059669,${C.green}); color:#fff; box-shadow:0 6px 24px rgba(16,185,129,0.4); }
.fq-btn-green:hover:not(:disabled) { transform:translateY(-2px); }
.fq-btn-skip { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.55); border:1px dashed rgba(255,255,255,0.25); border-radius:12px; padding:8px 20px; font-family:'Nunito',sans-serif; font-size:0.85rem; font-weight:700; cursor:pointer; }
.fq-btn-skip:hover { background:rgba(255,255,255,0.14); color:rgba(255,255,255,0.8); }

.dot-indicator { display:inline-block; width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.3); transition:all 0.3s; }
.dot-indicator.active { background:#fff; width:24px; border-radius:100px; }

.confetti-piece { position:fixed; border-radius:2px; animation:confettiFall linear forwards; z-index:9999; pointer-events:none; }

.notif-badge { position:absolute; top:-5px; right:-5px; background:${C.pink}; color:#fff; border-radius:100px; font-size:0.7rem; font-weight:900; min-width:18px; height:18px; display:flex; align-items:center; justify-content:center; padding:0 4px; border:2px solid ${C.dark}; }
.notif-item { padding:12px 14px; border-radius:14px; margin-bottom:8px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); font-family:'Nunito',sans-serif; font-size:0.88rem; color:rgba(255,255,255,0.85); line-height:1.5; }
.notif-item.unread { background:rgba(124,58,237,0.2); border-color:rgba(124,58,237,0.4); }

/* Option cards */
.option-card {
  position:relative; border-radius:16px; overflow:hidden; cursor:pointer;
  border:3px solid transparent; transition:border 0.2s,transform 0.15s,box-shadow 0.15s;
  height: clamp(120px, 22vh, 200px);
}
.option-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.4); }
.option-card.selected { border-color:${C.yellow}; transform:scale(1.03); box-shadow:0 0 0 4px rgba(245,158,11,0.3); }
.option-card.correct  { border-color:${C.green};  box-shadow:0 0 0 4px rgba(16,185,129,0.3); }
.option-card.wrong    { border-color:#ef4444;     box-shadow:0 0 0 4px rgba(239,68,68,0.3); opacity:0.7; }

/* Share buttons */
.share-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:14px 20px; border-radius:16px; border:none; font-family:'Nunito',sans-serif; font-size:0.95rem; font-weight:800; cursor:pointer; transition:transform 0.13s; width:100%; }
.share-btn:active { transform:scale(0.96); }
.share-whatsapp { background:#25D366; color:#fff; }
.share-sms      { background:#3B82F6; color:#fff; }
.share-twitter  { background:#1DA1F2; color:#fff; }
.share-copy     { background:rgba(255,255,255,0.12); color:#fff; border:2px solid rgba(255,255,255,0.25); }

/* Preset set card */
.set-card { position:relative; border-radius:20px; overflow:hidden; cursor:pointer; border:3px solid transparent; transition:all 0.2s; }
.set-card.selected { border-color:${C.yellow}; }
.set-card:hover { transform:translateY(-2px); }

/* Modal overlay */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:200; display:flex; align-items:flex-end; justify-content:center; }
.modal-sheet { background:#1a1730; border-radius:28px 28px 0 0; padding:28px 20px 40px; width:100%; max-width:480px; animation:slideUp 0.35s ease; }
`;

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById("fq-styles")) return;
    const s = document.createElement("style");
    s.id = "fq-styles"; s.textContent = globalCSS;
    document.head.appendChild(s);
  }, []);
  return null;
}

// ── Confetti ───────────────────────────────────────────────────────────────
function Confetti() {
  useEffect(() => {
    const colors = [C.purple,C.pink,C.yellow,C.cyan,C.green,C.orange];
    const pieces = Array.from({length:70},(_,i)=>{
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.cssText = `left:${Math.random()*100}vw;top:-20px;background:${colors[i%colors.length]};animation-duration:${1.5+Math.random()*2}s;animation-delay:${Math.random()*0.8}s;width:${6+Math.random()*10}px;height:${6+Math.random()*10}px;`;
      document.body.appendChild(el); return el;
    });
    const t = setTimeout(()=>pieces.forEach(el=>el.remove()),4500);
    return ()=>{clearTimeout(t);pieces.forEach(el=>el.remove());};
  },[]);
  return null;
}

// ── Score Ring ─────────────────────────────────────────────────────────────
function ScoreRing({pct,size=170}) {
  const r=((size-16)/2), circ=2*Math.PI*r, dash=circ*(pct/100);
  const color=pct>=80?C.green:pct>=50?C.yellow:C.pink;
  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,margin:"0 auto 12px"}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1.2s ease"}}/>
      </svg>
      <div style={{position:"absolute",textAlign:"center"}}>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"2.4rem",color:"#fff",lineHeight:1}}>{pct}%</div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.75rem",color:"rgba(255,255,255,0.5)",marginTop:2}}>score</div>
      </div>
    </div>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────
function DarkScreen({children,style={}}) {
  return (
    <div style={{height:"100%",background:`linear-gradient(145deg,${C.dark} 0%,#2d1458 55%,#1a0a3d 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1.5rem",overflowY:"auto",...style}}>
      <div style={{width:"100%",maxWidth:420,animation:"fadeUp 0.5s ease"}}>{children}</div>
    </div>
  );
}
function Logo({text="FriendQuiz",size="2.4rem"}) {
  return <div style={{fontFamily:"'Fredoka One',cursive",fontSize:size,background:`linear-gradient(135deg,#a78bfa,${C.pink},${C.yellow})`,backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite",textAlign:"center",marginBottom:6}}>{text}</div>;
}
function Sub({children,mb="1.8rem"}) {
  return <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.97rem",color:"rgba(255,255,255,0.55)",textAlign:"center",marginBottom:mb,lineHeight:1.6}}>{children}</p>;
}
function Row({children,gap=12}) { return <div style={{display:"flex",gap}}>{children}</div>; }
function BackBtn({onClick}) {
  return <button className="fq-btn fq-btn-ghost" onClick={onClick} style={{flex:"0 0 56px",borderRadius:16,fontSize:"1.2rem"}}>←</button>;
}

// ── Photo slide wrapper ────────────────────────────────────────────────────
function PhotoBg({photo,color,children,index,total}) {
  const [loaded,setLoaded]=useState(false);
  return (
    <div style={{position:"relative",width:"100%",height:"100%",minHeight:0,overflow:"hidden",background:"#1a0a3d",display:"flex",flexDirection:"column"}}>
      {/* Background layers */}
      {!loaded&&<div style={{position:"absolute",inset:0,background:"linear-gradient(145deg,#1a0a3d,#2d1458)",zIndex:0}}/>}
      <img src={photo} alt="" onLoad={()=>setLoaded(true)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",opacity:loaded?1:0,transition:"opacity 0.4s ease",zIndex:0}}/>
      <div style={{position:"absolute",inset:0,background:color,zIndex:1}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(10,8,28,0.55) 40%,rgba(10,8,28,0.97) 100%)",zIndex:1}}/>
      {/* Dots bar */}
      {total&&<div style={{position:"relative",zIndex:10,padding:"16px 20px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",gap:6}}>{Array.from({length:total}).map((_,i)=><span key={i} className={`dot-indicator ${i===index?"active":""}`}/>)}</div>
        <span style={{fontFamily:"'Fredoka One',cursive",fontSize:"0.85rem",color:"rgba(255,255,255,0.75)",background:"rgba(0,0,0,0.3)",backdropFilter:"blur(8px)",padding:"3px 12px",borderRadius:100}}>{index+1} / {total}</span>
      </div>}
      {/* Content */}
      <div style={{position:"relative",zIndex:10,flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        {children}
      </div>
    </div>
  );
}

// ── Option photo card ──────────────────────────────────────────────────────
function OptionCard({option,state,onClick,disabled}) {
  const [loaded,setLoaded]=useState(false);
  return (
    <div className={`option-card ${state}`} onClick={!disabled?onClick:undefined}
      style={{background:"#1a1730"}}>
      <img src={option.photo} alt={option.label} onLoad={()=>setLoaded(true)}
        style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:loaded?1:0,transition:"opacity 0.35s"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85) 100%)"}}/>
      {/* Tick overlay */}
      {state==="selected"&&<div style={{position:"absolute",top:8,right:8,background:C.yellow,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>⭐</div>}
      {state==="correct"&&<div style={{position:"absolute",top:8,right:8,background:C.green,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem"}}>✅</div>}
      {state==="wrong"&&<div style={{position:"absolute",top:8,right:8,background:"#ef4444",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem"}}>❌</div>}
      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 10px",textAlign:"center"}}>
        <span style={{fontFamily:"'Fredoka One',cursive",fontSize:"0.95rem",color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>{option.label}</span>
      </div>
      {/* Loading placeholder */}
      {!loaded&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",opacity:0.3}}>📷</div>}
    </div>
  );
}

// ── Share buttons ──────────────────────────────────────────────────────────
function ShareButtons({url,creatorName,score,pct}) {
  const [copied,setCopied]=useState(false);
  const text = score!=null
    ? `I just got ${pct}% on ${creatorName}'s FriendQuiz! 🎉 Think you can beat me? Try it here:`
    : `Test how well you know ${creatorName}! Take their FriendQuiz:`;

  function copyLink(){navigator.clipboard.writeText(url).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2500);}
  function whatsapp(){window.open(`https://wa.me/?text=${encodeURIComponent(text+" "+url)}`);}
  function sms(){window.open(`sms:?body=${encodeURIComponent(text+" "+url)}`);}
  function twitter(){window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);}

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <button className="share-btn share-whatsapp" onClick={whatsapp}>
        <span style={{fontSize:"1.2rem"}}>📱</span> Share on WhatsApp
      </button>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button className="share-btn share-sms" onClick={sms}>
          <span style={{fontSize:"1rem"}}>💬</span> SMS
        </button>
        <button className="share-btn share-twitter" onClick={twitter}>
          <span style={{fontSize:"1rem"}}>🐦</span> Twitter/X
        </button>
      </div>
      <button className="share-btn share-copy" onClick={copyLink}>
        {copied?"✅ Copied!":"🔗 Copy Link"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  CREATOR FLOW
// ══════════════════════════════════════════════════════════════

// ── Step 1: Creator name ───────────────────────────────────────────────────
function CreatorNameScreen({onBack,onNext}) {
  const [name,setName]=useState("");
  return (
    <DarkScreen>
      <div style={{fontSize:"3.5rem",textAlign:"center",marginBottom:16}}>👋</div>
      <Logo text="What's your name?" size="1.9rem"/>
      <Sub>Friends will see this on the quiz link</Sub>
      <input className="fq-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name…" onKeyDown={e=>{if(e.key==="Enter"&&name.trim())onNext(name.trim());}} style={{marginBottom:14}} autoFocus/>
      <Row><BackBtn onClick={onBack}/><button className="fq-btn fq-btn-primary" onClick={()=>onNext(name.trim())} disabled={!name.trim()} style={{flex:1}}>Let's go →</button></Row>
    </DarkScreen>
  );
}

// ── Step 2: Pick 5 preset sets ────────────────────────────────────────────
function SetPickerScreen({creatorName,onBack,onDone}) {
  const [selected,setSelected]=useState([]);
  const MAX=5;

  function toggle(set) {
    setSelected(prev=>{
      if(prev.find(s=>s.id===set.id)) return prev.filter(s=>s.id!==set.id);
      if(prev.length>=MAX) return prev;
      return [...prev,set];
    });
  }

  return (
    <div style={{height:"100%",background:`linear-gradient(145deg,${C.dark},#2d1458)`,overflowY:"auto",padding:"1.5rem 1rem 2rem"}}>
      <div style={{maxWidth:440,margin:"0 auto"}}>
        {/* Header */}
        <div style={{marginBottom:20}}>
          <Logo text="Pick Your Questions" size="1.8rem"/>
          <Sub mb="0.5rem">Choose exactly 5 sets for your quiz</Sub>
          <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:16}}>
            {Array.from({length:MAX}).map((_,i)=>(
              <div key={i} style={{width:32,height:6,borderRadius:3,background:i<selected.length?C.yellow:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}/>
            ))}
          </div>
          <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.45)",textAlign:"center"}}>{selected.length}/{MAX} selected</p>
        </div>

        {/* Set cards grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {PRESET_SETS.map(set=>{
            const isSel=selected.find(s=>s.id===set.id);
            const isMax=selected.length>=MAX&&!isSel;
            return (
              <div key={set.id} className={`set-card ${isSel?"selected":""}`}
                onClick={()=>!isMax&&toggle(set)}
                style={{opacity:isMax?0.4:1,cursor:isMax?"not-allowed":"pointer"}}>
                <div style={{position:"relative",height:110,borderRadius:17,overflow:"hidden",background:"#1a1730"}}>
                  <img src={set.bgPhoto} alt={set.label} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/>
                  <div style={{position:"absolute",inset:0,background:set.bgColor}}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.8) 100%)"}}/>
                  {isSel&&<div style={{position:"absolute",top:8,right:8,background:C.yellow,borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",fontWeight:900,color:"#1a1730"}}>{selected.indexOf(isSel)+1}</div>}
                  <div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center"}}>
                    <div style={{fontSize:"1.5rem",marginBottom:2}}>{set.emoji}</div>
                    <p style={{fontFamily:"'Fredoka One',cursive",fontSize:"0.9rem",color:"#fff"}}>{set.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Row>
          <BackBtn onClick={onBack}/>
          <button className="fq-btn fq-btn-primary" onClick={()=>onDone(selected)} disabled={selected.length!==MAX} style={{flex:1}}>
            {selected.length===MAX?"Next →":`Select ${MAX-selected.length} more`}
          </button>
        </Row>
      </div>
    </div>
  );
}

// ── Step 3: Custom question modal ─────────────────────────────────────────
function CustomQuestionModal({onAdd,onSkip,count,max}) {
  const [question,setQuestion]=useState("");
  const [options,setOptions]=useState(["","","",""]);
  const [loading,setLoading]=useState(false);

  function setOpt(i,v){setOptions(p=>{const n=[...p];n[i]=v;return n;});}
  const allFilled=question.trim()&&options.every(o=>o.trim());

  async function handleAdd() {
    setLoading(true);
    // Auto-assign Unsplash photos for each option
    const withPhotos=options.map(label=>({
      label:label.trim(),
      photo:getUnsplashPhoto(label.trim()),
    }));
    onAdd({
      id:`custom_${Date.now()}`,
      label:question.trim(),
      emoji:"⭐",
      question:`What is {name}'s ${question.trim().toLowerCase()}?`,
      bgPhoto:getUnsplashPhoto(question.trim()),
      bgColor:"rgba(60,20,80,0.5)",
      options:withPhotos,
      isCustom:true,
    });
    setLoading(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-sheet">
        <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.5rem",color:"#fff",marginBottom:4,textAlign:"center"}}>
          ⭐ Custom Question {count}/{max}
        </h2>
        <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.85rem",color:"rgba(255,255,255,0.5)",textAlign:"center",marginBottom:20}}>
          Type your question and 4 options — we'll find photos automatically!
        </p>

        <label style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.8rem",fontWeight:800,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px",display:"block",marginBottom:6}}>Your question</label>
        <input className="fq-input" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="e.g. Favourite Car" style={{marginBottom:16}}/>

        <label style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.8rem",fontWeight:800,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px",display:"block",marginBottom:8}}>4 Options</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
          {options.map((opt,i)=>(
            <input key={i} className="fq-input" value={opt} onChange={e=>setOpt(i,e.target.value)}
              placeholder={`Option ${i+1}…`} style={{padding:"12px 14px",fontSize:"0.9rem"}}/>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button className="fq-btn fq-btn-primary" onClick={handleAdd} disabled={!allFilled||loading}>
            {loading?"Finding photos…":"✅ Add This Question"}
          </button>
          <button className="fq-btn-skip" onClick={onSkip} style={{width:"100%",textAlign:"center",padding:"12px"}}>
            Skip custom questions
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Post-set-picker — custom Q prompt ─────────────────────────────
function CustomPromptScreen({selectedSets,creatorName,onDone}) {
  const [customSets,setCustomSets]=useState([]);
  const [showModal,setShowModal]=useState(false);
  const [askAgain,setAskAgain]=useState(false);
  const MAX_CUSTOM=2;

  function handleAdd(newSet) {
    const updated=[...customSets,newSet];
    setCustomSets(updated);
    setShowModal(false);
    if(updated.length<MAX_CUSTOM) setAskAgain(true);
    else finalize(updated);
  }

  function finalize(custom=customSets) {
    setAskAgain(false);
    setShowModal(false);
    onDone([...selectedSets,...custom]);
  }

  return (
    <DarkScreen>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:"3.5rem",marginBottom:12}}>✅</div>
        <Logo text="Sets ready!" size="1.8rem"/>
        <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.6)",lineHeight:1.7,marginTop:8}}>
          You picked <strong style={{color:"#fff"}}>{selectedSets.length} sets</strong>.<br/>
          Want to add a custom question? ({MAX_CUSTOM} max)
        </p>
        {customSets.length>0&&(
          <p style={{fontFamily:"'Nunito',sans-serif",color:C.green,fontSize:"0.88rem",marginTop:8}}>
            ✅ {customSets.map(s=>s.label).join(", ")} added!
          </p>
        )}
      </div>

      {askAgain?(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.7)",textAlign:"center",fontSize:"0.95rem"}}>
            Add another custom question? ({customSets.length}/{MAX_CUSTOM} used)
          </p>
          <button className="fq-btn fq-btn-primary" onClick={()=>{setAskAgain(false);setShowModal(true);}}>➕ Add Another</button>
          <button className="fq-btn fq-btn-green" onClick={()=>finalize()}>✅ Finish & Create Quiz</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {customSets.length<MAX_CUSTOM&&(
            <button className="fq-btn fq-btn-primary" onClick={()=>setShowModal(true)}>➕ Add Custom Question</button>
          )}
          <button className="fq-btn fq-btn-green" onClick={()=>finalize()}>
            {customSets.length===0?"Skip & Create Quiz →":"✅ Finish & Create Quiz"}
          </button>
        </div>
      )}

      {showModal&&(
        <CustomQuestionModal
          count={customSets.length+1}
          max={MAX_CUSTOM}
          onAdd={handleAdd}
          onSkip={()=>finalize()}
        />
      )}
    </DarkScreen>
  );
}

// ── Step 4: Save quiz ─────────────────────────────────────────────────────
// (handled inline in root app after CustomPromptScreen calls onDone)

// ── Profile Created ────────────────────────────────────────────────────────
function ProfileCreatedScreen({creatorName,quizCode,onViewDashboard}) {
  const url=shareUrl(quizCode);
  return (
    <div style={{height:"100%",background:`linear-gradient(145deg,${C.dark},#1a2744)`,overflowY:"auto",padding:"2rem 1rem 2.5rem"}}>
      <Confetti/>
      <div style={{maxWidth:420,margin:"0 auto",animation:"fadeUp 0.5s ease"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:"4rem",marginBottom:12,animation:"bounce 1.5s ease infinite"}}>🎉</div>
          <Logo text="Profile Created!" size="2rem"/>
          <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.65)",fontSize:"1rem",lineHeight:1.7,marginTop:8}}>
            <span style={{color:"#fff",fontWeight:800}}>{creatorName}</span>'s friendship profile is live!<br/>
            Share it with your friends to participate.
          </p>
        </div>

        {/* Code pill */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{display:"inline-block",fontFamily:"'Fredoka One',cursive",fontSize:"1.6rem",color:"#fff",background:"rgba(124,58,237,0.35)",border:"2px solid rgba(124,58,237,0.55)",borderRadius:14,padding:"6px 24px",letterSpacing:5}}>{quizCode}</div>
          <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.75rem",color:"rgba(255,255,255,0.35)",marginTop:6}}>Friends can enter this code manually</p>
        </div>

        {/* Share buttons */}
        <div style={{marginBottom:16}}>
          <ShareButtons url={url} creatorName={creatorName}/>
        </div>

        <button className="fq-btn fq-btn-green" onClick={onViewDashboard}>📊 View My Dashboard →</button>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function DashboardScreen({creatorName,quizCode,quizId,onHome}) {
  const [results,setResults]=useState([]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [copied,setCopied]=useState(false);
  const url=shareUrl(quizCode);
  const {notifs,unread,permission,requestPermission,markRead}=useNotifications(quizId,creatorName);

  useEffect(()=>{
    let alive=true;
    async function poll(){if(!alive)return;try{const r=await getResultsForQuiz(quizId);if(alive)setResults(r);}catch{}}
    poll();const t=setInterval(poll,8000);return()=>{alive=false;clearInterval(t);};
  },[quizId]);

  async function openNotifs(){setShowNotifs(true);await markRead();}

  return (
    <div style={{height:"100%",background:`linear-gradient(145deg,${C.dark},#1a2744)`,overflowY:"auto",padding:"1.5rem 1rem 2.5rem"}}>
      <div style={{maxWidth:440,margin:"0 auto"}}>

        {permission==="default"&&(
          <div style={{background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",borderRadius:16,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:"1.4rem"}}>🔔</span>
            <div style={{flex:1}}>
              <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.85rem",color:"rgba(255,255,255,0.85)",fontWeight:700,marginBottom:2}}>Enable notifications</p>
              <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.78rem",color:"rgba(255,255,255,0.5)"}}>Get notified when friends respond</p>
            </div>
            <button onClick={requestPermission} style={{background:"rgba(245,158,11,0.3)",border:"1px solid rgba(245,158,11,0.5)",borderRadius:10,padding:"6px 14px",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>Allow</button>
          </div>
        )}
        {permission==="granted"&&(
          <div style={{background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:16,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
            <span>✅</span>
            <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.6)"}}>Browser notifications enabled!</p>
          </div>
        )}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.5rem",color:"#fff"}}>My Dashboard</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.45)"}}>{creatorName}'s quiz</div>
          </div>
          <button onClick={openNotifs} style={{position:"relative",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:14,width:48,height:48,fontSize:"1.4rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",animation:unread>0?"bellShake 1s ease infinite":"none"}}>
            🔔{unread>0&&<span className="notif-badge">{unread}</span>}
          </button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[{label:"Participants",value:results.length},{label:"Avg Score",value:results.length?Math.round(results.reduce((s,r)=>s+r.percentage,0)/results.length)+"%":"—"}].map(stat=>(
            <div key={stat.label} style={{background:"rgba(255,255,255,0.06)",borderRadius:16,padding:"14px 16px",border:"1px solid rgba(255,255,255,0.09)"}}>
              <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",marginBottom:4}}>{stat.label}</p>
              <p style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.8rem",color:"#fff"}}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div style={{background:"rgba(255,255,255,0.06)",borderRadius:18,padding:"14px 16px",marginBottom:18,border:"1px solid rgba(255,255,255,0.09)"}}>
          <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",marginBottom:10,textTransform:"uppercase",letterSpacing:"1.5px"}}>Share your quiz</p>
          <ShareButtons url={shareUrl(quizCode)} creatorName={creatorName}/>
        </div>

        <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:20,padding:"16px 18px",marginBottom:18}}>
          <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.15rem",color:"#fff",marginBottom:14}}>🏆 Friend Scores</h3>
          {results.length===0?(
            <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.35)",fontSize:"0.9rem"}}>No one has taken it yet — share the link!</p>
          ):results.map((r,i)=>(
            <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<results.length-1?"1px solid rgba(255,255,255,0.07)":"none"}}>
              <div>
                <p style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,color:"#fff",fontSize:"0.95rem"}}>{r.player_name}</p>
                <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.75rem",color:"rgba(255,255,255,0.38)"}}>{r.relation} · {new Date(r.taken_at).toLocaleDateString()}</p>
              </div>
              <span style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.4rem",color:r.percentage>=80?C.green:r.percentage>=50?C.yellow:C.pink}}>{r.percentage}%</span>
            </div>
          ))}
        </div>

        <button className="fq-btn fq-btn-ghost" onClick={onHome}>🏠 Back to Home</button>
      </div>

      {showNotifs&&(
        <div style={{position:"fixed",inset:0,zIndex:100}}>
          <div onClick={()=>setShowNotifs(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"absolute",top:0,right:0,bottom:0,width:"min(360px,100vw)",background:"#1a1730",borderLeft:"1px solid rgba(255,255,255,0.1)",padding:"24px 18px",overflowY:"auto",animation:"slideInRight 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.4rem",color:"#fff"}}>🔔 Notifications</h2>
              <button onClick={()=>setShowNotifs(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:"1.5rem",cursor:"pointer"}}>✕</button>
            </div>
            {notifs.length===0?<p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.35)",fontSize:"0.9rem"}}>No notifications yet.</p>
            :notifs.map(n=>(
              <div key={n.id} className={`notif-item ${n.is_read?"":"unread"}`}>
                <p>{n.message}</p>
                <p style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.35)",marginTop:4}}>{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  FRIEND (PLAYER) FLOW
// ══════════════════════════════════════════════════════════════

function EnterCodeScreen({onBack,onLoad}) {
  const [code,setCode]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function handleLoad(){
    setError("");setLoading(true);
    try{const quiz=await getQuizByCode(code.trim().toLowerCase());onLoad(quiz);}
    catch{setError("Quiz not found. Check the code and try again.");}
    finally{setLoading(false);}
  }
  return (
    <DarkScreen>
      <div style={{fontSize:"3.5rem",textAlign:"center",marginBottom:16}}>🔗</div>
      <Logo text="Enter the code" size="1.9rem"/>
      <Sub>Your friend shared a quiz code with you</Sub>
      <input className="fq-input" placeholder="e.g. ab3x9f2k" value={code} onChange={e=>{setCode(e.target.value);setError("");}} onKeyDown={e=>{if(e.key==="Enter"&&code.trim())handleLoad();}} style={{marginBottom:12,textAlign:"center",fontSize:"1.3rem",letterSpacing:5}} autoFocus/>
      {error&&<p style={{fontFamily:"'Nunito',sans-serif",color:"#f87171",textAlign:"center",fontSize:"0.88rem",marginBottom:12}}>{error}</p>}
      <Row><BackBtn onClick={onBack}/><button className="fq-btn fq-btn-primary" onClick={handleLoad} disabled={!code.trim()||loading} style={{flex:1}}>{loading?"Loading…":"Open Quiz →"}</button></Row>
    </DarkScreen>
  );
}

function WelcomeScreen({quiz,onNext}) {
  const hasSets = quiz.sets && quiz.sets.length > 0;
  return (
    <DarkScreen>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:"4rem",marginBottom:12,animation:"bounce 2s ease infinite"}}>👋</div>
        <Logo text="Welcome!" size="2.2rem"/>
        <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.6)",fontSize:"1rem",lineHeight:1.7,marginTop:10}}>You've been invited to take</p>
        <p style={{fontFamily:"'Fredoka One',cursive",fontSize:"2rem",background:`linear-gradient(135deg,#a78bfa,${C.pink})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"6px 0"}}>{quiz.creator_name}'s</p>
        <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.6)",fontSize:"1rem"}}>Friendship Profile Quiz!</p>
      </div>
      {!hasSets ? (
        <div style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:16,padding:"16px",textAlign:"center",marginBottom:16}}>
          <p style={{fontFamily:"'Nunito',sans-serif",color:"#f87171",fontWeight:700,marginBottom:6}}>⚠️ This quiz has no questions yet</p>
          <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.5)",fontSize:"0.85rem"}}>The creator needs to recreate their quiz — this one was made before questions were added.</p>
        </div>
      ) : (
        <button className="fq-btn fq-btn-primary" onClick={onNext} style={{fontSize:"1.1rem",padding:"18px"}}>Let's do this! 🎯</button>
      )}
    </DarkScreen>
  );
}

function PlayerIntroScreen({quiz,onBack,onStart}) {
  const [name,setName]=useState("");
  const [relation,setRelation]=useState("");
  return (
    <DarkScreen>
      <div style={{fontSize:"3rem",textAlign:"center",marginBottom:14}}>🧠</div>
      <Logo text="First, about you" size="1.8rem"/>
      <Sub>Tell {quiz.creator_name} who you are</Sub>
      <label style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.8rem",fontWeight:800,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px",display:"block",marginBottom:6}}>Your name</label>
      <input className="fq-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name…" style={{marginBottom:14}} autoFocus/>
      <label style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.8rem",fontWeight:800,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px",display:"block",marginBottom:6}}>Your relation to {quiz.creator_name}</label>
      <select className="fq-select" value={relation} onChange={e=>setRelation(e.target.value)} style={{marginBottom:20}}>
        <option value="" disabled>Select relation…</option>
        {RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}
      </select>
      <Row><BackBtn onClick={onBack}/><button className="fq-btn fq-btn-primary" onClick={()=>onStart(name.trim(),relation)} disabled={!name.trim()||!relation} style={{flex:1}}>Continue →</button></Row>
    </DarkScreen>
  );
}

function PlayerReadyScreen({playerName,quiz,onStart}) {
  const sets=quiz.sets||[];
  return (
    <DarkScreen>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"4rem",marginBottom:14,animation:"pulse 2s ease-in-out infinite"}}>🎮</div>
        <Logo text={`Ready, ${playerName}?`} size="2rem"/>
        <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.6)",lineHeight:1.7,margin:"12px 0 32px"}}>
          You'll answer <strong style={{color:"#fff"}}>{(quiz.sets||[]).length} questions</strong> about <strong style={{color:"#fff"}}>{quiz.creator_name}</strong>.<br/>
          Tap the correct photo — your score gets sent to them!
        </p>
        <button className="fq-btn fq-btn-primary" onClick={onStart} style={{fontSize:"1.15rem",padding:"20px"}}>🚀 Press Start to Begin</button>
      </div>
    </DarkScreen>
  );
}

// ── Play screen — multiple choice photo cards ──────────────────────────────
function PlayScreen({quiz,playerName,relation,onFinish}) {
  const sets=quiz.sets||[];
  const [current,setCurrent]=useState(0);
  const [selected,setSelected]=useState(null);   // option label chosen
  const [revealed,setRevealed]=useState(false);
  const [playerAnswers,setPlayerAnswers]=useState([]);
  const [submitting,setSubmitting]=useState(false);

  const set=sets[current];
  if(!set) return null;

  const correctLabel=set.correctAnswer; // set by creator when quiz was built

  function handleSelect(label) {
    if(revealed) return;
    setSelected(label);
    setRevealed(true);
    setTimeout(()=>advance(label),1200);
  }

  async function advance(chosen) {
    const isCorrect=chosen.toLowerCase()===correctLabel.toLowerCase();
    const newAnswers=[...playerAnswers,{
      question:set.question.replace("{name}",quiz.creator_name),
      correct:correctLabel,
      given:chosen,
      isCorrect,
      key:set.id,
    }];
    setPlayerAnswers(newAnswers);

    if(current<sets.length-1){
      setCurrent(c=>c+1);
      setSelected(null);
      setRevealed(false);
    } else {
      setSubmitting(true);
      try{
        const answersPayload=newAnswers.map(a=>({key:a.key,question:a.question,given:a.given}));
        const result=await saveResult({quizId:quiz.id,playerName,relation,answers:answersPayload});
        onFinish(result,newAnswers);
      }catch(e){alert("Error: "+e.message);}
      finally{setSubmitting(false);}
    }
  }

  function getCardState(label) {
    if(!revealed) return "";
    if(label===correctLabel) return "correct";
    if(label===selected&&label!==correctLabel) return "wrong";
    return "";
  }

  return (
    <PhotoBg photo={set.bgPhoto} color={set.bgColor} index={current} total={sets.length}>
      {/* Full layout wrapper — flex column so content fits any screen */}
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"0 16px 20px"}}>
        {/* Question area — top portion */}
        <div style={{textAlign:"center",padding:"60px 8px 12px",flex:"0 0 auto"}}>
          <div style={{fontSize:"clamp(2rem,5vw,3rem)",marginBottom:6,filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.5))",animation:"pulse 3s ease-in-out infinite"}}>{set.emoji}</div>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(1rem,3.5vw,1.5rem)",color:"#fff",textShadow:"0 2px 12px rgba(0,0,0,0.6)",lineHeight:1.3,maxWidth:600,margin:"0 auto"}}>
            {set.question.replace("{name}",quiz.creator_name)}
          </h2>
        </div>

        {/* 2x2 option grid — bottom portion, constrained */}
        <div style={{flex:"0 0 auto",maxWidth:560,width:"100%",margin:"0 auto"}}>
          {submitting&&<p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.7)",textAlign:"center",marginBottom:8,fontSize:"0.88rem"}}>Submitting…</p>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {(set.options||[]).map(opt=>(
              <div key={opt.label} style={{height:"clamp(110px,20vh,200px)"}}>
                <OptionCard
                  option={opt}
                  state={revealed?getCardState(opt.label):""}
                  onClick={()=>handleSelect(opt.label)}
                  disabled={revealed||submitting}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhotoBg>
  );
}

// ── Results ────────────────────────────────────────────────────────────────
function ResultsScreen({quiz,playerName,relation,result,localAnswers,onHome}) {
  const {percentage,score,total}=result;
  const [title,subtitle]=getScoreMessage(percentage);
  const url=shareUrl(quiz.code);

  return (
    <div style={{height:"100%",background:`linear-gradient(145deg,${C.dark},#1a2744)`,overflowY:"auto",padding:"2rem 1rem 2.5rem"}}>
      <Confetti/>
      <div style={{maxWidth:420,margin:"0 auto",animation:"fadeUp 0.5s ease"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <ScoreRing pct={percentage}/>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.7rem",color:"#fff",marginBottom:6}}>{title}</h2>
          <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.55)",fontSize:"0.95rem"}}>{subtitle}</p>
          <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.35)",fontSize:"0.82rem",marginTop:8}}>You got <strong style={{color:"#fff"}}>{score}/{total}</strong> correct</p>
        </div>

        <div style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.35)",borderRadius:16,padding:"12px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1.4rem"}}>📨</span>
          <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.88rem",color:"rgba(255,255,255,0.75)",lineHeight:1.5}}>Score sent to <strong style={{color:"#fff"}}>{quiz.creator_name}</strong>!</p>
        </div>

        {/* Review */}
        <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:20,padding:"16px 18px",marginBottom:20}}>
          <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.1rem",color:"#fff",marginBottom:14}}>📋 How you did</h3>
          {(localAnswers||[]).map((a,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderBottom:i<localAnswers.length-1?"1px solid rgba(255,255,255,0.07)":"none"}}>
              <span style={{fontSize:"1.1rem",marginTop:2}}>{a.isCorrect?"✅":"❌"}</span>
              <div>
                <p style={{fontFamily:"'Nunito',sans-serif",color:"rgba(255,255,255,0.45)",fontSize:"0.78rem",marginBottom:2}}>{a.question}</p>
                <p style={{fontFamily:"'Nunito',sans-serif",color:"#fff",fontWeight:700,fontSize:"0.9rem"}}>✓ {a.correct}</p>
                {!a.isCorrect&&<p style={{fontFamily:"'Nunito',sans-serif",color:"#f87171",fontSize:"0.84rem"}}>✗ You said: {a.given||"(blank)"}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Share your score */}
        <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:20,padding:"16px 18px",marginBottom:20}}>
          <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.1rem",color:"#fff",marginBottom:14}}>📣 Share your score!</h3>
          <ShareButtons url={url} creatorName={quiz.creator_name} score={score} pct={percentage}/>
        </div>

        <button className="fq-btn fq-btn-primary" onClick={onHome} style={{marginBottom:12}}>🏠 Back to Home</button>
        <button className="fq-btn fq-btn-ghost" onClick={()=>window.location.href=window.location.pathname}>✏️ Create My Own Quiz</button>
      </div>
    </div>
  );
}


// ── Creator: pick correct answer for each set ─────────────────────────────
function AnswerPickerScreen({sets, creatorName, onBack, onDone}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});   // { setId: optionLabel }
  const [chosen, setChosen]   = useState(null); // currently selected on this slide

  const set = sets[current];
  const total = sets.length;
  const isLast = current === total - 1;

  function handlePick(label) {
    if (chosen) return; // already picked
    setChosen(label);
    setAnswers(prev => ({ ...prev, [set.id]: label }));
  }

  function handleNext() {
    if (!chosen) return;
    if (!isLast) {
      setCurrent(c => c + 1);
      setChosen(null);
    } else {
      // Attach correctAnswer to each set
      const setsWithAnswers = sets.map(s => ({
        ...s,
        correctAnswer: answers[s.id] || s.options[0].label,
      }));
      onDone(setsWithAnswers);
    }
  }

  if (!set) return null;

  return (
    <PhotoBg photo={set.bgPhoto} color={set.bgColor} index={current} total={total}>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"0 16px 20px"}}>
        {/* Question area */}
        <div style={{textAlign:"center",padding:"60px 8px 10px",flex:"0 0 auto"}}>
          <p style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.75rem",fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:"rgba(255,255,255,0.55)",marginBottom:6}}>
            Pick YOUR answer
          </p>
          <div style={{fontSize:"clamp(2rem,5vw,3rem)",marginBottom:6,filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.5))"}}>{set.emoji}</div>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(1rem,3.5vw,1.5rem)",color:"#fff",textShadow:"0 2px 12px rgba(0,0,0,0.6)",lineHeight:1.3,maxWidth:600,margin:"0 auto"}}>
            {set.question.replace("{name}", "your")}
          </h2>
        </div>

        {/* Options + Next button */}
        <div style={{flex:"0 0 auto",maxWidth:560,width:"100%",margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:chosen?10:0}}>
            {set.options.map(opt => {
              let state = "";
              if (chosen) {
                if (opt.label === chosen) state = "correct";
                else state = "wrong";
              }
              return (
                <OptionCard
                  key={opt.label}
                  option={opt}
                  state={state}
                  onClick={() => handlePick(opt.label)}
                  disabled={!!chosen}
                />
              );
            })}
          </div>
          {chosen && (
            <div style={{animation:"fadeUp 0.3s ease"}}>
              <button className="fq-btn fq-btn-primary" onClick={handleNext}>
                {isLast ? "✅ Done — Add Custom Questions?" : `Next Set →`}
              </button>
            </div>
          )}
        </div>
      </div>
    </PhotoBg>
  );
}

// ══════════════════════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════════════════════
function HomeScreen({onCreate,onTake}) {
  return (
    <DarkScreen>
      <Logo size="clamp(2.6rem,9vw,3.8rem)"/>
      <Sub mb="2.5rem">Create a quiz about yourself.<br/>See how well your friends really know you 👀</Sub>
      <div style={{fontSize:"2.4rem",textAlign:"center",letterSpacing:10,marginBottom:"2.5rem"}}>🧠💛🤩🫶🔥</div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <button className="fq-btn fq-btn-primary" onClick={onCreate} style={{fontSize:"1.1rem",padding:"18px"}}>✏️ Create My Quiz</button>
        <button className="fq-btn fq-btn-ghost" onClick={onTake}>🔗 Enter a Friend's Code</button>
      </div>
    </DarkScreen>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════
export default function FriendQuiz() {
  const urlCode=useUrlCode();
  const [screen,setScreen]         =useState(()=>urlCode?"loading":"home");
  const [creatorName,setCreatorName]=useState("");
  const [quizMeta,setQuizMeta]     =useState(null);
  const [activeQuiz,setActiveQuiz] =useState(null);
  const [playerName,setPlayerName] =useState("");
  const [relation,setRelation]     =useState("");
  const [finalResult,setFinalResult]=useState(null);
  const [localAnswers,setLocalAnswers]=useState([]);
  const [saving,setSaving]         =useState(false);
  const [pendingSets,setPendingSets]=useState([]);
  const pendingSetsRef             =useRef([]);  // ref backup to avoid stale closure
  const go=useCallback(s=>setScreen(s),[]);

  useEffect(()=>{
    if(!urlCode)return;
    getQuizByCode(urlCode)
      .then(quiz=>{setActiveQuiz(quiz);go("welcome");})
      .catch(()=>go("enter-code"));
  },[]);

  // Called when creator finishes picking sets + custom questions
  async function handleQuizReady(allSets) {
    setSaving(true);
    console.log("[handleQuizReady] allSets received:", allSets?.length, allSets?.map(s=>s.id));
    try {
      // correctAnswer already set by AnswerPickerScreen for presets
      // and defaults to options[0] for custom questions
      const setsWithAnswers = allSets.map(set => ({
        ...set,
        correctAnswer: set.correctAnswer || set.options[0].label,
      }));
      const answers = {};
      setsWithAnswers.forEach(s => { answers[s.id] = s.correctAnswer; });
      console.log("[handleQuizReady] sending sets:", setsWithAnswers?.length);
      const result = await createQuiz({
        creatorName,
        answers,
        sets: setsWithAnswers,
      });
      console.log("[handleQuizReady] server response:", result);
      const { id, code } = result;
      setQuizMeta({ id, code });
      go("profile-created");
    } catch(e) {
      alert("Error saving quiz: " + e.message);
    } finally { setSaving(false); }
  }

  return (
    <div style={{height:"100%",display:"flex",justifyContent:"center",background:C.dark}}>
      <div style={{width:"100%",maxWidth:"480px",height:"100%",position:"relative",overflow:"hidden"}}>
      <InjectStyles/>
      {saving&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.5rem",color:"#fff"}}>Creating your quiz… 🎉</p></div>}

      {screen==="loading"       && <DarkScreen><p style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.5rem",color:"rgba(255,255,255,0.4)",textAlign:"center"}}>Loading quiz…</p></DarkScreen>}
      {screen==="home"          && <HomeScreen onCreate={()=>go("creator-name")} onTake={()=>go("enter-code")}/>}
      {screen==="creator-name"  && <CreatorNameScreen onBack={()=>go("home")} onNext={name=>{setCreatorName(name);go("set-picker");}}/>}
      {screen==="set-picker"    && <SetPickerScreen creatorName={creatorName} onBack={()=>go("creator-name")} onDone={sets=>{setPendingSets(sets);go("answer-picker");}} />}
      {screen==="answer-picker"  && <AnswerPickerScreen sets={pendingSets} creatorName={creatorName} onBack={()=>go("set-picker")} onDone={setsWithAnswers=>{pendingSetsRef.current=setsWithAnswers;setPendingSets(setsWithAnswers);go("custom-prompt");}}/>}
      {screen==="custom-prompt" && <CustomPromptScreen selectedSets={pendingSetsRef.current.length>0?pendingSetsRef.current:pendingSets} creatorName={creatorName} onDone={handleQuizReady}/>}
      {screen==="profile-created"&&quizMeta && <ProfileCreatedScreen creatorName={creatorName} quizCode={quizMeta.code} onViewDashboard={()=>go("dashboard")}/>}
      {screen==="dashboard"     &&quizMeta  && <DashboardScreen creatorName={creatorName} quizCode={quizMeta.code} quizId={quizMeta.id} onHome={()=>go("home")}/>}
      {screen==="enter-code"    && <EnterCodeScreen onBack={()=>go("home")} onLoad={quiz=>{setActiveQuiz(quiz);go("welcome");}}/>}
      {screen==="welcome"       &&activeQuiz && <WelcomeScreen quiz={activeQuiz} onNext={()=>go("player-intro")}/>}
      {screen==="player-intro"  &&activeQuiz && <PlayerIntroScreen quiz={activeQuiz} onBack={()=>go("welcome")} onStart={(name,rel)=>{setPlayerName(name);setRelation(rel);go("player-ready");}}/>}
      {screen==="player-ready"  &&activeQuiz && <PlayerReadyScreen playerName={playerName} quiz={activeQuiz} onStart={()=>go("play")}/>}
      {screen==="play"          &&activeQuiz && <PlayScreen quiz={activeQuiz} playerName={playerName} relation={relation} onFinish={(result,answers)=>{setFinalResult(result);setLocalAnswers(answers);go("results");}}/>}
      {screen==="results"       &&activeQuiz&&finalResult && <ResultsScreen quiz={activeQuiz} playerName={playerName} relation={relation} result={finalResult} localAnswers={localAnswers} onHome={()=>{go("home");setActiveQuiz(null);setFinalResult(null);}}/>}
      </div>
    </div>
  );
}
