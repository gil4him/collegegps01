"use strict";
/* retrieval.js — the shared grounding layer for Ask (askChat.js) and Ask Tov
   (tovChat.js). Both stuff a family/group notebook into one model call; this
   module owns the two things they used to each reimplement: (1) turning a set
   of documents into the notebook's document blocks, packed to a char budget,
   and (2) mapping the model's [Doc: Title] citations back to doc records.

   Two design rules matter here:

   1. CACHE STABILITY. The notebook block is sent with cache_control:ephemeral,
      so a follow-up question within the TTL should reread it at ~0.1x. That
      only works if the emitted text is byte-identical between questions. The
      old code sorted documents by per-question keyword relevance, so the
      "stable" cached prefix changed on nearly every question and the cache
      almost never hit. Here, when the whole corpus fits the budget (the common
      beta-scale case), documents are emitted in a STABLE order (their input
      order — Firestore __name__ / recency) regardless of the question. Relevance
      is consulted ONLY to decide what to DROP when the corpus overflows the
      budget — and only then does the prefix legitimately vary.

   2. WHOLE-DOC FIDELITY IN THE FITS CASE. When nothing is dropped, a document's
      block is exactly "[Doc: Title]\n" + its extracted text — identical to the
      pre-refactor output, so the cache prefix is preserved across a deploy and
      the citation parser sees unchanged markers. Chunk-level packing only
      engages on overflow, where partial documents are unavoidable anyway. */

// ~1.5k chars/chunk (~375 tokens). Small enough that overflow packing keeps the
// most relevant passages of a large document instead of dropping it whole;
// large enough that scoring stays cheap and blocks stay readable.
const CHUNK_SIZE = 1500;

// Inserted between non-contiguous kept chunks of the same document so the model
// knows a passage was elided (overflow path only).
const ELISION = "\n… \n";

// 2+ chars so domain acronyms survive tokenization ("AP", "IB", "ED", "EA").
// The old 3-char floor silently dropped them, making "AP scores" and "SAT
// scores" indistinguishable. Common short words ("is", "of") slip through too,
// but BM25's IDF gives them near-zero weight, so they don't distort ranking.
const WORD_RE = /[a-z0-9]{2,}/g;

// Very light stemmer: fold common English plurals so "letters" matches "letter"
// and "scores" matches "score" in lexical scoring. Deliberately conservative —
// "ies"→"y", else a trailing "s" (but never on an "-ss" word like "class"), and
// nothing shorter than 4 chars. Not a Porter stemmer; just enough to stop
// singular/plural misses. Applied identically to queries and documents so both
// sides normalize the same way.
function stem(w) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// The single tokenizer everything routes through: lowercased, matched, stemmed.
function words(text) {
  return (String(text || "").toLowerCase().match(WORD_RE) || []).map(stem);
}

// Domain synonyms — expand a query token to the family of terms families and
// documents use interchangeably, so lexical scoring survives paraphrase
// ("EFC" in the question, "expected family contribution" in the award letter).
// Bidirectional: any member of a group expands to the whole group. Kept small
// and college-specific on purpose; it only affects OVERFLOW ranking (never the
// fits-case output), so a wrong-ish synonym can reorder drops but can't corrupt
// a served answer.
const SYNONYM_GROUPS = [
  ["efc", "sai", "expected", "family", "contribution"],
  ["aid", "grant", "scholarship", "award", "merit", "need"],
  ["net", "price", "cost", "coa", "tuition", "sticker"],
  ["loan", "loans", "debt", "borrow", "borrowing"],
  ["extracurricular", "extracurriculars", "activity", "activities", "club", "clubs"],
  ["gpa", "grade", "grades", "transcript", "rank"],
  ["sat", "act", "test", "score", "scores"],
  ["essay", "essays", "personal", "statement", "supplement"],
  ["deadline", "deadlines", "due", "date", "ea", "ed", "rd"],
  ["major", "majors", "program", "degree", "study"],
];
// Keys and members are stemmed so lookups line up with stemmed query/doc tokens.
const SYNONYM_MAP = (() => {
  const m = new Map();
  for (const g of SYNONYM_GROUPS) {
    const sg = g.map(stem);
    for (const w of sg) {
      const set = m.get(w) || new Set();
      for (const x of sg) set.add(x);
      m.set(w, set);
    }
  }
  return m;
})();

// A question → the set of scoring tokens (its own words plus synonym expansions).
function queryTokens(question) {
  const out = new Set();
  for (const w of words(question)) {
    out.add(w);
    const syn = SYNONYM_MAP.get(w);
    if (syn) for (const s of syn) out.add(s);
  }
  return out;
}

// Tokens WITH repeats — the basis for term frequency and chunk length in BM25.
function tokenList(text) {
  return words(text);
}

