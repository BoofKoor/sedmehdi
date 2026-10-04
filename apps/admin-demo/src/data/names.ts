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

/**
 * `row`: the person IS the record (a user, a student), so the handle's number comes from the row and
 * is different in every row: 37 is coprime with 997, so `row × 37 mod 997` never repeats below 997
 * rows. Drawn at random it repeated (two students, one handle). Without it, a repeat is the same
 * person again, as an order's customer is.
 */
export function personAt(a: number, b: number, n: number, row?: number): PersonPick {
  const [fe, ff] = FIRST[a % FIRST.length];
  const [ie, iff] = INITIAL[b % INITIAL.length];
  const tag = row != null ? String((row * 37 + 11) % 997) : n % 7 === 0 ? "" : String(n % 97);
  return {
    name: { en: `${fe} ${ie}.`, fa: `${ff} ${iff}.` },
    handle: `@${fe.toLowerCase()}.${ie.toLowerCase()}${tag}`,
    initials: { en: `${fe[0]}${ie}`, fa: ff[0] },
  };
}

export const FIRST_COUNT = FIRST.length;
export const INITIAL_COUNT = INITIAL.length;

/**
 * Invented companies. Names stay Latin in Persian too, as brand names usually do. Sixty, so a table of
 * accounts can give every row its own (`companyAt`) instead of repeating a short list.
 */
export const COMPANIES = [
  "Alder & Finch", "Bluefin Swim School", "Cobalt Works", "Driftwood Studio", "Ember Analytics", "Fieldnote Co",
  "Granite Clinics", "Harbor Kitchen", "Indigo Freight", "Juniper Legal", "Kestrel Media", "Lumen Robotics",
  "Marlow Dental", "Northbeam Energy", "Orchard Logistics", "Pine & Pixel", "Quarry Games", "Riverstone Realty",
  "Saffron Foods", "Tidewater Care", "Umber Architects", "Vellum Press", "Willow Fitness", "Yarrow Bakery",
  "Zephyr Travel", "Brightwater Farms", "Copperleaf Retail", "Dunmore Consulting", "Evergrove Schools", "Foxglove Events",
  "Amberline Tea", "Birchwood Clinics", "Calder Print Co", "Deepwell Water", "Eastgate Motors", "Fernhill Nursery",
  "Glasshouse Studio", "Hollowbrook Inn", "Ironside Fitness", "Jasper Lane Books", "Keelson Marine", "Larkspur Florals",
  "Meadowlark Dairy", "Nettlefield Farms", "Oakhurst Dental", "Peregrine Tutors", "Quillon Legal", "Redfern Couriers",
  "Seabright Hotels", "Thornbury Wines", "Underhill Coffee", "Valemont Pharmacy", "Westbrook Tiles", "Yellowpine Cabins",
  "Zinnia Skincare", "Ashgrove Accounting", "Bramble Kids", "Clearbrook Tutoring", "Dovetail Joinery", "Elmstead Vets",
];

const pair = (en: string, fa: string): L => ({ en, fa });

/** Datacenter cities of a hosting business, with the airport-style code its server names use. */
export const DATACENTERS: { name: L; code: string }[] = [
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
