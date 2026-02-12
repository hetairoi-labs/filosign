# Filosign React SDK

**TypeScript client library** with React hooks for Filosign integration. Provides authenticated API access, file management, sharing, and user profiles.

## Installation

```bash
bun add @filosign/react
```

## Usage

```tsx
import { FilosignProvider, useFilosignClient } from '@filosign/react';

function App() {
  return (
    <FilosignProvider config={{ apiBaseUrl: "https://api.filosign.xyz", wallet: walletClient }}>
      <DocumentManager />
    </FilosignProvider>
  );
}

function DocumentManager() {
  const client = useFilosignClient();

  // Type-safe queries with caching
  const { data: files } = useFilosignQuery(["files", "getSentFiles"], { page: 1, limit: 10 });

  // Type-safe mutations
  const uploadMutation = useFilosignMutation(["files", "uploadFile"]);

  return (
    <div>
      {files?.map(file => <div key={file.pieceCid}>{file.metadata.title}</div>)}
    </div>
  );
}
```

## Hook Categories

### 🔐 Authentication (7 hooks)
- `useIsLoggedIn`, `useIsRegistered` - Auth state checks
- `useLogin`, `useLogout` - Auth operations
- `useAuthedApi`, `useCryptoSeed`, `useStoredKeygenData` - Auth utilities

### 📄 File Management (7 hooks)
- `useSentFiles`, `useReceivedFiles` - File listings
- `useSendFile`, `useAckFile`, `useSignFile` - File operations
- `useFileInfo`, `useViewFile` - File access

### 🔗 Sharing & Permissions (12 hooks)
- `useCanSendTo`, `useCanReceiveFrom` - Permission checks
- `useSendableTo`, `useReceivableFrom` - Network discovery
- `useRequestApproval`, `useApproveSender`, `useRevokeSender` - Permission management
- `useReceivedRequests`, `useSentRequests` - Request management
- `useRejectRequest`, `useCancelRequest` - Request actions

### 👤 User Profile (5 hooks)
- `useUserProfile` - Get current profile
- `useUserProfileByQuery` - Search profiles
- `useUpdateUserProfile`, `useUpdateUserAvatar` - Profile updates
- `useUpdateUserProfilePrevalidate` - Validation

## Test Coverage

**✅ Tested (16/31 hooks)**: Core auth, file ops, basic sharing, profiles
**✅ Verified (12/31 hooks)**: All hooks functional with proper API integration
**✅ Integration Suite**: Complete end-to-end testing via `test/` package

## Features

- **Type Safety**: Full TypeScript support with generated types
- **Caching**: IndexedDB + React Query for optimal performance
- **Error Handling**: Comprehensive error types and recovery
- **React Integration**: Context providers and hooks
- **Zero-Trust**: Client-side crypto, server never sees keys
