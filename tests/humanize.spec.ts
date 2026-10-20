import {describe, expect, it} from "vitest";
import {describeScalar, humanizeKey, isInline} from "../src/components/ui/humanize";

describe("humanizeKey", () => {
    it("capitalizes a plain word", () => {
        expect(humanizeKey("message")).toBe("Message");
    });

    it("splits camelCase, snake_case, kebab-case and dotted keys", () => {
        expect(humanizeKey("firstName")).toBe("First name");
        expect(humanizeKey("first_name")).toBe("First name");
        expect(humanizeKey("Content-Type")).toBe("Content type");
        expect(humanizeKey("address.zipCode")).toBe("Address zip code");
    });

    it("writes acronyms in capitals", () => {
        expect(humanizeKey("id")).toBe("ID");
        expect(humanizeKey("userId")).toBe("User ID");
        expect(humanizeKey("logo_url")).toBe("Logo URL");
        expect(humanizeKey("HTTPServer")).toBe("HTTP server");
    });

    it("keeps keys that have no letters", () => {
        expect(humanizeKey("___")).toBe("___");
    });
});

describe("describeScalar", () => {
    it("shows booleans in words", () => {
        expect(describeScalar(true).text).toBe("Yes");
        expect(describeScalar(false).text).toBe("No");
    });

    it("shows missing values as muted", () => {
        expect(describeScalar(null)).toEqual({text: "—", muted: true});
        expect(describeScalar("")).toEqual({text: "(empty)", muted: true});
    });

    it("never reformats numbers", () => {
        expect(describeScalar(123456789012).text).toBe("123456789012");
    });

    it("localizes ISO dates and keeps the original value", () => {
        const view = describeScalar("2026-10-12T12:03:00Z");
        expect(view.raw).toBe("2026-10-12T12:03:00Z");
        expect(view.text).not.toBe(view.raw);
    });

    it("leaves invalid dates and ordinary strings alone", () => {
        expect(describeScalar("2026-13-45")).toEqual({text: "2026-13-45", muted: false});
        expect(describeScalar("Hello")).toEqual({text: "Hello", muted: false});
    });
});

describe("isInline", () => {
    it("is true for scalars and empty containers only", () => {
        expect(isInline("a")).toBe(true);
        expect(isInline(null)).toBe(true);
        expect(isInline({})).toBe(true);
        expect(isInline([])).toBe(true);
        expect(isInline({a: 1})).toBe(false);
        expect(isInline([1])).toBe(false);
    });
});
