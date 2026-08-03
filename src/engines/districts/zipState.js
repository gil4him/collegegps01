// ZIP → state from the standard USPS 3-digit prefix allocations (real,
// published ranges — not fabricated). A few small carve-outs exist in the
// wild (military APO/FPO, single-prefix exceptions); unknown prefixes return
// null and the caller falls back to asking. State is the reliable floor for
// plan rules (brief §4); district resolution is layered on separately.
const PREFIX_RANGES = [
  ["005", "005", "NY"], ["006", "009", "PR"], ["010", "027", "MA"],
  ["028", "029", "RI"], ["030", "038", "NH"], ["039", "049", "ME"],
  ["050", "059", "VT"], ["060", "069", "CT"], ["070", "089", "NJ"],
  ["100", "149", "NY"], ["150", "196", "PA"], ["197", "199", "DE"],
  ["200", "200", "DC"], ["201", "201", "VA"], ["202", "205", "DC"],
  ["206", "219", "MD"], ["220", "246", "VA"], ["247", "268", "WV"],
  ["270", "289", "NC"], ["290", "299", "SC"], ["300", "319", "GA"],
  ["320", "349", "FL"], ["350", "369", "AL"], ["370", "385", "TN"],
  ["386", "397", "MS"], ["398", "399", "GA"], ["400", "427", "KY"],
  ["430", "459", "OH"], ["460", "479", "IN"], ["480", "499", "MI"],
  ["500", "528", "IA"], ["530", "549", "WI"], ["550", "567", "MN"],
  ["570", "577", "SD"], ["580", "588", "ND"], ["590", "599", "MT"],
  ["600", "629", "IL"], ["630", "658", "MO"], ["660", "679", "KS"],
  ["680", "693", "NE"], ["700", "714", "LA"], ["716", "729", "AR"],
  ["730", "749", "OK"], ["750", "799", "TX"], ["800", "816", "CO"],
  ["820", "831", "WY"], ["832", "838", "ID"], ["840", "847", "UT"],
  ["850", "865", "AZ"], ["870", "884", "NM"], ["885", "885", "TX"],
  ["889", "898", "NV"], ["900", "961", "CA"], ["967", "968", "HI"],
  ["970", "979", "OR"], ["980", "994", "WA"], ["995", "999", "AK"],
];

export function zipToState(zip) {
  const z = String(zip || "").trim();
  if (!/^\d{5}(-\d{4})?$/.test(z)) return null;
  const p = z.slice(0, 3);
  for (const [lo, hi, st] of PREFIX_RANGES) {
    if (p >= lo && p <= hi) return st;
  }
  return null;
}

// District resolution (brief §4): ZIP↔district is many-to-many and district
// graduation requirements are not a downloadable dataset. This is the
// interface the future NCES-EDGE-backed resolver plugs into; until data
// lands, it resolves nothing and callers use state rules immediately —
// never block the card on district lookup.
export function resolveDistrict(zip) {
  return { districtId: null, districtName: null, candidates: [], source: "none" };
}
