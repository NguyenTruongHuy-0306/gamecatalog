import { describe, it, expect } from "vitest";
import { apiError } from "./client-error";

describe("apiError", () => {
  it("returns fallback for null", () => {
    expect(apiError(null, "fallback")).toBe("fallback");
  });

  it("returns fallback for non-object primitive", () => {
    expect(apiError("string", "fallback")).toBe("fallback");
    expect(apiError(42, "fallback")).toBe("fallback");
  });

  it("returns the error string from { error: string }", () => {
    expect(apiError({ error: "Bad request" }, "fallback")).toBe("Bad request");
  });

  it("returns fallback when error string is empty", () => {
    expect(apiError({ error: "" }, "fallback")).toBe("fallback");
  });

  it("returns message from nested { error: { message: string } }", () => {
    expect(apiError({ error: { message: "Nested error" } }, "fallback")).toBe("Nested error");
  });

  it("returns fallback when nested message is empty", () => {
    expect(apiError({ error: { message: "" } }, "fallback")).toBe("fallback");
  });

  it("returns fallback when error key is absent", () => {
    expect(apiError({ other: "value" }, "fallback")).toBe("fallback");
  });

  it("returns fallback when error is a number", () => {
    expect(apiError({ error: 42 }, "fallback")).toBe("fallback");
  });
});
