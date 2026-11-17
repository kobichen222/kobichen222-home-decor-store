// Generates the demo catalog: supabase/seed.sql + illustration SVGs under
// public/seed and public/hero. Demo data only — it is loaded by
// `supabase db reset` locally and must not be applied to production.
//
//   node scripts/generate-seed.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (p, s) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(join(root, p), s);
};

// ---------------------------------------------------------------- art
const C = {
  wall: "#F2EFEA", wall2: "#EAE5DD", floor: "#D9CFC2", ink: "#242424", brand: "#705B4B",
  gold: "#B49A76", sand: "#C9A27E", sage: "#5F7161", blue: "#3E5C76", grey: "#9A9A9A", white: "#FFFFFF", cream: "#FAF9F6",
};
const colorHex = { שחור: C.ink, לבן: C.white, זהב: C.gold, טבעי: C.sand, אפור: C.grey, ירוק: C.sage, כחול: C.blue, חום: C.brand };

const shadow = `<filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#3b2f25" flood-opacity=".18"/></filter>`;

// Each object is drawn around (0,0) within roughly ±200 units.
const objects = {
  art: (c, v = 0) => {
    const p = [[C.sand, C.brand, C.gold], [C.sage, C.wall2, C.ink], [C.blue, C.sand, C.cream], [C.ink, C.gold, C.wall2]][v % 4];
    const inner = [
      `<circle cx="-30" cy="-50" r="78" fill="${p[0]}"/><path d="M-140 150 Q-20 -10 140 150 Z" fill="${p[1]}"/><circle cx="70" cy="-90" r="26" fill="${p[2]}"/>`,
      `<path d="M-90 190 V-20 a90 90 0 0 1 180 0 V190 Z" fill="${p[0]}"/><path d="M-45 190 V10 a45 45 0 0 1 90 0 V190 Z" fill="${p[1]}"/><circle cx="0" cy="-130" r="22" fill="${p[2]}"/>`,
      `<rect x="-140" y="-190" width="140" height="190" fill="${p[0]}"/><rect x="0" y="0" width="140" height="190" fill="${p[1]}"/><circle cx="0" cy="0" r="70" fill="${p[2]}"/>`,
      `<path d="M-140 60 Q-70 -60 0 60 T140 60 V190 H-140 Z" fill="${p[0]}"/><path d="M-140 120 Q-70 20 0 120 T140 120 V190 H-140 Z" fill="${p[1]}"/><circle cx="60" cy="-90" r="44" fill="${p[2]}"/>`,
    ][v % 4];
    return `<g filter="url(#s)"><rect x="-170" y="-220" width="340" height="440" fill="${c}"/><rect x="-150" y="-200" width="300" height="400" fill="${C.cream}"/><clipPath id="cp"><rect x="-140" y="-190" width="280" height="380"/></clipPath><g clip-path="url(#cp)">${inner}</g></g>`;
  },
  clock: (c, v = 0) => {
    const face = c === C.white ? C.cream : c;
    const mark = c === C.ink || c === C.brand || c === C.sage || c === C.blue ? C.gold : C.ink;
    const ticks = Array.from({ length: 12 }, (_, i) => `<rect x="-3" y="-168" width="6" height="${i % 3 === 0 ? 30 : 16}" fill="${mark}" transform="rotate(${i * 30})"/>`).join("");
    return `<g filter="url(#s)"><circle r="200" fill="${v % 2 ? C.gold : mark}"/><circle r="186" fill="${face}"/>${ticks}<rect x="-5" y="-110" width="10" height="120" rx="5" fill="${mark}" transform="rotate(${40 + v * 50})"/><rect x="-3.5" y="-150" width="7" height="160" rx="3.5" fill="${mark}" transform="rotate(${-60 + v * 20})"/><circle r="12" fill="${mark}"/></g>`;
  },
  mirror: (c, v = 0) => {
    const glass = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EEF1F2"/><stop offset=".5" stop-color="#D5DCDF"/><stop offset="1" stop-color="#F4F6F6"/></linearGradient>`;
    const shape = v % 2
      ? [`<path d="M-150 230 V-70 a150 150 0 0 1 300 0 V230 Z"`, `<path d="M-132 212 V-70 a132 132 0 0 1 264 0 V212 Z"`]
      : [`<circle r="200"`, `<circle r="180"`];
    return `<defs>${glass}</defs><g filter="url(#s)">${shape[0]} fill="${c}"/>${shape[1]} fill="url(#g)"/><path d="M-70 -90 L-20 -140 M-90 -40 L10 -140" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".7"/></g>`;
  },
  lamp: (c, v = 0) => v % 2
    ? `<g filter="url(#s)"><rect x="-3" y="-420" width="6" height="260" fill="${C.ink}"/><path d="M-150 60 Q-150 -170 0 -170 Q150 -170 150 60 Z" fill="${c}"/><ellipse cx="0" cy="60" rx="150" ry="22" fill="${C.gold}"/><circle cx="0" cy="70" r="34" fill="#FFF4D6"/></g>`
    : `<g filter="url(#s)"><path d="M-120 -40 L-80 -220 H80 L120 -40 Z" fill="${C.cream}" stroke="${C.wall2}" stroke-width="4"/><rect x="-8" y="-40" width="16" height="60" fill="${C.gold}"/><path d="M-70 220 Q-90 20 0 20 Q90 20 70 220 Z" fill="${c}"/><rect x="-90" y="214" width="180" height="16" rx="6" fill="${C.gold}"/></g>`,
  vase: (c, v = 0) => `<g filter="url(#s)"><g stroke="${C.brand}" stroke-width="6" fill="none" stroke-linecap="round"><path d="M0 -20 Q-20 -160 -90 -250"/><path d="M0 -20 Q10 -190 50 -280"/><path d="M0 -20 Q50 -120 120 -190"/></g><g fill="${v % 2 ? C.sage : C.sand}"><ellipse cx="-92" cy="-254" rx="26" ry="14" transform="rotate(-50 -92 -254)"/><ellipse cx="52" cy="-284" rx="26" ry="14" transform="rotate(-70 52 -284)"/><ellipse cx="122" cy="-194" rx="26" ry="14" transform="rotate(-35 122 -194)"/><ellipse cx="-46" cy="-150" rx="22" ry="12" transform="rotate(-60 -46 -150)"/><ellipse cx="60" cy="-120" rx="22" ry="12" transform="rotate(-30 60 -120)"/></g><path d="M-36 -30 H36 Q30 20 80 90 Q120 160 60 230 H-60 Q-120 160 -80 90 Q-30 20 -36 -30 Z" fill="${c}"/><ellipse cx="0" cy="-30" rx="36" ry="9" fill="${C.ink}" opacity=".25"/></g>`,
  shelf: (c, v = 0) => `<g filter="url(#s)"><rect x="-230" y="-10" width="460" height="22" rx="3" fill="${c}"/>${v % 2 ? `<rect x="-230" y="-190" width="460" height="22" rx="3" fill="${c}"/><rect x="-150" y="-260" width="50" height="70" fill="${C.sage}"/><rect x="-94" y="-280" width="30" height="90" fill="${C.gold}"/><circle cx="110" cy="-228" r="38" fill="${C.sand}"/>` : ""}<rect x="-190" y="-110" width="26" height="100" fill="${C.brand}"/><rect x="-160" y="-126" width="30" height="116" fill="${C.sand}"/><rect x="-126" y="-96" width="22" height="86" fill="${C.sage}"/><path d="M60 -10 Q40 -70 70 -110 H110 Q140 -70 120 -10 Z" fill="${C.gold}"/><circle cx="180" cy="-44" r="34" fill="${C.cream}" stroke="${C.wall2}" stroke-width="4"/><rect x="-210" y="12" width="12" height="46" fill="${C.ink}"/><rect x="198" y="12" width="12" height="46" fill="${C.ink}"/></g>`,
  sign: (c, v = 0) => {
    const t = ["OPEN", "HELLO", "WELCOME", "CAFÉ"][v % 4];
    return `<g filter="url(#s)"><rect x="-230" y="-120" width="460" height="240" rx="${v % 2 ? 120 : 16}" fill="${c}"/><rect x="-212" y="-102" width="424" height="204" rx="${v % 2 ? 102 : 8}" fill="none" stroke="${C.gold}" stroke-width="5"/><text x="0" y="30" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${t.length > 5 ? 74 : 92}" letter-spacing="10" fill="${C.gold}">${t}</text></g>`;
  },
  candle: (c, v = 0) => `<g filter="url(#s)"><ellipse cx="0" cy="210" rx="210" ry="26" fill="${C.sand}"/>${[-110, 0, 110].map((x, i) => { const h = [150, 220, 110][(i + v) % 3]; return `<rect x="${x - 44}" y="${200 - h}" width="88" height="${h}" rx="10" fill="${i === 1 ? c : C.cream}" stroke="${C.wall2}" stroke-width="3"/><rect x="${x - 2}" y="${178 - h}" width="4" height="22" fill="${C.ink}"/><path d="M${x} ${132 - h} q16 26 0 44 q-16 -18 0 -44 Z" fill="#F0B95B"/>`; }).join("")}</g>`,
  cushion: (c, v = 0) => `<g filter="url(#s)"><path d="M-190 -170 Q0 -200 190 -170 Q215 0 190 170 Q0 200 -190 170 Q-215 0 -190 -170 Z" fill="${c}"/>${v % 2 ? `<g stroke="${C.cream}" stroke-width="10" opacity=".8">${[-110, -55, 0, 55, 110].map((x) => `<path d="M${x} -160 V160"/>`).join("")}</g>` : `<circle r="70" fill="none" stroke="${C.gold}" stroke-width="8"/><circle r="26" fill="${C.gold}"/>`}</g>`,
};