// The distinct words present in a piece of text (for overlap scoring + df).
function textTokens(text) {
  return new Set(tokenList(text));
}

// Overlap score: how many query tokens appear in this text. Cheap and good
// enough for lexical ranking; the synonym expansion above is what buys recall.
// Kept as the module's simple public scorer; the overflow packer below uses the
// richer BM25 ranker instead.
function scoreText(qTokens, text) {
  const t = textTokens(text);
  let n = 0;
  for (const w of qTokens) if (t.has(w)) n++;
  return n;
}

// Query terms with weights for BM25 ranking: a word the user actually typed
// weighs 1.0; a term pulled in only by synonym expansion weighs less (it's
// inferred, not asked, so it shouldn't outrank a literal match). queryTokens()
// above still returns the flat Set the public API and tests expect — this is the
// ranker's richer view of the same expansion.
const SYNONYM_WEIGHT = 0.5;
function queryTermWeights(question) {
  const base = words(question);
  const w = new Map();
  for (const t of base) w.set(t, 1); // typed terms
  for (const t of base) {
    const syn = SYNONYM_MAP.get(t);
    if (syn) for (const s of syn) if (!w.has(s)) w.set(s, SYNONYM_WEIGHT); // inferred
  }
  return w;
}

// BM25 (Okapi) parameters. k1 tempers term-frequency saturation (a term's 10th
// occurrence adds far less than its 2nd); b controls how much a longer chunk is
// penalized for length. 1.2 / 0.75 are the standard defaults.
const BM25_K1 = 1.2;
const BM25_B = 0.75;
// A query term matching the DOCUMENT TITLE is a strong relevance signal a
// body-only score misses: "Purdue Award Letter" answers "purdue aid" even if the
// body never repeats "Purdue". Added on top of the BM25 body score and weighted
// by the term's IDF, so a distinctive title word counts for more than a common one.
const TITLE_BOOST = 1.8;

// Split text into chunks of ~CHUNK_SIZE, preferring to cut at a newline so
// passages stay whole. INVARIANT: chunks.join("") === text exactly (no
// separators inserted, no interior trimming) — this is what lets the fits-case
// reassembly reproduce the original document byte-for-byte.
function chunkText(text, size) {
  const s = String(text || "");
  const cap = size || CHUNK_SIZE;
  if (s.length <= cap) return s ? [s] : [];
  const chunks = [];
  let i = 0;
  while (i < s.length) {
    let end = Math.min(i + cap, s.length);
    if (end < s.length) {
      const nl = s.lastIndexOf("\n", end);
      if (nl > i + Math.floor(cap / 2)) end = nl + 1; // cut after the newline
    }
    chunks.push(s.slice(i, end));
    i = end;
  }
  return chunks;
}

function docTitle(d) { return d.title || d.fileName || "untitled"; }
function docHeader(d) { return "[Doc: " + docTitle(d) + "]\n"; }

// BM25-rank every chunk of a document list against a question, highest first.
//   list  [{d, header, text}] — the internal packDocs shape (d is the doc record)
// → chunks [{di, ci, text, tokens, score}] sorted by score desc, then di, then ci
//   (a stable, deterministic tie-break). Shared by packDocs (overflow drops) and
//   rankDocs (per-document relevance) so there is ONE scorer to reason about.
function rankChunks(list, question) {
  const qWeights = queryTermWeights(question);
  const chunks = [];
  list.forEach((x, di) => {
    chunkText(x.text, CHUNK_SIZE).forEach((c, ci) => {
      chunks.push({di, ci, text: c, tokens: tokenList(c)});
    });
  });
  const N = chunks.length || 1;
  // Document frequency (over chunks) then IDF for EVERY query term — including a
  // title-only term absent from all bodies, so the title boost can still fire.
  const df = new Map();
  for (const ch of chunks) {
    for (const t of new Set(ch.tokens)) if (qWeights.has(t)) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map();
  for (const t of qWeights.keys()) {
    const d = df.get(t) || 0;
    idf.set(t, Math.log(1 + (N - d + 0.5) / (d + 0.5)));
  }
  const avgdl = chunks.reduce((n, ch) => n + ch.tokens.length, 0) / N || 1;
  const titleTokens = list.map((x) => textTokens(docTitle(x.d)));
  for (const ch of chunks) {
    const dl = ch.tokens.length;
    const tf = new Map();
    for (const t of ch.tokens) if (qWeights.has(t)) tf.set(t, (tf.get(t) || 0) + 1);
    let s = 0;
    for (const [t, f] of tf) {
      const numer = f * (BM25_K1 + 1);
      const denom = f + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgdl));
      s += qWeights.get(t) * idf.get(t) * (numer / denom);
    }
    // Title boost: any query term in this document's title lifts all its chunks.
    const tt = titleTokens[ch.di];
    for (const [t, w] of qWeights) if (tt.has(t)) s += TITLE_BOOST * w * idf.get(t);
    ch.score = s;
  }
  chunks.sort((a, b) => (b.score - a.score) || (a.di - b.di) || (a.ci - b.ci));
  return chunks;
}

