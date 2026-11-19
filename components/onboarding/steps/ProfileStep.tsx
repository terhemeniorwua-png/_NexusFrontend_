'use client';

import { useEffect, useState } from 'react';
import {
  getUserProfile,
  updateUserProfile,
  type UpdateUserProfileInput,
} from '@/services/profile';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface ProfileStepProps {
  userName: string;
  onComplete: (action: 'complete' | 'skip') => void;
  onError: (message: string) => void;
  busy: boolean;
}

export default function ProfileStep({
  userName,
  onComplete,
  onError,
  busy,
}: ProfileStepProps) {
  const [name, setName] = useState(userName);
  const [jobTitle, setJobTitle] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { profile } = await getUserProfile();
        if (!active) return;
        setJobTitle(profile.jobTitle ?? '');
      } catch {
        // Non-fatal — fields start empty.
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const handleContinue = async () => {
    setProfileError(null);
    const input: UpdateUserProfileInput = {};
    if (name && name.trim().length > 0) input.name = name.trim();
    if (jobTitle && jobTitle.trim().length > 0) input.jobTitle = jobTitle.trim();
    try {
      await updateUserProfile(input);
      onComplete('complete');
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not save profile.';
      setProfileError(message);
      onError(message);
    }
  };

  const handleSkip = () => {
    onComplete('skip');
  };

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
        Personalise your profile
      </p>
      <p className="text-base leading-7 text-[var(--color-text-secondary)]">
        Your name and job title help teammates recognise you in workspaces and comments.
      </p>

      {profileError && (
        <Alert variant="error" title="Could not save profile">{profileError}</Alert>
      )}

      <Input
        id="onboarding-profile-name"
        label="Full name"
        autoComplete="name"
        required
        value={name}
        onChange={(event) => { setName(event.target.value); }}
        minLength={2}
        maxLength={100}
        disabled={busy}
      />

      <Input
        id="onboarding-profile-job-title"
        label="Job title"
        autoComplete="job-title"
        value={jobTitle}
        onChange={(event) => { setJobTitle(event.target.value); }}
        maxLength={100}
        helperText="Optional — shown on your profile and in mentions."
        disabled={busy}
      />

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="secondary"
          size="md"
          disabled={busy}
          onClick={() => { void handleSkip(); }}
        >
          Skip for now
        </Button>
        <Button
          size="md"
          loading={busy}
          disabled={busy}
          onClick={() => { void handleContinue(); }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
