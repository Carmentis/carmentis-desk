import {describe, expect, it} from "vitest";
import {isUnknownAccountError} from "../src/utils/accountErrors";

describe("isUnknownAccountError", () => {
    it("recognizes the error of an account that does not exist yet", () => {
        expect(isUnknownAccountError(new Error("[0] Remote error: unknown account key hash"))).toBe(true);
        expect(isUnknownAccountError(new Error("Account not found"))).toBe(true);
        expect(isUnknownAccountError("Unknown account")).toBe(true);
    });

    it("does not hide real failures", () => {
        expect(isUnknownAccountError(new Error("Network request failed"))).toBe(false);
        expect(isUnknownAccountError(new Error("Indexer not found"))).toBe(false);
        expect(isUnknownAccountError(null)).toBe(false);
        expect(isUnknownAccountError(undefined)).toBe(false);
        expect(isUnknownAccountError({message: "unknown account"})).toBe(false);
    });
});
