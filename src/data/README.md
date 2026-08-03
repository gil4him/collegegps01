# src/data/

Static datasets consumed by the engines (build-time data, not runtime fetches):

- IPEDS net-price dataset (`dataset.js` + `dataset_enrichment.js`, ported from
  collegeapp01 `functions/` in Slice 2)
- State graduation-requirements table (hand-curated, year-stamped — greenfield)
- Milestone playbook content (dated, versioned, year-stamped — greenfield)

Rules: data files are versioned and year-stamped where content has a shelf
life ("reviewed for 2026–27"). No secrets here — API keys live in `.env`.