// Rank whole DOCUMENTS by their relevance to a question — a document scores as
// its single best-matching chunk (BM25 + title boost). Returns every input doc
// (relevant or not) as {id, title, score, index} sorted by score desc, ties
// broken by input order. This is the primitive behind a "most relevant to this
// question" hint and the offline eval's ranking metrics; it does NOT drop or
// truncate anything and never touches the cache-stable fits-case path.
function rankDocs(docs, question) {
  const list = (docs || []).map((d) => ({d, header: docHeader(d), text: String(d.extractedText || "")}));
  const best = list.map(() => 0);
  for (const ch of rankChunks(list, question)) {
    if (ch.score > best[ch.di]) best[ch.di] = ch.score;
  }
  return list
    .map((x, i) => ({id: x.d.id, title: docTitle(x.d), score: best[i], index: i}))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));
}

// Pack a document set into notebook blocks under a remaining char budget.
//
//   docs           [{title|fileName, extractedText, ...}] in STABLE order
//                  (input order = the caller's recency/__name__ order)
//   question       the user's question (drives overflow ranking only)
//   budgetRemaining chars still available after the caller's fixed preamble
//
// → { blocks: string[], truncated: boolean }
//   blocks are the per-document strings to append, already in stable order.
//   In the fits case every block is exactly docHeader + extractedText, so the
//   output equals the legacy concatenation and the cache prefix is stable.
function packDocs(docs, question, budgetRemaining) {
  const list = (docs || []).map((d) => ({d, header: docHeader(d), text: String(d.extractedText || "")}));
  if (!list.length) return {blocks: [], truncated: false};

  const full = list.map((x) => x.header + x.text);
  const total = full.reduce((n, b) => n + b.length, 0);

  // Fits case: emit everything in stable order. Byte-identical to legacy output.
  if (total <= budgetRemaining) return {blocks: full, truncated: false};

  // Overflow: rank chunks by BM25 relevance (plus a document-title boost), keep
  // the highest-scoring set that fits, then reassemble each document (in stable
  // order) from its kept chunks. BM25 rewards rare, repeated, on-topic terms and
  // normalizes for chunk length — sharper drop decisions than raw token overlap.
  const chunks = rankChunks(list, question);

  const keep = new Set(); // "di:ci"
  const headerCharged = new Set(); // di whose header length is already counted
  let used = 0;
  let truncated = false;
  for (const c of chunks) {
    const headerCost = headerCharged.has(c.di) ? 0 : list[c.di].header.length;
    const cost = headerCost + c.text.length + ELISION.length;
    if (used + cost > budgetRemaining) { truncated = true; continue; }
    keep.add(c.di + ":" + c.ci);
    headerCharged.add(c.di);
    used += cost;
  }

  const blocks = [];
  list.forEach((x, di) => {
    const kept = chunkText(x.text, CHUNK_SIZE)
      .map((c, ci) => ({c, ci}))
      .filter((o) => keep.has(di + ":" + o.ci));
    if (!kept.length) { truncated = true; return; }
    // Join kept chunks; insert an elision marker only where a gap was dropped.
    let body = "";
    for (let k = 0; k < kept.length; k++) {
      if (k > 0 && kept[k].ci !== kept[k - 1].ci + 1) body += ELISION;
      body += kept[k].c;
    }
    if (kept.length < chunkText(x.text, CHUNK_SIZE).length) truncated = true;
    blocks.push(x.header + body);
  });
  return {blocks, truncated};
}

// Map [Doc: Title] markers in an answer back to doc records, deduped by id, in
// first-appearance order. Shared by Ask and Ask Tov (Tov also parses its own
// [Session …] markers separately).
function parseDocCitations(answer, docs) {
  const out = [];
  const seen = new Set();
  for (const m of String(answer || "").matchAll(/\[Doc: ([^\]]+)\]/g)) {
    const title = m[1].trim();
    const d = (docs || []).find((x) => (x.title || x.fileName) === title);
    if (d && d.id != null && !seen.has(d.id)) { seen.add(d.id); out.push({type: "doc", id: d.id, title}); }
  }
  return out;
}

module.exports = {
  packDocs, parseDocCitations, chunkText, scoreText, queryTokens,
  tokenList, queryTermWeights, rankChunks, rankDocs, docTitle, docHeader, CHUNK_SIZE,
};
