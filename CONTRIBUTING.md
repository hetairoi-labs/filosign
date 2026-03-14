# Contributing to Filosign

Thank you for your interest in contributing to Filosign. This guide covers development setup, contribution workflow, and project structure.

## 🚀 Development Setup

### Prerequisites
- **Bun** >= 1.0.0 (JavaScript runtime and package manager)
- **Web3 wallet** (e.g. MetaMask, Coinbase Wallet) for signing and testnet
- **Filecoin Calibration testnet** for contract and integration testing (use a testnet faucet if you need test FIL)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/filosign-dapp/client.git
cd client

# Install dependencies
bun install

# Start full local stack (blockchain, API server, client with hot reload)
./scripts/serloc.sh
```

To run the integration test app in a separate terminal: `cd test && bun run dev`

### Individual Services
Run these only when you need a single service instead of the full stack:
```bash
# API server
bun run server:start

# React client
bun run dev

# Local blockchain node
cd packages/contracts && bunx hardhat node

# Contract deployment
cd packages/contracts && bun run migrate:local
```

### Production Deployment
```bash
# Deploy to production with PM2
./scripts/deploy.sh
```

## 📁 Project Structure

```
filosign/
├── packages/
│   ├── client/              # Main React application
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components (shadcn/ui)
│   │   │   ├── pages/       # Route-based page components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utilities and configurations
│   │   │   └── types/       # TypeScript type definitions
│   │   └── public/          # Static assets
│   ├── server/              # Hono API backend
│   │   ├── api/routes/      # REST API endpoints
│   │   ├── lib/db/          # Database schemas & queries
│   │   └── scripts/         # Database migrations
│   ├── contracts/           # Solidity FVM contracts
│   │   ├── src/             # Smart contract source
│   │   └── test/            # Contract unit tests
│   ├── lib/
│   │   ├── crypto-utils/    # WebAssembly post-quantum cryptography
│   │   ├── react-sdk/       # TypeScript client library
│   │   └── shared/          # Common utilities
│   └── test/                # Integration test suite
│       └── src/             # End-to-end user journey tests
├── test/                    # Standalone integration tests
│   ├── src/                 # Dual-user simulation app
│   └── public/              # WASM assets
├── scripts/                 # Development & deployment scripts
│   ├── deploy.sh            # Production deployment
│   └── serloc.sh            # Local development environment
└── docs/                    # Documentation
```

## 🛠️ Development Guidelines

### Code Style
- **Components**: Follow shadcn/ui patterns; use TypeScript
- **Icons**: Use `@phosphor-icons/react` (e.g. `BellIcon`, `MoonIcon`)
- **Styling**: Use the design tokens and variables in `globals.css`
- **State**: Use Zustand for app-wide state; avoid React Context for global state
- **Forms**: React Hook Form with Zod for validation
- **Linting**: Biome for formatting and linting; run `bun check` before pushing

### Tech Stack
```typescript
// Frontend
React 19 + TypeScript 5.x
Zustand (state management)
React Hook Form + Zod (forms)
Radix UI + Tailwind CSS (components)
TanStack Router (routing)

// Backend
Hono + TypeScript
Drizzle ORM + LibSQL
JWT authentication

// Blockchain
Solidity + Hardhat
Filecoin FVM contracts
Viem + WAGMI

// Cryptography
WebAssembly post-quantum (Kyber/ML-KEM-1024 + Dilithium)
```

### Filecoin Integration
- **Synapse SDK**: Filecoin network calls (storage, retrieval)
- **Filecoin Warm Storage**: Decentralized document storage
- **FilCDN**: Document retrieval
- **Filecoin Pay**: Subscriptions (USDFC)
- **FVM contracts**: On-chain document registry (Filecoin Virtual Machine)

## 🤝 Contributing Workflow

### 1. Choose an Issue
- Browse [GitHub Issues](https://github.com/filosign-dapp/client/issues) for open work
- Prefer issues labeled `good first issue` or `help wanted`
- Comment on the issue to claim it and avoid duplicate work

### 2. Development Process
```bash
# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes (see Development Guidelines and Testing sections)
# Run tests: see "Testing" below for integration, contract, and API test commands

