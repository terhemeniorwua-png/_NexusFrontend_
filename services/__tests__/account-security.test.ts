import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken } from "@/lib/api";
import { deleteAccount } from "../account-security";

describe("account security service", () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it("calls the verified deletion endpoint and clears the in-memory token after success", async () => {
    setAccessToken("access-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            status: "PENDING_DELETION",
            scheduledDeletionAt: "2026-11-05T00:00:00.000Z",
          },
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      deleteAccount({
        currentPassword: "current-password",
        confirmation: "ada@example.com",
      }),
    ).resolves.toEqual({
      status: "PENDING_DELETION",
      scheduledDeletionAt: "2026-11-05T00:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/auth/delete",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          currentPassword: "current-password",
          confirmation: "ada@example.com",
        }),
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(requestInit?.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
    expect(getAccessToken()).toBeNull();
  });
});
