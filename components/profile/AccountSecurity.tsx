"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { ApiRequestError } from "@/lib/api";
import { refreshSession } from "@/services/auth";
import {
  changeAccountPassword,
  deleteAccount,
  getAccountSessions,
  requestAccountEmailChange,
  signOutAllSessions,
  type AccountSession,
} from "@/services/account-security";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

async function fetchActiveSessions(): Promise<{ sessions: AccountSession[] }> {
  try {
    return await getAccountSessions();
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401)
      throw error;
    await refreshSession();
    return getAccountSessions();
  }
}

export function AccountSecurity({ email }: { email: string }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailFields, setEmailFields] = useState({
    email: "",
    currentPassword: "",
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [deletionFields, setDeletionFields] = useState({
    currentPassword: "",
    confirmation: "",
  });
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [confirmDeletion, setConfirmDeletion] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const result = await fetchActiveSessions();
      setSessions(result.sessions);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401)
        router.replace("/sign-in");
      else
        setSessionsError(
          getErrorMessage(error, "Your active sessions could not be loaded."),
        );
    } finally {
      setSessionsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    fetchActiveSessions()
      .then((result) => {
        if (active) setSessions(result.sessions);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiRequestError && error.status === 401)
          router.replace("/sign-in");
        else
          setSessionsError(
            getErrorMessage(error, "Your active sessions could not be loaded."),
          );
      })
      .finally(() => {
        if (active) setSessionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    if (
      passwordFields.newPassword.length < 8 ||
      !/[A-Za-z]/.test(passwordFields.newPassword) ||
      !/\d/.test(passwordFields.newPassword)
    ) {
      setPasswordError(
        "Use at least 8 characters with at least one letter and one number.",
      );
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await changeAccountPassword({
        currentPassword: passwordFields.currentPassword,
        newPassword: passwordFields.newPassword,
      });
      setPasswordFields({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordSuccess(
        `${result.message} Other signed-in sessions were revoked.`,
      );
      await loadSessions();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.status === 401 &&
        error.code !== "INVALID_CREDENTIALS"
      )
        router.replace("/sign-in");
      else
        setPasswordError(
          getErrorMessage(error, "Your password could not be changed."),
        );
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    setEmailBusy(true);
    try {
      const result = await requestAccountEmailChange({
        email: emailFields.email.trim(),
        currentPassword: emailFields.currentPassword,
      });
      setEmailFields({ email: "", currentPassword: "" });
      setEmailSuccess(
        `${result.message} Your address will change only after you confirm the link sent to the new address.`,
      );
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.status === 401 &&
        error.code !== "INVALID_CREDENTIALS"
      )
        router.replace("/sign-in");
      else
        setEmailError(
          getErrorMessage(error, "The email change request could not be sent."),
        );
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleSignOutAll() {
    setSigningOutAll(true);
    try {
      await signOutAllSessions();
      router.replace("/sign-in");
    } catch (error) {
      setSessionsError(
        getErrorMessage(error, "All sessions could not be signed out."),
      );
      setSigningOutAll(false);
      setConfirmSignOutAll(false);
    }
  }

  function handleDeleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeletionError(null);
    if (
      deletionFields.confirmation.trim().toLowerCase() !==
      email.trim().toLowerCase()
    ) {
      setDeletionError("Enter your account email address to confirm deletion.");
      return;
    }
    if (!deletionConfirmed) {
      setDeletionError("Confirm that you understand the 30-day recovery period.");
      return;
    }

    setConfirmDeletion(true);
  }

  async function confirmDeleteAccount() {
    setDeletionBusy(true);
    setDeletionError(null);
    try {
      const result = await deleteAccount({
        currentPassword: deletionFields.currentPassword,
        confirmation: deletionFields.confirmation.trim(),
      });
      router.replace(`/sign-in?deletionScheduledAt=${encodeURIComponent(result.scheduledDeletionAt)}`);
    } catch (error) {
      setDeletionError(
        getErrorMessage(
          error,
          "Your account deletion request could not be completed.",
        ),
      );
    } finally {
      setDeletionBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="account-security-heading"
      className="mt-10 space-y-6"
    >
      <div>
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          Security
        </p>
        <h2
          id="account-security-heading"
          className="mt-1 text-2xl font-semibold tracking-tight"
        >
          Account security
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          Manage your password, verified email address, and active sign-in
          sessions.
        </p>
      </div>

      <Card className="p-5 sm:p-7">
        <h3 className="text-lg font-semibold">Change password</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Changing your password signs out your other active sessions.
        </p>
        {passwordError && (
          <Alert variant="error" title="Password not changed" className="mt-5">
            {passwordError}
          </Alert>
        )}
        {passwordSuccess && (
          <Alert variant="success" title="Password updated" className="mt-5">
            {passwordSuccess}
          </Alert>
        )}
        <form
          onSubmit={handlePasswordChange}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <Input
            id="security-current-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={passwordFields.currentPassword}
            onChange={(event) =>
              setPasswordFields({
                ...passwordFields,
                currentPassword: event.target.value,
              })
            }
          />
          <span className="hidden sm:block" aria-hidden="true" />
          <Input
            id="security-new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={passwordFields.newPassword}
            onChange={(event) =>
              setPasswordFields({
                ...passwordFields,
                newPassword: event.target.value,
              })
            }
            helperText="At least 8 characters, including a letter and a number."
          />
          <Input
            id="security-confirm-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={passwordFields.confirmPassword}
            onChange={(event) =>
              setPasswordFields({
                ...passwordFields,
                confirmPassword: event.target.value,
              })
            }
          />
          <div className="sm:col-span-2 sm:justify-self-end">
            <Button type="submit" loading={passwordBusy}>
              Update password
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-7">
        <h3 className="text-lg font-semibold">Change email address</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          We’ll send a confirmation link to the new address. Your current
          address remains active until you confirm it.
        </p>
        {emailError && (
          <Alert
            variant="error"
            title="Email change not requested"
            className="mt-5"
          >
            {emailError}
          </Alert>
        )}
        {emailSuccess && (
          <Alert variant="success" title="Confirmation sent" className="mt-5">
            {emailSuccess}
          </Alert>
        )}
        <form
          onSubmit={handleEmailChange}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <Input
            id="security-new-email"
            label="New email address"
            type="email"
            autoComplete="email"
            required
            value={emailFields.email}
            onChange={(event) =>
              setEmailFields({ ...emailFields, email: event.target.value })
            }
          />
          <Input
            id="security-email-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={emailFields.currentPassword}
            onChange={(event) =>
              setEmailFields({
                ...emailFields,
                currentPassword: event.target.value,
              })
            }
          />
          <div className="sm:col-span-2 sm:justify-self-end">
            <Button type="submit" loading={emailBusy}>
              Send confirmation link
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Active sessions</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Review devices currently signed in to your account.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void loadSessions()}
            loading={sessionsLoading}
          >
            Refresh sessions
          </Button>
        </div>
        {sessionsError && (
          <Alert variant="error" title="Sessions unavailable" className="mt-5">
            {sessionsError}
          </Alert>
        )}
        {sessionsLoading ? (
          <p
            role="status"
            className="mt-5 text-sm text-[var(--color-text-secondary)]"
          >
            Loading sessions…
          </p>
        ) : sessions.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--color-text-secondary)]">
            No active sessions were returned.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--color-border)]">
            {sessions.map((session) => (
              <li key={session.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="break-words text-sm font-medium">
                    {session.userAgent || "Unknown device"}
                    {session.current && (
                      <span className="ml-2 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs text-[var(--color-primary)]">
                        Current session
                      </span>
                    )}
                  </p>
                  {session.ip && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      IP {session.ip}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Last active {formatDate(session.lastUsedAt)} · Expires{" "}
                  {formatDate(session.expiresAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 border-t border-[var(--color-border)] pt-5">
          <p className="text-sm text-[var(--color-text-secondary)]">
            To revoke sessions, sign out everywhere. This will also end your
            current session.
          </p>
          <Button
            className="mt-3"
            variant="destructive"
            onClick={() => setConfirmSignOutAll(true)}
            disabled={sessionsLoading || sessions.length === 0}
          >
            Sign out all sessions
          </Button>
        </div>
      </Card>

      <Card className="border-[var(--color-danger)] p-5 sm:p-7">
        <h3 className="text-lg font-semibold">Delete account</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          Account deletion is scheduled, not immediate. Final deletion is
          scheduled for 30 days after you confirm. Your
          sessions end immediately. During the recovery period, sign in and
          choose Restore account to cancel deletion.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Owned workspaces are suspended unless an eligible member accepts an
          ownership transfer. Billing responsibility requires separate consent;
          outstanding invoices remain payable. Shared content and files are
          retained. See the{" "}
          <a
            className="font-medium text-[var(--color-primary)] underline"
            href="/terms"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            className="font-medium text-[var(--color-primary)] underline"
            href="/privacy"
          >
            Privacy Policy
          </a>{" "}
          drafts for current details.
        </p>
        {deletionError && (
          <Alert variant="error" title="Account not deleted" className="mt-5">
            {deletionError}
          </Alert>
        )}
        <form
          onSubmit={handleDeleteAccount}
          className="mt-5 grid gap-4 sm:max-w-xl"
        >
          <Input
            id="delete-account-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={deletionFields.currentPassword}
            onChange={(event) =>
              setDeletionFields({
                ...deletionFields,
                currentPassword: event.target.value,
              })
            }
          />
          <Input
            id="delete-account-confirmation"
            label={`Type ${email} to confirm`}
            type="email"
            autoComplete="email"
            required
            value={deletionFields.confirmation}
            onChange={(event) =>
              setDeletionFields({
                ...deletionFields,
                confirmation: event.target.value,
              })
            }
          />
          <label className="flex items-start gap-3 text-sm leading-5 text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={deletionConfirmed}
              onChange={(event) => setDeletionConfirmed(event.target.checked)}
              className="mt-1 size-4 accent-[var(--color-danger)]"
            />
            I understand sessions will end now and deletion can be recovered only during the next 30 days.
          </label>
          <div>
            <Button type="submit" variant="destructive" loading={deletionBusy}>
              Delete my account
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirmSignOutAll}
        onClose={() => setConfirmSignOutAll(false)}
        onConfirm={() => void handleSignOutAll()}
        title="Sign out all sessions?"
        description="This will revoke every active session, including this one. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        destructive
        loading={signingOutAll}
      />
      <ConfirmDialog
        open={confirmDeletion}
        onClose={() => setConfirmDeletion(false)}
        onConfirm={() => void confirmDeleteAccount()}
        title="Schedule account deletion?"
        description="Your account will enter a 30-day recovery period. Sessions end immediately. You can restore your account before the scheduled date; shared workspace content is retained. No payment refund is issued automatically."
        confirmLabel="Schedule deletion"
        destructive
        loading={deletionBusy}
      />
    </section>
  );
}