# Commit with clear, descriptive messages
git commit -m "feat: add amazing feature

- Implement feature X
- Add tests for feature X
- Update documentation"

# Push your branch
git push origin feature/amazing-feature
```

### 3. Pull Request
- Open a PR with a clear title and description
- Reference the issue (e.g. "Closes #123")
- Wait for CI to pass; fix any failures
- Assign or tag a maintainer for review

### 4. Code Review
- Respond to review comments and push updates
- A maintainer will merge your PR after approval

## 🧪 Testing

### Integration Test Suite (`test/`)
Simulates real user interactions:

```bash
# Start the integration test suite
cd test && bun run dev
```

**What it does:**
- **Dual-user view**: Two users side by side
- **End-to-end flows**: Registration through signing
- **Live sync**: State stays in sync between the two users
- **SDK hooks**: Exercises the React SDK hooks used by the app

### Contract Testing
```bash
# Run smart contract tests
cd packages/contracts && bun run tests
```

### API Testing
```bash
# Test backend endpoints
cd packages/server && bun run test
```

## 📋 Current Status & Roadmap

### ✅ Completed (Phase 1-2)
- **Live Frontend UI**: Complete user interface with mock interactions
- **Core Smart Contracts**: Deployed on Filecoin Calibration testnet
- **Encryption SDK**: WebAssembly cryptographic utilities
- **Client Library**: Backend integration and API layer
- **Wallet Integration**: Privy-powered Web3 onboarding
- **Document Management**: Upload, annotation, and signature placement

### 🚧 In Progress (Phase 3)
- **Full-Stack Integration**: Connect frontend with contracts and backend
- **Filecoin Storage**: Implement Synapse SDK and FilCDN integration
- **Payment System**: Filecoin Pay subscription management
- **User Testing**: Gather feedback and iterate on UX

### 🔮 Future Roadmap (Phase 4+)
- **Enterprise Features**: Team management, multi-sig, audit logs
- **API Platform**: REST API and webhook integrations
- **Mobile Apps**: React Native iOS/Android applications
- **Compliance**: SOC 2, GDPR, ISO certifications
- **Mainnet Launch**: Production deployment on Filecoin mainnet

## 📚 Resources

### Documentation
- **[🔐 Cryptography Guide](docs/cryptography.md)**: Post-quantum crypto implementation
- **[🏗️ Architecture Overview](docs/architecture.md)**: System design and data flow
- **[⚙️ SDK Reference](docs/sdk.md)**: React hooks and API documentation
- **[🧪 Testing Guide](docs/testing.md)**: Integration test suite usage

### Learning Resources
- **[📹 Demo Video](https://www.loom.com/share/8e142c8bb06f43edb0a18162222f96f8)**: Complete workflow walkthrough
- **[🌐 Website](https://app.filosign.xyz)**: Live application
- **[📖 Filecoin Docs](https://docs.filecoin.io/)**: Filecoin network documentation

### Community
- **[🐛 Issue Tracker](https://github.com/filosign-dapp/client/issues)**: Bug reports and feature requests
- **[💬 Discord](https://discord.gg/filosign)**: Community discussions
- **[🐦 Twitter](https://twitter.com/filosign)**: Updates and announcements

## 🙏 Code of Conduct

We aim to keep the project welcoming and inclusive. Please:

- Be respectful and inclusive in all interactions
- Give constructive feedback and collaborate in good faith
- Help newcomers get started
- Report unacceptable behavior to maintainers (e.g. via the [issue tracker](https://github.com/filosign-dapp/client/issues) or [Discord](https://discord.gg/filosign))

## 📄 License

By contributing to Filosign, you agree that your contributions will be licensed under the **AGPL-3.0-or-later** license.
