// Customer-facing UI words in English, Telugu and Hindi. Menu item names come from MenuItem.nameI18n.
export const LANGS = { en: "English", te: "తెలుగు", hi: "हिंदी" } as const;
export type Lang = keyof typeof LANGS;
const T = {
  menu: { en: "Menu", te: "మెనూ", hi: "मेन्यू" },
  search: { en: "Search dishes", te: "వంటకాలు వెతకండి", hi: "व्यंजन खोजें" },
  vegOnly: { en: "Veg only", te: "శాకాహారం మాత్రమే", hi: "केवल शाकाहारी" },
  add: { en: "Add", te: "జోడించు", hi: "जोड़ें" },
  cart: { en: "Your order", te: "మీ ఆర్డర్", hi: "आपका ऑर्डर" },
  placeOrder: { en: "Place order", te: "ఆర్డర్ చేయండి", hi: "ऑर्डर करें" },
  callWaiter: { en: "Call waiter", te: "వెయిటర్‌ను పిలవండి", hi: "वेटर बुलाएँ" },
  askBill: { en: "Ask for bill", te: "బిల్లు అడగండి", hi: "बिल माँगें" },
  payNow: { en: "Pay now", te: "ఇప్పుడు చెల్లించండి", hi: "अभी भुगतान करें" },
  rate: { en: "Rate your meal", te: "మీ భోజనాన్ని రేట్ చేయండి", hi: "अपने भोजन को रेट करें" },
  phone: { en: "Phone (optional, for points & bill)", te: "ఫోన్ (ఐచ్ఛికం)", hi: "फ़ोन (वैकल्पिक)" },
  name: { en: "Name (optional)", te: "పేరు (ఐచ్ఛికం)", hi: "नाम (वैकल्पिक)" },
  status: { en: "Order status", te: "ఆర్డర్ స్థితి", hi: "ऑर्डर की स्थिति" },
  waiting: { en: "Waiting for staff to confirm", te: "సిబ్బంది నిర్ధారణ కోసం వేచి ఉంది", hi: "स्टाफ़ की पुष्टि का इंतज़ार" },
  NEW: { en: "Received", te: "అందింది", hi: "मिल गया" },
  PREPARING: { en: "Cooking", te: "వండుతున్నారు", hi: "बन रहा है" },
  READY: { en: "Ready", te: "సిద్ధం", hi: "तैयार" },
  SERVED: { en: "Served", te: "వడ్డించారు", hi: "परोसा गया" },
  CANCELLED: { en: "Cancelled", te: "రద్దు", hi: "रद्द" },
  total: { en: "Total", te: "మొత్తం", hi: "कुल" },
  sent: { en: "Sent! Staff has been told.", te: "పంపబడింది!", hi: "भेज दिया!" },
  often: { en: "People also ordered", te: "ఇతరులు కూడా ఆర్డర్ చేసారు", hi: "लोगों ने यह भी ऑर्डर किया" },
} as const;
export type Key = keyof typeof T;
export const t = (k: Key, lang: Lang) => T[k][lang] ?? T[k].en;
export const itemName = (i: { name: string; nameI18n?: unknown }, lang: Lang) => ((i.nameI18n as Record<string, string>) || {})[lang] || i.name;