function productSvg(type, color, variant, scene) {
  const c = colorHex[color] ?? color ?? C.brand;
  const wall = [C.wall, C.wall2, "#EDE8E1", "#F4F1EC"][variant % 4];
  const onFloor = ["lamp", "vase", "candle", "cushion"].includes(type) && !(type === "lamp" && variant % 2);
  const obj = objects[type](c, variant);
  if (!scene) {
    const y = onFloor ? 520 : 470;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs>${shadow}</defs><rect width="800" height="1000" fill="${wall}"/>${onFloor ? `<rect y="760" width="800" height="240" fill="${C.floor}"/><rect y="756" width="800" height="8" fill="#fff" opacity=".6"/>` : ""}<g transform="translate(400 ${y}) scale(${type === "shelf" || type === "sign" ? 1.25 : 1.3})">${obj}</g></svg>`;
  }
  // In-room view: the object above / on a console table.
  const scale = onFloor ? 0.62 : 0.7;
  const y = onFloor ? 542 : 330;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs>${shadow}</defs><rect width="800" height="1000" fill="${wall}"/><rect y="800" width="800" height="200" fill="${C.floor}"/><rect y="796" width="800" height="8" fill="#fff" opacity=".6"/><g filter="url(#s)"><rect x="150" y="680" width="500" height="26" rx="4" fill="${C.brand}"/><rect x="176" y="706" width="14" height="150" fill="${C.brand}"/><rect x="610" y="706" width="14" height="150" fill="${C.brand}"/></g>${onFloor ? "" : `<path d="M560 680 Q548 600 572 560 H612 Q636 600 624 680 Z" fill="${C.gold}"/><rect x="200" y="640" width="120" height="14" fill="${C.sand}"/><rect x="210" y="654" width="100" height="26" fill="${C.sage}"/>`}<g transform="translate(${onFloor ? 400 : 390} ${y}) scale(${scale})">${obj}</g></svg>`;
}

const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs>${shadow}<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFEAE3"/><stop offset="1" stop-color="#E6DFD5"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#w)"/><rect y="760" width="1600" height="240" fill="#CDBFAE"/><rect y="754" width="1600" height="10" fill="#fff" opacity=".55"/>
<g transform="translate(560 330) scale(.62)">${objects.art(C.ink, 1)}</g><g transform="translate(800 300) scale(.78)">${objects.art(C.ink, 0)}</g><g transform="translate(1050 340) scale(.56)">${objects.art(C.ink, 3)}</g>
<g filter="url(#s)"><rect x="440" y="560" width="760" height="150" rx="34" fill="#B9A690"/><rect x="400" y="640" width="840" height="140" rx="30" fill="#A8947D"/><rect x="400" y="600" width="90" height="180" rx="30" fill="#9C8771"/><rect x="1150" y="600" width="90" height="180" rx="30" fill="#9C8771"/><rect x="460" y="776" width="16" height="40" fill="#242424"/><rect x="1164" y="776" width="16" height="40" fill="#242424"/></g>
<g transform="translate(600 640) scale(.42)">${objects.cushion(C.brand, 0)}</g><g transform="translate(1040 640) scale(.42)">${objects.cushion(C.cream, 1)}</g>
<g filter="url(#s)"><rect x="1330" y="250" width="8" height="560" fill="#242424"/><path d="M1250 250 L1290 110 H1380 L1420 250 Z" fill="#FAF9F6"/><ellipse cx="1334" cy="812" rx="70" ry="12" fill="#242424"/></g>
<g transform="translate(240 664) scale(.6)">${objects.vase(C.sage, 0)}</g><g filter="url(#s)"><rect x="130" y="800" width="230" height="20" rx="4" fill="#705B4B"/><rect x="150" y="820" width="12" height="90" fill="#705B4B"/><rect x="328" y="820" width="12" height="90" fill="#705B4B"/></g>
<ellipse cx="820" cy="900" rx="520" ry="46" fill="#E9E1D6" opacity=".9"/></svg>`;
out("public/hero/living-room.svg", hero);

// ------------------------------------------------------------- catalog
const categories = [
  // slug, name, parent, type for illustration, colour, show on home
  ["home-decor", "עיצוב הבית", null, "vase", "ירוק", true, "פריטים שהופכים בית למקום שנעים לחזור אליו."],
  ["living-room", "סלון", "home-decor", "cushion", "חום", false, null],
  ["kitchen", "מטבח", "home-decor", "shelf", "טבעי", false, null],
  ["bedroom", "חדר שינה", "home-decor", "lamp", "טבעי", false, null],
  ["kids-room", "חדר ילדים", "home-decor", "art", "לבן", false, null],
  ["office-decor", "עיצוב המשרד", null, "clock", "שחור", true, "סביבת עבודה מעוצבת שמשדרת מקצועיות."],
  ["meeting-rooms", "חדרי ישיבות", "office-decor", "art", "שחור", false, null],
  ["business-decor", "עיצוב העסק", null, "sign", "שחור", true, "חנויות, מסעדות וקליניקות עם אופי."],
  ["shops", "חנויות", "business-decor", "sign", "חום", false, null],
  ["restaurants", "מסעדות", "business-decor", "lamp", "שחור", false, null],
  ["clinics", "קליניקות", "business-decor", "mirror", "זהב", false, null],
  ["wall-art", "תמונות קיר", null, "art", "שחור", true, "הדפסים ויצירות ממוסגרות לכל קיר."],
  ["wall-clocks", "שעוני קיר", null, "clock", "לבן", true, "שעונים שקטים בעיצוב נקי."],
  ["mirrors", "מראות", null, "mirror", "זהב", true, "מראות שמגדילות ומאירות את החלל."],
  ["lighting", "גופי תאורה", null, "lamp", "זהב", true, "תאורה שיוצרת אווירה."],
  ["decor-items", "פריטי נוי", null, "vase", "לבן", true, "אגרטלים, נרות ופרטים קטנים שעושים הבדל."],
  ["shelves-storage", "מדפים ואחסון", null, "shelf", "טבעי", true, "מדפים דקורטיביים ופתרונות אחסון."],
  ["decorative-signs", "שילוט דקורטיבי", null, "sign", "שחור", true, "שלטים מעוצבים לבית ולעסק."],
  ["gifts", "מתנות מעוצבות", null, "candle", "זהב", true, "מתנות שנעים לקבל."],
];

const collections = [
  ["winter", "קולקציית חורף", "גוונים חמים, מרקמים רכים ואור עדין לימים הקרים.", "candle", "חום"],
  ["minimal", "עיצוב מינימליסטי", "קווים נקיים וצבעוניות שקטה.", "art", "לבן"],
  ["luxury-office", "עיצוב משרד יוקרתי", "פריטים שמשדרגים כל חלל עבודה.", "clock", "זהב"],
  ["gifts-under-200", "מתנות עד 200 ₪", "רעיונות למתנה בתקציב נוח.", "vase", "זהב"],
];

const sizesArt = [["30×40 ס״מ", 0], ["50×70 ס״מ", 90], ["70×100 ס״מ", 210]];
// name, slug, sku, type, price, sale, cats, colours, attrs{material,size,style}, opts
const products = [
  ["תמונת קיר אבסטרקט חולות", "abstract-dunes-wall-art", "ART-1001", "art", 189, null, ["wall-art", "living-room"], ["שחור", "טבעי", "לבן"], ["קנבס", "בינוני", "מודרני"], { art: true, featured: true, cols: ["minimal"], sales: 64 }],
  ["תמונת קיר קשתות בוהו", "boho-arches-wall-art", "ART-1002", "art", 169, 139, ["wall-art", "bedroom"], ["טבעי", "לבן"], ["קנבס", "בינוני", "מינימליסטי"], { art: true, cols: ["minimal", "winter"], sales: 41 }],
  ["סט שלוש תמונות גיאומטריות", "geometric-trio-wall-art", "ART-1003", "art", 349, null, ["wall-art", "meeting-rooms", "office-decor"], ["שחור", "זהב"], ["קנבס", "גדול", "יוקרתי"], { art: true, cols: ["luxury-office"], sales: 28 }],
  ["תמונת קיר גלים שקטים", "calm-waves-wall-art", "ART-1004", "art", 199, null, ["wall-art", "clinics"], ["לבן", "שחור"], ["קנבס", "בינוני", "מודרני"], { art: true, sales: 19 }],
  ["שעון קיר מודרני שחור", "modern-wall-clock", "CLK-2001", "clock", 229, null, ["wall-clocks", "office-decor", "living-room"], ["שחור", "לבן"], ["מתכת", "גדול", "מודרני"], { featured: true, cols: ["luxury-office", "minimal"], sales: 87 }],
  ["שעון קיר עץ אלון", "oak-wall-clock", "CLK-2002", "clock", 179, 149, ["wall-clocks", "kitchen"], ["טבעי"], ["עץ", "בינוני", "כפרי"], { cols: ["gifts-under-200", "winter"], sales: 52 }],
  ["שעון קיר זהב מינימליסטי", "gold-minimal-wall-clock", "CLK-2003", "clock", 289, null, ["wall-clocks", "meeting-rooms"], ["זהב", "שחור"], ["מתכת", "גדול", "יוקרתי"], { cols: ["luxury-office"], sales: 33 }],
  ["מראה עגולה מסגרת זהב", "round-gold-mirror", "MIR-3001", "mirror", 399, null, ["mirrors", "living-room", "clinics"], ["זהב", "שחור"], ["מתכת", "גדול", "יוקרתי"], { featured: true, sizes: [["קוטר 60 ס״מ", 0], ["קוטר 80 ס״מ", 120]], sales: 71 }],
  ["מראת קשת עומדת", "arch-floor-mirror", "MIR-3002", "mirror", 649, 549, ["mirrors", "bedroom", "shops"], ["שחור", "זהב"], ["מתכת", "גדול", "מודרני"], { sales: 24 }],
  ["מראה עגולה מסגרת עץ", "round-wood-mirror", "MIR-3003", "mirror", 329, null, ["mirrors", "bedroom"], ["טבעי"], ["עץ", "בינוני", "כפרי"], { cols: ["winter"], sales: 17 }],
  ["מנורת שולחן קרמיקה", "ceramic-table-lamp", "LMP-4001", "lamp", 259, null, ["lighting", "bedroom", "living-room"], ["לבן", "ירוק", "חום"], ["קרמיקה", "בינוני", "מודרני"], { featured: true, cols: ["winter"], sales: 58 }],
  ["מנורת תלייה כיפה", "dome-pendant-lamp", "LMP-4002", "lamp", 349, null, ["lighting", "kitchen", "restaurants"], ["שחור", "זהב", "לבן"], ["מתכת", "גדול", "תעשייתי"], { odd: true, sales: 46 }],
  ["מנורת שולחן פליז", "brass-desk-lamp", "LMP-4003", "lamp", 319, 269, ["lighting", "office-decor"], ["זהב"], ["מתכת", "קטן", "יוקרתי"], { cols: ["luxury-office"], sales: 22 }],
  ["אגרטל קרמיקה מט", "matte-ceramic-vase", "DEC-5001", "vase", 129, null, ["decor-items", "living-room", "gifts"], ["לבן", "ירוק", "שחור"], ["קרמיקה", "בינוני", "מינימליסטי"], { cols: ["gifts-under-200", "minimal"], sales: 93 }],
  ["אגרטל זכוכית מעושנת", "smoked-glass-vase", "DEC-5002", "vase", 149, 119, ["decor-items", "gifts"], ["אפור", "חום"], ["זכוכית", "קטן", "מודרני"], { odd: true, cols: ["gifts-under-200"], sales: 37 }],
  ["סט נרות ריחניים", "scented-candle-set", "GFT-6001", "candle", 99, null, ["gifts", "decor-items"], ["זהב", "לבן"], ["זכוכית", "קטן", "יוקרתי"], { featured: true, cols: ["gifts-under-200", "winter"], sales: 120 }],
  ["כרית נוי קטיפה", "velvet-cushion", "DEC-5003", "cushion", 89, null, ["decor-items", "living-room", "bedroom"], ["חום", "ירוק", "כחול", "אפור"], ["בד", "קטן", "יוקרתי"], { cols: ["winter", "gifts-under-200"], sales: 75 }],
  ["כרית נוי פסים", "striped-cushion", "DEC-5004", "cushion", 79, 59, ["decor-items", "living-room", "kids-room"], ["כחול", "טבעי"], ["בד", "קטן", "כפרי"], { odd: true, sales: 31 }],
  ["מדף צף עץ אלון", "floating-oak-shelf", "SHL-7001", "shelf", 159, null, ["shelves-storage", "living-room", "kitchen"], ["טבעי", "שחור"], ["עץ", "בינוני", "מינימליסטי"], { sizes: [["60 ס״מ", 0], ["90 ס״מ", 40], ["120 ס״מ", 80]], cols: ["minimal"], sales: 66 }],
  ["יחידת מדפים כפולה", "double-wall-shelf", "SHL-7002", "shelf", 289, null, ["shelves-storage", "office-decor", "shops"], ["שחור", "טבעי"], ["מתכת", "גדול", "תעשייתי"], { odd: true, sales: 20 }],
  ["שלט OPEN לעסק", "open-business-sign", "SGN-8001", "sign", 249, null, ["decorative-signs", "shops", "restaurants", "business-decor"], ["שחור", "חום"], ["עץ", "בינוני", "מודרני"], { sales: 44 }],
  ["שלט WELCOME לכניסה", "welcome-entrance-sign", "SGN-8002", "sign", 219, 189, ["decorative-signs", "home-decor", "clinics"], ["שחור", "ירוק"], ["עץ", "בינוני", "כפרי"], { v: 2, sales: 26 }],
  ["שלט HELLO אובלי", "hello-oval-sign", "SGN-8003", "sign", 199, null, ["decorative-signs", "kids-room", "gifts"], ["כחול", "חום"], ["מתכת", "קטן", "מודרני"], { v: 1, cols: ["gifts-under-200"], sales: 12 }],
  ["שעון קיר ירוק מרווה", "sage-wall-clock", "CLK-2004", "clock", 199, null, ["wall-clocks", "kids-room", "kitchen"], ["ירוק", "כחול"], ["מתכת", "בינוני", "מודרני"], { odd: true, sales: 15, soldOut: true }],
];

const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const sql = [];
sql.push(`-- Demo catalog. GENERATED by scripts/generate-seed.mjs — do not edit by hand.
-- Loaded by \`supabase db reset\` for local development only.
begin;`);

