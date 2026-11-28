import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import { acceptLegalDocument, advanceStep, completeOnboarding, getOnboardingStatus, updateAIAccess } from '../onboarding';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('onboarding service', () => {
  beforeEach(() => {
    setAccessToken('test-access-token');
    vi.restoreAllMocks();
  });

  it('fetches onboarding status from /onboarding/status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      required: true,
      currentStep: 'welcome',
      completedAt: null,
      pendingLegal: [],
      aiAccessEnabled: false,
      skippedSteps: [],
    }));

    await getOnboardingStatus();

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/onboarding/status', expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('accepts legal documents with POST /onboarding/accept', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      required: true,
      currentStep: 'privacy',
      completedAt: null,
      pendingLegal: [],
      aiAccessEnabled: false,
      skippedSteps: [],
    }));

    await acceptLegalDocument({ documentType: 'terms', version: '1.0' });

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/onboarding/accept', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ documentType: 'terms', version: '1.0' }),
    }));
  });

  it('updates AI access with POST /onboarding/ai', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      aiAccessEnabled: true,
      aiAccessUpdatedAt: '2026-01-01T00:00:00.000Z',
    }));

    await updateAIAccess({ enabled: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/onboarding/ai', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ enabled: true }),
    }));
  });

  it('keeps step and complete endpoints unchanged', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ required: true, currentStep: 'terms', completedAt: null, pendingLegal: [], aiAccessEnabled: false, skippedSteps: [] }))
      .mockResolvedValueOnce(jsonResponse({ required: false, currentStep: 'done', completedAt: '2026-01-01T00:00:00.000Z', pendingLegal: [], aiAccessEnabled: false, skippedSteps: [] }));

    await advanceStep({ step: 'welcome', action: 'complete' });
    await completeOnboarding();

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/onboarding/step', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ step: 'welcome', action: 'complete' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/onboarding/complete', expect.objectContaining({
      method: 'POST',
    }));
  });
});
