import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { User, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { CollectionReference, addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Candidate, STAGES, Stage } from "./types";

const BUG = new URLSearchParams(location.search).get("bug") === "1";
const AUTH_ERR: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/weak-password": "Use a password of at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
    "auth/missing-email": "Enter your email address.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
};
const pad = (n: number) => String(n).padStart(2, "0");
const slot = (d: number, h: number) => { const x = new Date(); x.setDate(x.getDate() + d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(h)}:00`; };
const nowLocal = () => slot(0, new Date().getHours());
const SEED: Omit<Candidate, "id">[] = [
  { name: "Priya Raman", role: "Backend Engineer", email: "priya.raman@example.com", stage: "Interview", score: 4, notes: "Strong systems background.", at: slot(1, 10), who: "Daniel Okafor" },
  { name: "Marcus Lindqvist", role: "Backend Engineer", email: "m.lindqvist@example.com", stage: "Screening", score: 3, notes: "", at: "", who: "" },
  { name: "Aisha Khan", role: "Product Designer", email: "aisha.khan@example.com", stage: "Offer", score: 5, notes: "Excellent portfolio review.", at: "", who: "" },
  { name: "Tomás Alvarez", role: "Data Analyst", email: "t.alvarez@example.com", stage: "Applied", score: 0, notes: "", at: "", who: "" },
  { name: "Hannah Mehta", role: "Product Designer", email: "h.mehta@example.com", stage: "Interview", score: 4, notes: "", at: slot(2, 14), who: "Daniel Okafor" },
  { name: "Wei Zhang", role: "Data Analyst", email: "wei.zhang@example.com", stage: "Screening", score: 3, notes: "", at: "", who: "" },
];

function Auth() {
  type Mode = "in" | "up" | "reset";
  const [mode, setMode] = useState<Mode>("in"), [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false);
  const go = (m: Mode) => { setMode(m); setErr(""); setInfo(""); };
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(""); setInfo("");
    if (!email.trim()) return setErr("Enter your email address.");
    setBusy(true);
    try {
      if (mode === "reset") { await sendPasswordResetEmail(auth, email.trim()); setInfo("If an account exists for this email, a reset link is on its way. Check your inbox and spam folder."); }
      else await (mode === "up" ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, email.trim(), pw);
       } catch (x) { const code = (x as { code?: string }).code ?? ""; setErr(AUTH_ERR[code] ?? `Something went wrong (${code || "unknown"}). Please try again.`); }
    setBusy(false);
  }
  const title = { in: "Sign in", up: "Create your workspace", reset: "Reset your password" }[mode];
  return (
    <div className="auth">
      <section className="pitch">
        <div className="logo">Shortlist</div>
        <h1>Hire deliberately.</h1>
        <p>One pipeline for every candidate, every interview and every decision, with no double-booked interviewers.</p>
        <dl><div><dt>4</dt><dd>pipeline stages</dd></div><div><dt>0</dt><dd>scheduling conflicts</dd></div></dl>
      </section>
      <form className="login" onSubmit={submit} noValidate>
        <h2>{title}</h2>
        {mode === "reset" && <p className="sub">Enter your email and we will send you a link to choose a new password.</p>}
        <label htmlFor="em">Work email</label><input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== "reset" && <><label htmlFor="pw">Password</label><input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></>}
        <button type="submit" disabled={busy}>{{ in: "Sign in", up: "Create account", reset: "Send reset link" }[mode]}</button>
        <div className="msg err" role="alert">{err}</div><div className="msg good" role="status">{info}</div>
        {mode === "in" && <button type="button" className="link" onClick={() => go("reset")}>Forgot password?</button>}
        <button type="button" className="link" onClick={() => go(mode === "in" ? "up" : "in")}>{mode === "in" ? "New here? Create an account" : mode === "up" ? "Have an account? Sign in" : "Back to sign in"}</button>
      </form>
    </div>
  );
}

function Drawer({ c, col, list, onClose }: { c: Candidate; col: CollectionReference; list: Candidate[]; onClose: () => void }) {
  const [at, setAt] = useState(c.at), [who, setWho] = useState(c.who), [err, setErr] = useState(""), [ok, setOk] = useState(""), [notes, setNotes] = useState(c.notes), [sure, setSure] = useState(false);
  const ref = doc(col, c.id);
  async function schedule(e: FormEvent) {
    e.preventDefault(); setOk("");
    if (!at || !who.trim()) return setErr("Choose a date, time and interviewer.");
    const clash = list.find((x) => x.id !== c.id && x.at === at && x.who.toLowerCase() === who.trim().toLowerCase());
    if (clash && !BUG) return setErr(`${who.trim()} is already interviewing ${clash.name} at that time.`);
    setErr(""); await updateDoc(ref, { at, who: who.trim(), stage: c.stage === "Offer" ? "Offer" : "Interview" }); setOk("Interview scheduled.");
  }
  return (
    <div className="scrim" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={c.name} onClick={(e) => e.stopPropagation()}>
        <button className="x" aria-label="Close" onClick={onClose}>×</button>
        <h2>{c.name}</h2><p className="sub">{c.role} · {c.email}</p>
        <label htmlFor="st">Stage</label>
        <select id="st" value={c.stage} onChange={(e) => updateDoc(ref, { stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
        <label htmlFor="sc">Score (0 to 5)</label>
        <input id="sc" type="number" min={0} max={5} value={c.score} onChange={(e) => updateDoc(ref, { score: Math.max(0, Math.min(5, +e.target.value || 0)) })} />
        <label htmlFor="nt">Notes</label>
        <textarea id="nt" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => updateDoc(ref, { notes })} />
        <form onSubmit={schedule} noValidate className="sched">
          <h3>Schedule interview</h3>
          <label htmlFor="at">Date and time</label><input id="at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          <label htmlFor="wh">Interviewer</label><input id="wh" value={who} onChange={(e) => setWho(e.target.value)} />
          <button type="submit">Schedule</button>
          <div className="msg err" role="alert">{err}</div><div className="msg good" role="status">{ok}</div>
        </form>
        <button className="danger" onClick={async () => { if (sure) { await deleteDoc(ref); onClose(); } else setSure(true); }}>{sure ? "Confirm removal" : "Remove candidate"}</button>
      </aside>
    </div>
  );
}

function Shell({ user }: { user: User }) {
  const col = useMemo(() => collection(db, "users", user.uid, "candidates"), [user.uid]);
  const [list, setList] = useState<Candidate[]>([]), [tab, setTab] = useState<"pipeline" | "schedule">("pipeline"), [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false), [q, setQ] = useState(""), [role, setRole] = useState("All"), [f, setF] = useState({ name: "", role: "", email: "" }), [ferr, setFerr] = useState("");
  useEffect(() => onSnapshot(query(col, orderBy("createdAt", "desc")), (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Candidate, "id">) })))), [col]);
  const roles = ["All", ...Array.from(new Set(list.map((c) => c.role)))];
  const shown = list.filter((c) => (role === "All" || c.role === role) && (c.name + c.role).toLowerCase().includes(q.toLowerCase()));
  const upcoming = list.filter((c) => c.at && c.at >= nowLocal()).sort((a, b) => a.at.localeCompare(b.at));
  const offers = list.filter((c) => c.stage === "Offer").length;
  const rate = list.length ? Math.round((offers / (list.length + (BUG ? 1 : 0))) * 100) : 0;
  const selected = list.find((c) => c.id === sel) ?? null;
  const drop = (e: DragEvent, s: Stage) => { const id = e.dataTransfer.getData("text/plain"); if (id) updateDoc(doc(col, id), { stage: s }); };
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.role.trim()) return setFerr("Enter the candidate's name and role.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setFerr("Enter a valid email address.");
    await addDoc(col, { name: f.name.trim(), role: f.role.trim(), email: f.email.trim(), stage: "Applied", score: 0, notes: "", at: "", who: "", createdAt: serverTimestamp() });
    setF({ name: "", role: "", email: "" }); setFerr(""); setAdding(false);
  }
  const seed = () => SEED.forEach((c) => addDoc(col, { ...c, createdAt: serverTimestamp() }));
  const days = Array.from(new Set(upcoming.map((c) => c.at.slice(0, 10))));

  return (<>
    <header className="top">
      <div className="logo">Shortlist</div>
      <nav>{(["pipeline", "schedule"] as const).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "pipeline" ? "Pipeline" : "Schedule"}</button>)}</nav>
      <span className="who">{user.email}</span><button className="ghost" onClick={() => signOut(auth)}>Sign out</button>
    </header>
    <main>
      <div className="stats">
        <div><b data-testid="stat-total">{list.length}</b>Candidates</div>
        <div><b data-testid="stat-upcoming">{upcoming.length}</b>Upcoming interviews</div>
        <div><b data-testid="stat-offers">{offers}</b>Offers out</div>
        <div><b data-testid="stat-rate">{rate}%</b>Offer rate</div>
      </div>
      {tab === "pipeline" ? (<>
        <div className="tools">
          <input aria-label="Search" placeholder="Search candidates" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r}>{r}</option>)}</select>
          {list.length === 0 && <button className="ghost" onClick={seed}>Load sample candidates</button>}
          <button onClick={() => setAdding(true)}>Add candidate</button>
        </div>
        <div className="board">
          {STAGES.map((s) => { const items = shown.filter((c) => c.stage === s); return (
            <section key={s} className="lane" data-testid={`lane-${s}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, s)}>
              <h3>{s}<span>{items.length}</span></h3>
              {items.map((c) => (
                <button key={c.id} className="card" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)} onClick={() => setSel(c.id)}>
                  <strong>{c.name}</strong><span>{c.role}</span>
                  <em>{c.at ? "Interview " + c.at.replace("T", " ") : "Score " + c.score + "/5"}</em>
                </button>))}
              {items.length === 0 && <p className="none">No candidates</p>}
            </section>); })}
        </div>
      </>) : (
        <div className="agenda">
          {days.length === 0 && <p className="none">No interviews scheduled. Open a candidate and schedule one.</p>}
          {days.map((d) => (<section key={d}><h3>{new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</h3>
            {upcoming.filter((c) => c.at.startsWith(d)).map((c) => (
              <button key={c.id} className="slot" onClick={() => setSel(c.id)}><time>{c.at.slice(11)}</time><strong>{c.name}</strong><span>{c.role}</span><em>with {c.who}</em></button>))}
          </section>))}
        </div>)}
    </main>
    {adding && (<div className="scrim" onClick={() => setAdding(false)}>
      <form className="modal" role="dialog" aria-label="Add candidate" onClick={(e) => e.stopPropagation()} onSubmit={add} noValidate>
        <h2>Add candidate</h2>
        <label htmlFor="an">Full name</label><input id="an" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label htmlFor="ar">Role applied for</label><input id="ar" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
        <label htmlFor="ae">Email</label><input id="ae" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <div className="msg err" role="alert">{ferr}</div>
        <div className="actions"><button type="button" className="ghost" onClick={() => setAdding(false)}>Cancel</button><button type="submit">Add to pipeline</button></div>
      </form></div>)}
    {selected && <Drawer key={selected.id} c={selected} col={col} list={list} onClose={() => setSel(null)} />}
  </>);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null), [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setReady(true); }), []);
  if (!ready) return <div className="boot">Loading…</div>;
  return user ? <Shell user={user} /> : <Auth />;
}
