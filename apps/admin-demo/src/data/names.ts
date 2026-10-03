/**
 * Synthetic people, companies and places, each as an English/Persian pair so a row is the same
 * person in both languages. None of these is a real customer: names are drawn at random from common
 * first names and a single initial, handles are built from them, companies are invented.
 */
import type { L } from "@/i18n";

const FIRST: [string, string][] = [
  ["Sara", "سارا"], ["Arman", "آرمان"], ["Nika", "نیکا"], ["Kian", "کیان"], ["Mina", "مینا"],
  ["Reza", "رضا"], ["Darya", "دریا"], ["Omid", "امید"], ["Parisa", "پریسا"], ["Navid", "نوید"],
  ["Shirin", "شیرین"], ["Babak", "بابک"], ["Yasaman", "یاسمن"], ["Kaveh", "کاوه"], ["Leila", "لیلا"],
  ["Farid", "فرید"], ["Neda", "ندا"], ["Sina", "سینا"], ["Elham", "الهام"], ["Pouya", "پویا"],
  ["Roya", "رویا"], ["Hamed", "حامد"], ["Taraneh", "ترانه"], ["Arash", "آرش"], ["Golnaz", "گلناز"],
  ["Behzad", "بهزاد"], ["Mahsa", "مهسا"], ["Kamran", "کامران"], ["Azadeh", "آزاده"], ["Saman", "سامان"],
  ["Emma", "اِما"], ["Lucas", "لوکاس"], ["Sofia", "سوفیا"], ["Noah", "نوآ"], ["Mia", "میا"],
  ["Leo", "لئو"], ["Hannah", "هانا"], ["Daniel", "دنیل"], ["Aria", "آریا"], ["Maya", "مایا"],
];

const INITIAL: [string, string][] = [
  ["K", "ک"], ["M", "م"], ["R", "ر"], ["S", "س"], ["T", "ت"], ["A", "ا"], ["B", "ب"], ["N", "ن"],
  ["H", "ه"], ["F", "ف"], ["J", "ج"], ["Z", "ز"], ["G", "گ"], ["D", "د"], ["P", "پ"],
];

export interface PersonPick {
  name: L;
  handle: string;
  initials: L;
}

export function personAt(a: number, b: number, n: number): PersonPick {
  const [fe, ff] = FIRST[a % FIRST.length];
  const [ie, iff] = INITIAL[b % INITIAL.length];
  return {
    name: { en: `${fe} ${ie}.`, fa: `${ff} ${iff}.` },
    handle: `@${fe.toLowerCase()}.${ie.toLowerCase()}${n % 7 === 0 ? "" : n % 97}`,
    initials: { en: `${fe[0]}${ie}`, fa: ff[0] },
  };
}

export const FIRST_COUNT = FIRST.length;
export const INITIAL_COUNT = INITIAL.length;

/** Invented companies. Names stay Latin in Persian too, as brand names usually do. */
export const COMPANIES = [
  "Alder & Finch", "Bluefin Labs", "Cobalt Works", "Driftwood Studio", "Ember Analytics", "Fieldnote Co",
  "Granite Clinics", "Harbor Kitchen", "Indigo Freight", "Juniper Legal", "Kestrel Media", "Lumen Robotics",
  "Marlow Dental", "Northbeam Energy", "Orchard Logistics", "Pine & Pixel", "Quarry Games", "Riverstone Realty",
  "Saffron Foods", "Tidewater Care", "Umber Architects", "Vellum Press", "Willow Fitness", "Yarrow Bakery",
  "Zephyr Travel", "Brightwater Farms", "Copperleaf Retail", "Dunmore Consulting", "Evergrove Schools", "Foxglove Events",
];

const pair = (en: string, fa: string): L => ({ en, fa });

/** Server locations for a VPN service. */
export const SERVER_CITIES: { name: L; code: string }[] = [
  { name: pair("Frankfurt", "فرانکفورت"), code: "FRA" },
  { name: pair("Amsterdam", "آمستردام"), code: "AMS" },
  { name: pair("Helsinki", "هلسینکی"), code: "HEL" },
  { name: pair("Stockholm", "استکهلم"), code: "STO" },
  { name: pair("Paris", "پاریس"), code: "PAR" },
  { name: pair("London", "لندن"), code: "LON" },
  { name: pair("Toronto", "تورنتو"), code: "YYZ" },
  { name: pair("Istanbul", "استانبول"), code: "IST" },
  { name: pair("Warsaw", "ورشو"), code: "WAW" },
  { name: pair("Vienna", "وین"), code: "VIE" },
  { name: pair("Zurich", "زوریخ"), code: "ZRH" },
  { name: pair("Singapore", "سنگاپور"), code: "SIN" },
];

/** Where customers of a store or a print shop live. */
export const CUSTOMER_CITIES: L[] = [
  pair("Tehran", "تهران"), pair("Isfahan", "اصفهان"), pair("Shiraz", "شیراز"), pair("Tabriz", "تبریز"),
  pair("Mashhad", "مشهد"), pair("Karaj", "کرج"), pair("Rasht", "رشت"), pair("Yazd", "یزد"),
  pair("Dubai", "دبی"), pair("Istanbul", "استانبول"), pair("Toronto", "تورنتو"), pair("Berlin", "برلین"),
];

export const REGIONS: L[] = [
  pair("Europe", "اروپا"), pair("North America", "آمریکای شمالی"), pair("Middle East", "خاورمیانه"),
  pair("Asia Pacific", "آسیا و اقیانوسیه"), pair("Latin America", "آمریکای لاتین"),
];
