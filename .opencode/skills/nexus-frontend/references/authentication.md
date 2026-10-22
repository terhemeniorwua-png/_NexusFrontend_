# Nexus Frontend — Authentication Reference

## Backend Contract Status

All authentication contracts are **PENDING** confirmation from the backend team. See `PHASES.md` Phase 3 and Appendix B.

Do not implement authentication without confirmed contracts.

## Key Files

| File | Phase | Purpose |
|---|---|---|
| `lib/api.ts` | 3 | Typed fetch wrapper — attaches credentials, handles 401 |
| `services/auth.ts` | 3 | login, register, logout, forgotPassword, resetPassword, getMe |
| `providers/AuthProvider.tsx` | 3 | React context: user object, isAuthenticated, isLoading |
| `hooks/useAuth.ts` | 3 | Consumes AuthProvider |
| `types/auth.ts` | 3 | User, LoginRequest, RegisterRequest, AuthResponse, SessionState |
| `hooks/usePermissions.ts` | 4 | Role-based permission flags |

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/(public)/login` | Public | Login form |
| `/(public)/register` | Public | Registration form |
| `/(public)/forgot-password` | Public | Request password reset |
| `/(public)/reset-password` | Public | Submit new password (token from URL) |
| `/(public)/verify-email` | Public | Email verification confirmation |
| `/(public)/invite/[token]` | Public | Workspace invitation acceptance |
| `/(auth)/dashboard` | Protected | Post-login landing |
| `/(auth)/profile` | Protected | User profile and settings |

## AuthProvider Context

```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true during session restoration
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}
```

## useAuth Hook

```typescript
const { user, isAuthenticated, isLoading, login, logout } = useAuth();
```

Do not access `AuthProvider` directly from components — use `useAuth`.

## Route Protection Pattern

Applied in `app/(auth)/layout.tsx`:

```typescript
// While session restoration is in progress: show skeleton
if (isLoading) return <FullPageSkeleton />;

// Not authenticated: redirect preserving destination
if (!isAuthenticated) {
  redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
}

// Authenticated: render protected content
return children;
```

## Role Model

| Role | Typical Scope |
|---|---|
| `OWNER` | Full workspace/project administration |
| `PM` | Project planning and management |
| `MEMBER` | Participates in permitted activities |
| `VIEWER` | Read-only access |
| `COLLABORATOR` | Access to specifically granted resources |

Exact role strings must be confirmed from backend before use in `usePermissions`.

## Permission Hook Pattern

```typescript
// hooks/usePermissions.ts
function usePermissions() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const role = workspace?.currentUserRole;

  return {
    canDeleteWorkspace: role === 'OWNER',
    canInviteMembers: role === 'OWNER' || role === 'PM',
    canManageRoles: role === 'OWNER',
    canCreateProject: role === 'OWNER' || role === 'PM',
    canEditTask: role !== 'VIEWER',
    canDeleteTask: role === 'OWNER' || role === 'PM',
    // ... confirm all flags against backend permission matrix
  };
}
```

Do not invent permission rules. Confirm from the backend authorization contract.

## Security Checklist

- [ ] No tokens in `localStorage` unless explicitly confirmed with backend team.
- [ ] No passwords or tokens in `console.log`.
- [ ] `401` responses trigger session expiry flow, not silent ignore.
- [ ] Session restoration shows loading state before rendering protected content.
- [ ] Authenticated users hitting `/login` redirect to dashboard (no loop).
- [ ] Redirect-after-login preserves destination URL.
- [ ] Logout clears all auth state before redirecting.
