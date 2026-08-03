import { setTodoStatus } from "../lib/ask.js";
import { prettyDate, useI18n } from "../i18n/index.jsx";

// "From your consultant" — the checklist the Ask consultant builds up.
// Separate from the deterministic road by design: these are advice.
export default function ConsultantList({ todos, children: kids, childId }) {
  const { locale, t } = useI18n();
  const shown = (todos || []).filter((td) =>
    childId ? td.childId === childId : true
  );
  if (!shown.length) return null;
  const nameOf = (id) => kids?.find((k) => k.id === id)?.nickname;

  return (
    <section className="consult-list">
      <h2 className="section-title">{t("ask.todoTitle")}</h2>
      <ul className="consult-items">
        {shown.map((td) => (
          <li key={td.id} className={td.status === "done" ? "consult-item consult-done" : "consult-item"}>
            <label className="consult-check">
              <input
                type="checkbox"
                checked={td.status === "done"}
                onChange={(e) => setTodoStatus(td.id, e.target.checked ? "done" : "open")}
              />
              <span className="consult-body">
                <span className="consult-title">
                  {td.title}
                  {!childId && td.childId && nameOf(td.childId) && (
                    <span className="tag tag-catchup"> {nameOf(td.childId)}</span>
                  )}
                  {td.dueDate && <span className="consult-due"> · {prettyDate(td.dueDate, locale)}</span>}
                </span>
                {td.why && <span className="consult-why">{td.why}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
