import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSecurity } from "../AccountSecurity";
import {
  changeAccountPassword,
  deleteAccount,
  getAccountSessions,
  requestAccountEmailChange,
  signOutAllSessions,
} from "@/services/account-security";

const mockRouter = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("@/services/auth", () => ({ refreshSession: vi.fn() }));
vi.mock("@/services/account-security", () => ({
  changeAccountPassword: vi.fn(),
  deleteAccount: vi.fn(),
  getAccountSessions: vi.fn(),
  requestAccountEmailChange: vi.fn(),
  signOutAllSessions: vi.fn(),
}));

const session = {
  id: "session-1",
  userAgent: "Firefox on Linux",
  ip: "203.0.113.10",
  createdAt: "2026-11-01T10:00:00.000Z",
  lastUsedAt: "2026-11-03T10:00:00.000Z",
  expiresAt: "2026-11-04T10:00:00.000Z",
  current: true,
};

function input(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement))
    throw new Error(`Expected input #${id}`);
  return element;
}

describe("AccountSecurity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccountSessions).mockResolvedValue({ sessions: [session] });
    vi.mocked(changeAccountPassword).mockResolvedValue({
      message: "Password changed.",
    });
    vi.mocked(deleteAccount).mockResolvedValue({
      status: "PENDING_DELETION",
      scheduledDeletionAt: "2026-11-05T00:00:00.000Z",
    });
    vi.mocked(requestAccountEmailChange).mockResolvedValue({
      message: "Confirmation link sent.",
    });
    vi.mocked(signOutAllSessions).mockResolvedValue();
  });

  it("shows active sessions and refreshes them from the account API", async () => {
    render(<AccountSecurity email="ada@example.com" />);

    expect(await screen.findByText("Firefox on Linux")).toBeInTheDocument();
    expect(screen.getByText("Current session")).toBeInTheDocument();
    expect(screen.getByText("IP 203.0.113.10")).toBeInTheDocument();
    expect(getAccountSessions).toHaveBeenCalledOnce();
  });

  it("checks password confirmation before sending an update", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AccountSecurity email="ada@example.com" />);

    await screen.findByText("Firefox on Linux");
    fireEvent.change(input("security-current-password"), {
      target: { value: "old-password" },
    });
    fireEvent.change(input("security-new-password"), {
      target: { value: "New-password-123" },
    });
    fireEvent.change(input("security-confirm-password"), {
      target: { value: "Other-password-123" },
    });
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The new passwords do not match.",
    );
    expect(changeAccountPassword).not.toHaveBeenCalled();
  });

  it("changes password through the verified contract and refreshes session data", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AccountSecurity email="ada@example.com" />);

    await screen.findByText("Firefox on Linux");
    fireEvent.change(input("security-current-password"), {
      target: { value: "old-password" },
    });
    fireEvent.change(input("security-new-password"), {
      target: { value: "New-password-123" },
    });
    fireEvent.change(input("security-confirm-password"), {
      target: { value: "New-password-123" },
    });
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(changeAccountPassword).toHaveBeenCalledWith({
        currentPassword: "old-password",
        newPassword: "New-password-123",
      }),
    );
    expect(
      await screen.findByText(/Other signed-in sessions were revoked/),
    ).toBeInTheDocument();
    expect(getAccountSessions).toHaveBeenCalledTimes(2);
  });

  it("requests an email change and tells the user the current address remains active until confirmation", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AccountSecurity email="ada@example.com" />);

    await screen.findByText("Firefox on Linux");
    fireEvent.change(input("security-new-email"), {
      target: { value: "ada.new@example.com" },
    });
    fireEvent.change(input("security-email-password"), {
      target: { value: "current-password" },
    });
    await user.click(
      screen.getByRole("button", { name: "Send confirmation link" }),
    );

    await waitFor(() =>
      expect(requestAccountEmailChange).toHaveBeenCalledWith({
        email: "ada.new@example.com",
        currentPassword: "current-password",
      }),
    );
    expect(
      await screen.findByText(
        /Your address will change only after you confirm/,
      ),
    ).toBeInTheDocument();
  });

  it("requires confirmation before signing out every active session", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AccountSecurity email="ada@example.com" />);

    await screen.findByText("Firefox on Linux");
    await user.click(
      screen.getByRole("button", { name: "Sign out all sessions" }),
    );
    expect(signOutAllSessions).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Sign out everywhere" }),
    );

    await waitFor(() => expect(signOutAllSessions).toHaveBeenCalledOnce());
    expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in");
  });

  it("requires password, matching email, and explicit acknowledgement before deletion", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AccountSecurity email="ada@example.com" />);

    await screen.findByText("Firefox on Linux");
    fireEvent.change(input("delete-account-password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(input("delete-account-confirmation"), {
      target: { value: "wrong@example.com" },
    });
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(deleteAccount).not.toHaveBeenCalled();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter your account email address",
    );
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("submits the confirmed deleteAccount contract and signs out on success", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AccountSecurity email="ada@example.com" />);

    await screen.findByText("Firefox on Linux");
    fireEvent.change(input("delete-account-password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(input("delete-account-confirmation"), {
      target: { value: "ada@example.com" },
    });
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Schedule deletion" }));

    await waitFor(() =>
      expect(deleteAccount).toHaveBeenCalledWith({
        currentPassword: "current-password",
        confirmation: "ada@example.com",
      }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in?deletionScheduledAt=2026-11-05T00%3A00%3A00.000Z");
  });
});
