import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearInvitationIntent,
  extractTokenFromRedirectPath,
  readInvitationIntent,
  saveInvitationIntent,
  type InvitationIntent,
} from '../invitation-intent';

const intent: InvitationIntent = {
  token: 'token_abc123',
  workspaceId: 'workspace-1',
  workspaceName: 'Nexus Studio',
  workspaceSlug: 'nexus-studio',
  invitedByName: 'Grace',
  maskedEmail: 'a***@example.com',
  boundToAccount: true,
  expiresAt: '2026-11-10T00:00:00.000Z',
  role: 'MEMBER',
  organizationRole: 'COMPANY_MEMBER',
};

describe('invitation intent storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('returns null when nothing is saved', () => {
    expect(readInvitationIntent()).toBeNull();
  });

  it('saves and reads back an intent correctly', () => {
    saveInvitationIntent(intent);
    expect(readInvitationIntent()).toEqual(intent);
  });

  it('clears the stored intent', () => {
    saveInvitationIntent(intent);
    clearInvitationIntent();
    expect(readInvitationIntent()).toBeNull();
  });

  it('returns null when the stored value is not a valid object', () => {
    window.sessionStorage.setItem('nexus-invitation-intent', 'not-json{{{');
    expect(readInvitationIntent()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    window.sessionStorage.setItem(
      'nexus-invitation-intent',
      JSON.stringify({ token: 'abc' }), // missing most required fields
    );
    expect(readInvitationIntent()).toBeNull();
  });

  it('defaults missing role to MEMBER and organizationRole to null', () => {
    const { role, organizationRole, ...rest } = intent;
    saveInvitationIntent({ ...rest, role: '', organizationRole: null });
    const result = readInvitationIntent();
    expect(result?.role).toBe('');
    expect(result?.organizationRole).toBeNull();
  });

  it('handles a null organizationRole', () => {
    saveInvitationIntent({ ...intent, organizationRole: null });
    expect(readInvitationIntent()?.organizationRole).toBeNull();
  });

  it('dispatches a custom event when the intent is saved', () => {
    const events: Event[] = [];
    window.addEventListener('nexus-invitation-intent-change', (e) => events.push(e));
    saveInvitationIntent(intent);
    expect(events).toHaveLength(1);
    window.removeEventListener('nexus-invitation-intent-change', (e) => events.push(e));
  });

  it('dispatches a custom event when the intent is cleared', () => {
    saveInvitationIntent(intent);
    const events: Event[] = [];
    window.addEventListener('nexus-invitation-intent-change', (e) => events.push(e));
    clearInvitationIntent();
    expect(events).toHaveLength(1);
    window.removeEventListener('nexus-invitation-intent-change', (e) => events.push(e));
  });
});

describe('extractTokenFromRedirectPath', () => {
  it('extracts the token from a valid invitation accept path', () => {
    expect(
      extractTokenFromRedirectPath('/workspaces/invitations/accept?token=token_abc123'),
    ).toBe('token_abc123');
  });

  it('extracts the token even when extra query params are present', () => {
    expect(
      extractTokenFromRedirectPath('/workspaces/invitations/accept?token=abc&from=auth'),
    ).toBe('abc');
  });

  it('returns null for non-invitation paths', () => {
    expect(extractTokenFromRedirectPath('/app')).toBeNull();
    expect(extractTokenFromRedirectPath('/sign-in')).toBeNull();
  });

  it('returns null when the token query param is missing', () => {
    expect(extractTokenFromRedirectPath('/workspaces/invitations/accept')).toBeNull();
  });

  it('returns null for null or empty input', () => {
    expect(extractTokenFromRedirectPath(null)).toBeNull();
    expect(extractTokenFromRedirectPath('')).toBeNull();
    expect(extractTokenFromRedirectPath(undefined)).toBeNull();
  });
});
