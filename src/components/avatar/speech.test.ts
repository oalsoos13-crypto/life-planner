import { describe, expect, it } from "vitest";
import { speakable } from "./speech";

describe("speakable", () => {
  it("بيشيل رموز Markdown والمراجع اللاتينية والروابط", () => {
    expect(speakable("**ركّز** على المجدّد (Essentialism) هلّق: https://x.y")).toBe("ركّز على المجدّد هلّق:");
  });
  it("بيخلّي الأقواس العربية", () => {
    expect(speakable("خطوة (صغيرة) بس")).toBe("خطوة (صغيرة) بس");
  });
});