for (const [i, [slug, name, parent, type, color, home, desc]] of categories.entries()) {
  out(`public/seed/categories/${slug}.svg`, productSvg(type, color, i, i % 2 === 1));
  sql.push(`insert into public.categories (slug, name, parent_id, description, image_url, sort_order, show_on_home) values (${q(slug)}, ${q(name)}, ${parent ? `(select id from public.categories where slug = ${q(parent)})` : "null"}, ${q(desc)}, ${q(`/seed/categories/${slug}.svg`)}, ${i * 10}, ${home});`);
}
for (const [i, [slug, name, desc, type, color]] of collections.entries()) {
  out(`public/seed/collections/${slug}.svg`, productSvg(type, color, i + 1, true));
  sql.push(`insert into public.collections (slug, name, description, image_url, sort_order) values (${q(slug)}, ${q(name)}, ${q(desc)}, ${q(`/seed/collections/${slug}.svg`)}, ${i * 10});`);
}
sql.push(`insert into public.brands (name, slug) values ('סטודיו בית', 'studio-bayit'), ('אטלייה נורד', 'atelier-nord');`);

const care = "לניקוי יש להשתמש במטלית רכה ויבשה. אין להשתמש בחומרי ניקוי שוחקים.";
const install = "המוצר מגיע עם מתלה ייעודי וערכת התקנה. מומלץ לתלות על קיר יציב בעזרת דיבל מתאים.";
const typeText = {
  art: "הדפס איכותי על קנבס מתוח, ממוסגר ומוכן לתלייה.", clock: "שעון קיר עם מנגנון שקט ללא תקתוק.",
  mirror: "מראה איכותית עם מסגרת מעוצבת וזכוכית בטיחותית.", lamp: "גוף תאורה מעוצב המתאים לנורת E27 (לא כלולה).",
  vase: "אגרטל דקורטיבי בעבודת יד, כל פריט ייחודי במעט.", shelf: "מדף דקורטיבי יציב עם חיבורים נסתרים.",
  sign: "שלט דקורטיבי בחיתוך מדויק ובגימור איכותי.", candle: "סט נרות ריחניים משעוות סויה טבעית.", cushion: "כרית נוי עם ריפוד נשלף וכיסוי רחיץ.",
};

