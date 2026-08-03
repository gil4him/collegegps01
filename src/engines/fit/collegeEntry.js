// Ported from collegeapp01 functions/collegeEntry.js @ 8171b8a — keep public interface.
/* collegeEntry.js — curated entry-model overlay (Slice 1, docs/STRATEGY.md).
   Answers the single most expensive hidden question in US admissions: does
   getting into the SCHOOL mean getting into the MAJOR? (Failure class F1 —
   a program presented as freshman-entry when it actually has a second
   competitive gate junior year, or is really a graduate credential.)

   Values:
     direct_entry         admitted to the major out of high school
     secondary_admission  enroll first, then apply again (the big trap)
     transfer_only        ~2 years of prerequisites elsewhere first
     pre_professional     the bachelor's is not the credential (MD/JD/DVM/…)
     unknown              honest default — renders NO badge, never a false
                          "direct entry"

   Coverage is CURATION, not code: grow this file entry-by-entry (health
   vertical first). Every entry carries source/asOf/confidence — same
   provenance discipline as the college rows. Keep confidence honest; a
   wrong "direct entry" here is exactly the failure we exist to prevent. */

// Majors whose credential is a GRADUATE degree everywhere in the US — the
// bachelor's is preparation, not the license. Definitional, school-independent,
// so these carry high confidence with zero per-school curation risk.
// Keys match app MAJOR_OPTIONS / engine.MAJOR_LABELS verbatim.
const PRE_PROFESSIONAL_MAJORS = {
  "Medicine (Pre-Med)": "MD/DO programs are graduate school — the bachelor's (any major) plus prerequisites leads to a separate medical-school application.",
  "Dentistry (Pre-Dental)": "DDS/DMD programs are graduate school — a separate dental-school application follows the bachelor's.",
  "Law (Pre-Law)": "JD programs are graduate school — any bachelor's plus the LSAT leads to a separate law-school application.",
  "Veterinary Science (Pre-Vet)": "DVM programs are graduate school — a separate veterinary-school application follows the bachelor's.",
  "Pharmacy": "The PharmD is a professional doctorate — most paths are 2+ years of prerequisites then a separate PharmD application (some schools offer 0-6 direct programs; check the specific school).",
};

// School-specific overlay, keyed by the name as it appears in results rows.
// byMajor keys match MAJOR_OPTIONS verbatim and beat the school default.
const ENTRY_MODELS = {
  "University of Washington": {
    default: "secondary_admission",
    byMajor: { "Computer Science": "direct_entry" },
    note: "Many UW majors are capacity-constrained: you enroll, then apply to the major with a competitive review. CS switched to direct-to-major freshman admission (2019+); Nursing admits at upper-division after prerequisites.",
    source: "curated", asOf: "2026-07", confidence: 0.75,
  },
  "Pennsylvania State University — University Park": {
    default: "secondary_admission",
    note: "Penn State's entrance-to-major review happens around the 4th semester; capacity-controlled majors (engineering, business, nursing) hold competitive GPA cutoffs at that gate.",
    source: "curated", asOf: "2026-07", confidence: 0.75,
  },
  "University of Texas at Austin": {
    byMajor: { "Computer Science": "direct_entry", "Business Administration": "direct_entry", "Nursing": "direct_entry" },
    note: "UT admits directly to the major for CS, McCombs business, and nursing — but internal transfer into these later is extremely competitive, so the first application is effectively the only door.",
    source: "curated", asOf: "2026-07", confidence: 0.8,
  },
  "University of Michigan": {
    byMajor: { "Nursing": "direct_entry", "Mechanical Engineering": "direct_entry", "Electrical Engineering": "direct_entry", "Computer Engineering": "direct_entry", "Aerospace Engineering": "direct_entry", "Chemical Engineering": "direct_entry", "Civil Engineering": "direct_entry", "Industrial Engineering": "direct_entry", "Biomedical Engineering": "direct_entry" },
    note: "Michigan admits freshmen directly to the School of Nursing and the College of Engineering.",
    source: "curated", asOf: "2026-07", confidence: 0.8,
  },
  "University of Pittsburgh": {
    byMajor: { "Nursing": "direct_entry" },
    note: "Pitt offers direct-admit freshman entry to its BSN.",
    source: "curated", asOf: "2026-07", confidence: 0.8,
  },
  "University of California, Los Angeles": {
    byMajor: { "Nursing": "direct_entry" },
    note: "UCLA's BSN admits freshmen directly — a very small, very competitive cohort.",
    source: "curated", asOf: "2026-07", confidence: 0.75,
  },
  "Purdue University": {
    byMajor: { "Mechanical Engineering": "secondary_admission", "Electrical Engineering": "secondary_admission", "Computer Engineering": "secondary_admission", "Aerospace Engineering": "secondary_admission", "Chemical Engineering": "secondary_admission", "Civil Engineering": "secondary_admission", "Industrial Engineering": "secondary_admission", "Biomedical Engineering": "secondary_admission" },
    note: "All Purdue engineering students start in First-Year Engineering, then transition to a specific major — guaranteed above a GPA threshold for most programs, competitive for the most popular ones.",
    source: "curated", asOf: "2026-07", confidence: 0.75,
  },
  "UNC Chapel Hill": {
    byMajor: { "Business Administration": "secondary_admission", "Nursing": "secondary_admission" },
    note: "Kenan-Flagler business and the BSN both require a competitive application after enrolling (sophomore year).",
    source: "curated", asOf: "2026-07", confidence: 0.8,
  },
};

// Live Scorecard rows use official IPEDS names that differ from the offline
// dataset's display names — alias them onto the same curated records.
const NAME_ALIASES = {
  "University of Washington-Seattle Campus": "University of Washington",
  "Pennsylvania State University-Main Campus": "Pennsylvania State University — University Park",
  "The University of Texas at Austin": "University of Texas at Austin",
  "University of Michigan-Ann Arbor": "University of Michigan",
  "University of Pittsburgh-Pittsburgh Campus": "University of Pittsburgh",
  "University of California-Los Angeles": "University of California, Los Angeles",
  "Purdue University-Main Campus": "Purdue University",
  "University of North Carolina at Chapel Hill": "UNC Chapel Hill",
};

export { ENTRY_MODELS, PRE_PROFESSIONAL_MAJORS, NAME_ALIASES };
