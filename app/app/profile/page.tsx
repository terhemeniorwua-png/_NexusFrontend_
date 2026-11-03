'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { AccountSecurity } from '@/components/profile/AccountSecurity';
import { ApiRequestError, getAccessToken } from '@/lib/api';
import { refreshSession } from '@/services/auth';
import { getUserProfile, updateUserProfile, type UserProfileView } from '@/services/profile';

interface ProfileFields {
  name: string;
  bio: string;
  jobTitle: string;
  avatarUrl: string;
  timeZone: string;
  locale: string;
}

function profileToFields(profile: UserProfileView): ProfileFields {
  return {
    name: profile.user.name,
    bio: profile.profile.bio ?? '',
    jobTitle: profile.profile.jobTitle ?? '',
    avatarUrl: profile.profile.avatarUrl ?? '',
    timeZone: profile.profile.timeZone,
    locale: profile.profile.locale,
  };
}

function validateFields(fields: ProfileFields): string | null {
  const name = fields.name.trim();
  if (name.length < 2 || name.length > 100) return 'Name must be between 2 and 100 characters.';
  if (fields.bio.trim().length > 500) return 'Bio must be 500 characters or fewer.';
  if (fields.jobTitle.trim().length > 100) return 'Job title must be 100 characters or fewer.';
  if (fields.avatarUrl.trim()) {
    try {
      const url = new URL(fields.avatarUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || fields.avatarUrl.trim().length > 2048) {
        return 'Avatar URL must be a valid HTTP or HTTPS URL no longer than 2048 characters.';
      }
    } catch {
      return 'Enter a valid HTTP or HTTPS avatar URL.';
    }
  }
  if (!fields.timeZone.trim() || fields.timeZone.trim().length > 64) return 'Enter a time zone of up to 64 characters.';
  if (fields.locale.trim().length < 2 || fields.locale.trim().length > 10) return 'Locale must be between 2 and 10 characters.';
  return null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileView | null>(null);
  const [fields, setFields] = useState<ProfileFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!getAccessToken()) await refreshSession();
        let result: UserProfileView;
        try {
          result = await getUserProfile();
        } catch (cause) {
          if (!(cause instanceof ApiRequestError) || cause.status !== 401) throw cause;
          await refreshSession();
          result = await getUserProfile();
        }
        if (active) {
          setProfile(result);
          setFields(profileToFields(result));
          setError(null);
        }
      } catch (cause) {
        if (active && cause instanceof ApiRequestError && cause.status === 401) {
          router.replace('/sign-in');
        } else if (active) {
          setError(cause instanceof ApiRequestError ? cause.message : 'Your profile could not be loaded. Try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router, loadAttempt]);

  function retryLoadProfile() {
    setLoading(true);
    setError(null);
    setLoadAttempt((attempt) => attempt + 1);
  }

  function updateField<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setFields((current) => current ? { ...current, [key]: value } : current);
    setError(null);
    setSuccess(null);
  }

  const isDirty = Boolean(profile && fields && JSON.stringify(fields) !== JSON.stringify(profileToFields(profile)));

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fields || !isDirty) return;
    const validationError = validateFields(fields);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    const input = {
      name: fields.name.trim(),
      bio: fields.bio.trim() || null,
      jobTitle: fields.jobTitle.trim() || null,
      avatarUrl: fields.avatarUrl.trim() || null,
      timeZone: fields.timeZone.trim(),
      locale: fields.locale.trim(),
    };

    try {
      let updated: UserProfileView;
      try {
        updated = await updateUserProfile(input);
      } catch (cause) {
        if (!(cause instanceof ApiRequestError) || cause.status !== 401) throw cause;
        await refreshSession();
        updated = await updateUserProfile(input);
      }
      setProfile(updated);
      setFields(profileToFields(updated));
      setSuccess('Your profile has been saved.');
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) router.replace('/sign-in');
      else setError(cause instanceof ApiRequestError ? cause.message : 'Your profile could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/app" className="flex items-center gap-2 font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">N</span>Nexus</Link>
        <Link href="/app" className="text-sm font-medium text-[var(--color-primary)] hover:underline">Back to account</Link>
      </header>

      <section className="my-auto py-10 sm:py-14">
        <p className="text-sm font-semibold text-[var(--color-primary)]">Account setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">Add or update the profile details shown across Nexus. Your email address is managed separately.</p>

        {loading ? <p role="status" className="mt-8 text-sm text-[var(--color-text-secondary)]">Loading your profile…</p> : error && !fields ? (
          <div className="mt-8"><Alert variant="error" title="Profile unavailable">{error}</Alert><Button className="mt-4" onClick={retryLoadProfile}>Try again</Button></div>
        ) : fields && profile ? (
          <Card className="mt-8 p-5 sm:p-8">
            <div className="mb-7 flex items-center gap-4">
              <Avatar src={fields.avatarUrl || null} name={fields.name || profile.user.name} size="lg" />
              <div><p className="font-medium">Profile details</p><p className="text-sm text-[var(--color-text-secondary)]">Avatar URL only; image uploads are not available yet.</p></div>
            </div>
            {error && <Alert variant="error" title="Profile not saved" className="mb-5">{error}</Alert>}
            {success && <Alert variant="success" title="Saved" className="mb-5">{success}</Alert>}
            <form onSubmit={handleSave} className="space-y-5">
              <Input id="profile-name" label="Full name" required maxLength={100} value={fields.name} onChange={(event) => updateField('name', event.target.value)} />
              <Input id="profile-email" label="Email address" type="email" value={profile.user.email} readOnly helperText="Email changes use a separate verified account flow." />
              <Input id="profile-job-title" label="Job title" maxLength={100} value={fields.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} />
              <Textarea id="profile-bio" label="Bio" maxLength={500} rows={4} value={fields.bio} onChange={(event) => updateField('bio', event.target.value)} helperText={`${fields.bio.length}/500 characters`} />
              <Input id="profile-avatar-url" label="Avatar image URL" type="url" maxLength={2048} value={fields.avatarUrl} onChange={(event) => updateField('avatarUrl', event.target.value)} helperText="Use an HTTP or HTTPS image URL. Uploads are not supported by the current backend." />
              <div className="grid gap-5 sm:grid-cols-2">
                <Input id="profile-time-zone" label="Time zone" maxLength={64} required value={fields.timeZone} onChange={(event) => updateField('timeZone', event.target.value)} helperText="Example: Africa/Lagos" />
                <Input id="profile-locale" label="Locale" maxLength={10} minLength={2} required value={fields.locale} onChange={(event) => updateField('locale', event.target.value)} helperText="Example: en or en-GB" />
              </div>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Link href="/app" className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium hover:bg-[var(--color-surface-secondary)]">Cancel</Link>
                <Button type="submit" loading={saving} disabled={!isDirty}>{saving ? 'Saving…' : 'Save profile'}</Button>
              </div>
            </form>
          </Card>
        ) : null}
        {!loading && fields && profile && <AccountSecurity />}
      </section>
      <footer className="text-xs text-[var(--color-text-muted)]">Nexus · Profile setup and management</footer>
    </main>
  );
}