products.forEach(([name, slug, sku, type, price, sale, cats, colors, [material, size, style], o], idx) => {
  const v0 = o.v ?? (o.odd ? 1 : idx % 4);
  const pid = `(select id from public.products where slug = ${q(slug)})`;
  const specs = [["חומר", material], ["סגנון", style], ["ארץ ייצור", idx % 2 ? "איטליה" : "ישראל"], ["אחריות", "12 חודשים"]];
  sql.push(`insert into public.products (name, slug, sku, short_description, description, brand_id, status, is_featured, price, sale_price, specs, width_cm, height_cm, depth_cm, weight_kg, installation_instructions, care_instructions, delivery_days_min, delivery_days_max, handling_days, sales_count, published_at, created_at) values (${q(name)}, ${q(slug)}, ${q(sku)}, ${q(typeText[type])}, ${q(`${typeText[type]} ${name} משתלב בקלות בסלון, בחדר השינה, במשרד או בחלל העסק, ומוסיף לחלל נוכחות שקטה ומוקפדת.\n\nהמוצר נבחר בקפידה על ידי צוות העיצוב שלנו ונבדק לפני המשלוח.`)}, (select id from public.brands where slug = ${q(idx % 2 ? "atelier-nord" : "studio-bayit")}), 'active', ${!!o.featured}, ${price}, ${sale ?? "null"}, ${q(JSON.stringify(specs.map(([label, value]) => ({ label, value }))))}::jsonb, ${40 + (idx % 5) * 10}, ${50 + (idx % 4) * 10}, ${3 + (idx % 6) * 2}, ${(0.8 + (idx % 7) * 0.4).toFixed(1)}, ${q(["art", "clock", "mirror", "shelf", "sign"].includes(type) ? install : null)}, ${q(care)}, 3, 7, 2, ${o.sales ?? 0}, now(), now() - interval '${idx * 3} days');`);
  cats.forEach((c, i) => sql.push(`insert into public.product_categories (product_id, category_id, is_primary) values (${pid}, (select id from public.categories where slug = ${q(c)}), ${i === 0});`));
  (o.cols ?? []).forEach((c) => sql.push(`insert into public.collection_products (collection_id, product_id) values ((select id from public.collections where slug = ${q(c)}), ${pid});`));
  const attrs = [...colors.map((c) => ["color", c]), ["material", material], ["size", size], ["style", style]];
  attrs.forEach(([code, value]) => sql.push(`insert into public.product_attribute_assignments (product_id, attribute_value_id) values (${pid}, (select v.id from public.product_attribute_values v join public.product_attributes a on a.id = v.attribute_id where a.code = ${q(code)} and v.value = ${q(value)}));`));

  // Images: one per colour (front view) + one in-room view of the first colour.
  colors.forEach((c, i) => {
    out(`public/seed/products/${slug}-${i + 1}.svg`, productSvg(type, c, v0, false));
    sql.push(`insert into public.product_images (product_id, url, alt, sort_order, is_primary) values (${pid}, ${q(`/seed/products/${slug}-${i + 1}.svg`)}, ${q(`${name} בצבע ${c}`)}, ${i === 0 ? 0 : i + 1}, ${i === 0});`);
  });
  out(`public/seed/products/${slug}-room.svg`, productSvg(type, colors[0], v0, true));
  sql.push(`insert into public.product_images (product_id, url, alt, sort_order) values (${pid}, ${q(`/seed/products/${slug}-room.svg`)}, ${q(`${name} בחלל מעוצב`)}, 1);`);

  // Variants: colour × (size) — price differences come from the size.
  const sizes = o.art ? sizesArt : o.sizes ?? [[null, 0]];
  let n = 0;
  colors.forEach((c, ci) => sizes.forEach(([s, extra], si) => {
    n += 1;
    const options = s ? { צבע: c, מידה: s } : { צבע: c };
    const single = colors.length === 1 && sizes.length === 1;
    const stock = o.soldOut ? 0 : idx === 5 ? 2 : 4 + ((idx * 7 + ci * 3 + si * 5) % 14);
    sql.push(`insert into public.product_variants (product_id, sku, name, options, price, sale_price, image_id, is_default, sort_order) values (${pid}, ${q(`${sku}-${String(n).padStart(2, "0")}`)}, ${q(single ? null : [c, s].filter(Boolean).join(" · "))}, ${q(JSON.stringify(options))}::jsonb, ${extra ? price + extra : "null"}, ${extra && sale ? sale + extra : "null"}, (select id from public.product_images where product_id = ${pid} and url = ${q(`/seed/products/${slug}-${ci + 1}.svg`)}), ${n === 1}, ${n});`);
    sql.push(`update public.inventory set on_hand = ${stock} where variant_id = (select id from public.product_variants where sku = ${q(`${sku}-${String(n).padStart(2, "0")}`)});`);
  }));
});

