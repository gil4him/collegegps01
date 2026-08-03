import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { askConsult, subscribeAskThread } from "../lib/ask.js";
import { useI18n } from "../i18n/index.jsx";

// The always-on Ask bubble (pattern from collegeapp01's dock bubble, kept
// simple): round launcher bottom-right, panel that persists open state per
// device. The consultant answers, files to-dos, and remembers what it learns.
export default function AskBubble({ householdId, children: kids }) {
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem("gps.askOpen") === "1";
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [focusChildId, setFocusChildId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!householdId || !user) return undefined;
    return subscribeAskThread(householdId, user.uid, setMessages);
  }, [householdId, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem("gps.askOpen", next ? "1" : "0");
    } catch {
      /* private mode */
    }
  }

  async function send(e) {
    e.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    setDraft("");
    setNotice(null);
    setBusy(true);
    try {
      const res = await askConsult({ question, childId: focusChildId, locale });
      if (res && res.ok === false) {
        setNotice(res.reason === "unconfigured" ? t("ask.notConfigured") : t("ask.error"));
      }
    } catch (err) {
      setNotice(err?.code === "functions/resource-exhausted" ? t("ask.limit") : t("ask.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="ask-launcher"
        onClick={toggle}
        aria-label={t("ask.title")}
        aria-expanded={open}
      >
        {open ? "×" : "?"}
      </button>

      {open && (
        <section className="ask-panel" aria-label={t("ask.title")}>
          <header className="ask-head">
            <span className="ask-title">{t("ask.title")}</span>
            {kids && kids.length > 1 && (
              <div className="ask-focus">
                <button
                  className={!focusChildId ? "chip-btn chip-btn-active ask-chip" : "chip-btn ask-chip"}
                  onClick={() => setFocusChildId(null)}
                >
                  {t("ask.household")}
                </button>
                {kids.map((k) => (
                  <button
                    key={k.id}
                    className={focusChildId === k.id ? "chip-btn chip-btn-active ask-chip" : "chip-btn ask-chip"}
                    onClick={() => setFocusChildId(k.id)}
                  >
                    {k.nickname}
                  </button>
                ))}
              </div>
            )}
          </header>

          <div className="ask-thread" ref={scrollRef}>
            {messages.length === 0 && !busy && <p className="ask-intro">{t("ask.intro")}</p>}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ask-msg ask-msg-user" : "ask-msg ask-msg-ai"}>
                {m.text}
                {m.role === "assistant" && m.todosAdded > 0 && (
                  <span className="ask-todo-note">{t("ask.todosAdded", { n: m.todosAdded })}</span>
                )}
              </div>
            ))}
            {busy && <p className="ask-typing">{t("ask.thinking")}</p>}
            {notice && <p className="form-error">{notice}</p>}
          </div>

          <form className="ask-inputrow" onSubmit={send}>
            <input
              className="ask-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("ask.placeholder")}
              maxLength={2000}
            />
            <button className="primary ask-send" disabled={busy || !draft.trim()}>
              {t("ask.send")}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
