import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeCode, ApiError } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("analyzeCode", () => {
  it("sends a typed analysis request and returns a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, analysis: { language: "javascript", findings: [], summary: {}, quality: {} } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await analyzeCode({ language: "javascript", filename: "example.js", code: "const value = 1;" });

    expect(response.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/analyze", expect.objectContaining({ method: "POST" }));
  });

  it("returns the backend error message for failed responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: "Unsupported language." }), { status: 400 })));

    await expect(analyzeCode({ language: "javascript", code: "code" })).rejects.toEqual(expect.objectContaining<ApiError>({ message: "Unsupported language." }));
  });

  it("returns a useful message for network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(analyzeCode({ language: "javascript", code: "code" })).rejects.toThrow("Unable to reach the DevMate backend");
  });
});