sql.push(`insert into public.inventory_movements (variant_id, delta, reason, note) select variant_id, on_hand, 'initial', 'מלאי פתיחה' from public.inventory where on_hand > 0;`);
sql.push(`insert into public.product_relations (product_id, related_product_id, kind)
select a.id, b.id, 'complementary' from public.products a join public.products b on b.id <> a.id
 where (a.slug, b.slug) in (('modern-wall-clock','abstract-dunes-wall-art'), ('modern-wall-clock','brass-desk-lamp'), ('round-gold-mirror','ceramic-table-lamp'), ('matte-ceramic-vase','scented-candle-set'), ('velvet-cushion','striped-cushion'), ('floating-oak-shelf','matte-ceramic-vase'));`);
sql.push(`insert into public.coupons (code, description, kind, value, min_order, per_customer_limit) values
  ('WELCOME10', '10% הנחה בהזמנה ראשונה', 'percent', 10, 0, 1),
  ('SAVE50', '50 ₪ הנחה בקנייה מעל 400 ₪', 'fixed', 50, 400, null),
  ('FREESHIP', 'משלוח חינם', 'free_shipping', 0, 0, null);`);
sql.push("commit;");
out("supabase/seed.sql", sql.join("\n") + "\n");
console.log(`seed: ${products.length} products, ${categories.length} categories, ${collections.length} collections`);
