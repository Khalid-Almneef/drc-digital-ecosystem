// Display helpers for member/leader/alumni names and majors.
//
// We always render names as "first + last" only. Saudi member rosters often
// carry middle names ("Khalid Mray Almnyf"); the convention across DRC's
// public surface is just first + family name.

export function firstAndLastName(full: string | null | undefined): string {
  if (!full) return "";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

// ─── Majors ────────────────────────────────────────────────────────────────
// Stored majors come from the original member roster (mostly Arabic). When
// we render in the English locale we look up an English translation here.
// Misses fall back to the stored value so we never show an empty cell.
//
// Lookup is normalized: lowercase + collapse whitespace + strip a few common
// trailing qualifiers ("- مسار عام", "(علمي)", etc.) so that minor data-entry
// variants resolve to the same record.

const MAJOR_AR_TO_EN: Record<string, string> = {
  // Engineering
  "هندسة حاسب": "Computer Engineering",
  "هندسة الحاسب": "Computer Engineering",
  "هندسة طبية حيوية": "Biomedical Engineering",
  "الهندسة الميكانيكية": "Mechanical Engineering",
  "هندسة ميكانيكية": "Mechanical Engineering",
  "كلية الهندسة - تخصص ميكاترونكس": "Mechatronics Engineering",
  "ميكاترونكس": "Mechatronics Engineering",
  "هندسة كهربائية": "Electrical Engineering",
  "هندسة كهربائية والكترونية": "Electrical & Electronic Engineering",
  "جامعة الأميرة نورة- كلية الهندسة- الهندسة الكهربائية والالكترونية": "Electrical & Electronic Engineering",
  "هندسة برمجيات": "Software Engineering",
  "هندسة البرمجيات": "Software Engineering",
  // Computer & IT
  "علوم حاسب": "Computer Science",
  "علوم الحاسب": "Computer Science",
  "تقنية المعلومات": "Information Technology",
  "تقنيه المعلومات": "Information Technology",
  "تقنية معلومات": "Information Technology",
  "تقنية المعلومات - مسار علم البيانات والذكاء الاصطناعي": "Information Technology — Data Science & AI",
  "كلية علوم الحاسب وتقنية المعلومات | تقنية المعلومات it": "Information Technology",
  "نظم المعلومات": "Information Systems",
  "نظم معلومات": "Information Systems",
  "نظم معلومات - مسار عام": "Information Systems",
  // Health
  "صيدلة": "Pharmacy",
  "طب وجراحة": "Medicine & Surgery",
  "تغذية سريرية": "Clinical Nutrition",
  "تقنية اسنان": "Dental Technology",
  // Other
  "رياضيات اكتوارية": "Actuarial Mathematics",
  "حقوق": "Law",
  "علاقات عامة": "Public Relations",
  // Foundation year (collapsed)
  "السنة الأولى المشتركة": "Common First Year",
  "السنة الأولي المشتركة مسار علمي": "Common First Year — Science",
  "السنة الاولى المشتركة (علمي)": "Common First Year — Science",
  "السنه الاولى المشتركه - علمي": "Common First Year — Science",
  "cfy - علمي": "Common First Year — Science",
  "سنة تحضيرية، ادارة الاعمال": "Foundation Year — Business Administration",
};

function normalizeMajorKey(major: string): string {
  return major
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[،,]+/g, ",");
}

export function translateMajor(
  major: string | null | undefined,
  lang: "en" | "ar",
): string {
  if (!major) return "";
  if (lang === "ar") return major;
  const key = normalizeMajorKey(major);
  return MAJOR_AR_TO_EN[key] ?? major;
}

// Convenience: pick the localized name + collapse to first+last in one call.
export function displayMemberName(
  fullName: string | null | undefined,
  fullNameAr: string | null | undefined,
  lang: "en" | "ar",
): string {
  const source = lang === "ar" && fullNameAr ? fullNameAr : (fullName ?? "");
  return firstAndLastName(source);
}
