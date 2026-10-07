import { afterEach, describe, expect, it } from "vitest";

import { fill, setCurrentLocale } from "@/i18n";

import { formatBytes, formatDate, formatHours, formatMoney, formatMs, formatNumber, formatPct, localizeDigits } from "./format";

const FSI = "⁨";
const PDI = "⁩";

describe("format", () => {
  afterEach(() => setCurrentLocale("en"));

  it("prints Latin digits in English and Persian digits and separators in Persian", () => {
    setCurrentLocale("en");
    expect(formatNumber(12345)).toBe("12,345");
    expect(formatPct(37.5)).toBe("37.5%");
    setCurrentLocale("fa");
    expect(formatNumber(12345)).toBe("۱۲٬۳۴۵");
    expect(formatPct(37.5)).toBe("۳۷٫۵٪");
    expect(localizeDigits("3.1 TB")).toBe("۳٫۱ TB");
    expect(formatHours(6.9)).toBe("۶٫۹ ساعت");
  });

  it("isolates a number with a Latin unit so it never reorders inside Persian", () => {
    setCurrentLocale("fa");
    expect(formatMs(124)).toBe(`${FSI}۱۲۴ ms${PDI}`);
    expect(formatBytes(3.1 * 1024 ** 4)).toBe(`${FSI}۳٫۱ TB${PDI}`);
    setCurrentLocale("en");
    expect(formatBytes(512)).toBe(`${FSI}512 B${PDI}`);
  });

  it("uses the Persian calendar in Persian", () => {
    setCurrentLocale("fa");
    expect(formatDate(new Date(2026, 9, 3))).toBe("۱۱ مهر ۱۴۰۵");
    setCurrentLocale("en");
    expect(formatDate(new Date(2026, 9, 3))).toBe("October 3, 2026");
  });

  it("formats money in the business's currency", () => {
    setCurrentLocale("en");
    expect(formatMoney(67.4)).toBe("$67.40");
    expect(formatMoney(12345)).toBe("$12,345");
    expect(formatMoney(372_400, "USD", true)).toBe("$372.4K");
  });

  it("fills only the tokens it is given", () => {
    expect(fill("{a} of {b}", { a: 3 })).toBe("3 of {b}");
    expect(fill("{a}", {})).toBe("{a}");
  });
});
