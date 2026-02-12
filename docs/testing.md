# Filosign Testing Suite

**Comprehensive integration testing** for the complete Filosign platform. The test suite provides end-to-end validation of user journeys, multi-user interactions, and cryptographic operations.

## Overview

The test suite (`test/`) is a React application that simulates real users interacting with the Filosign platform. It provides a side-by-side interface showing two users working through complete document signing workflows.

## Architecture

### **Dual-User Simulation**
```
┌─────────────────┐    ┌─────────────────┐
│   User A        │    │   User B        │
│   (Wallet 1)    │    │   (Wallet 2)    │
│                 │    │                 │
│ • Registration  │    │ • Registration  │
│ • Profile Setup │    │ • Profile Setup │
│ • Sender Approval│   │ • Document Upload│
│ • Document Access│   │ • Sharing       │
│ • Signing       │    │ • Verification  │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────State Sync──────┘
```

### **Test Flow**
1. **Registration**: PIN + wallet authentication
2. **Profile Creation**: Username and basic info
3. **Network Discovery**: Finding other users
4. **Permission Management**: Sender approval workflow
5. **Document Operations**: Upload, share, access
6. **Signature Creation**: PQ signature generation
7. **Verification**: Multi-party document validation

## Setup & Usage

### **Prerequisites**
- Local development environment running (`./scripts/serloc.sh`)
- Bun package manager
- Web browser with WASM support

### **Starting the Test Suite**
```bash
# Terminal 1: Start local environment
./scripts/serloc.sh

# Terminal 2: Start test suite
cd test
bun install
bun run dev
```

### **Test Interface**
The test application provides:
- **Side-by-side UI**: Two user interfaces running simultaneously
- **Step-by-step Testing**: Automated progression through user journeys
- **Real-time State**: Live updates between users
- **Error Handling**: Comprehensive error display and recovery
- **Hook Validation**: Testing all 31 React SDK hooks

## Test Scenarios

### **Authentication Flow**
- User registration with PIN + wallet signature
- Login/logout cycles
- Session persistence
- Authentication state management

### **Profile Management**
- Username creation and validation
- Profile information updates
- Avatar upload and display
- User discovery and search

### **Permission System**
- Sender approval requests
- Permission granting/revocation
- Access control validation
- Network relationship management

### **Document Operations**
- File upload with metadata
- End-to-end encryption
- Multi-recipient sharing
- Access permission checks
- Document acknowledgment

### **Signature Workflow**
- Signature creation (draw/type/upload)
- Visual hash generation
- Dilithium PQ signing
- Signature verification
- Blockchain anchoring

## Technical Details

### **Wallet Configuration**
```typescript
// Two test wallets for simulation
const wallet1 = createWalletClient({
  chain: hardhat,
  account: privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"),
});

const wallet2 = createWalletClient({
  chain: hardhat,
  account: privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"),
});
```

### **WASM Integration**
```typescript
// Dilithium PQ signature library
const { createDilithium } = await import("./dilithium.min.js");
const dilithium = await createDilithium();

// Provided to FilosignProvider
<FilosignProvider wasm={{ dilithium }}>
```

### **State Synchronization**
```typescript
// Separate React Query clients for each user
const queryClient1 = new QueryClient();
const queryClient2 = new QueryClient();

// Manual reload triggers for cross-user state sync
const { reload: reloadOther } = useOtherReload();
```

## Hook Testing Coverage

### **Authentication (7 hooks)**
- ✅ `useIsLoggedIn`, `useIsRegistered`
- ✅ `useLogin`, `useLogout`
- ✅ `useAuthedApi`, `useCryptoSeed`, `useStoredKeygenData`

### **File Management (7 hooks)**
- ✅ `useSentFiles`, `useReceivedFiles`
- ✅ `useSendFile`, `useAckFile`, `useSignFile`
- ✅ `useFileInfo`, `useViewFile`

### **Sharing & Permissions (12 hooks)**
- ✅ `useCanSendTo`, `useCanReceiveFrom`
- ✅ `useSendableTo`, `useReceivableFrom`
- ✅ `useRequestApproval`, `useApproveSender`, `useRevokeSender`
- ✅ `useReceivedRequests`, `useSentRequests`
- ✅ `useRejectRequest`, `useCancelRequest`

### **User Profile (5 hooks)**
- ✅ `useUserProfile`, `useUserProfileByQuery`
- ✅ `useUpdateUserProfile`, `useUpdateUserAvatar`
- ✅ `useUpdateUserProfilePrevalidate`

## Development Workflow

### **Running Tests**
```bash
# Full integration test
cd test && bun run dev

# Individual component testing
# Modify Test.tsx to test specific scenarios
```

### **Adding New Tests**
1. Add test case to `TestName` type
2. Create test component function
3. Add to conditional rendering chain
4. Implement step-by-step validation

### **Debugging**
- **Console Logs**: Extensive logging for each step
- **State Inspection**: Real-time state display
- **Error Boundaries**: Comprehensive error catching
- **Manual Controls**: Ability to restart/reset scenarios

## Integration with CI/CD

### **Automated Testing**
```bash
# Future CI integration
npm run test:integration

# Contract testing
cd packages/contracts && bun run tests

# API testing
cd packages/server && bun run test
```

### **Performance Validation**
- Cryptographic operation timing
- Network request performance
- UI responsiveness metrics
- Memory usage monitoring

## Troubleshooting

### **Common Issues**
- **WASM Loading**: Ensure dilithium.wasm is in public directory
- **Network Connection**: Verify local Hardhat node is running
- **State Sync**: Check React Query client isolation
- **Hook Errors**: Validate API endpoint availability

### **Debug Mode**
```typescript
// Enable debug logging
<FilosignProvider debug={true}>
```

## Future Enhancements

- **Automated Test Scripts**: Headless browser testing
- **Performance Benchmarks**: Cryptographic operation timing
- **Multi-Device Testing**: Mobile and desktop simulation
- **Load Testing**: Multiple concurrent users
- **Regression Testing**: Automated test suite execution

This test suite ensures Filosign maintains reliability and performance across all user interactions and cryptographic operations.