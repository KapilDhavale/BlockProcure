# BlockProcure

> Blockchain-based procurement and milestone payment system on Polygon PoS.  
> Built for NEXUS 2026 Hackathon — Vivekanand Education Society Institute of Technology.
## 🎥 Project Demo

👉 [Watch Demo Video](https://drive.google.com/file/d/1wx-pX9hYNLGSLBzvGkOxiYgvKDF_J0iz/view)
---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Deploying to Polygon Amoy](#deploying-to-polygon-amoy)
- [Verifying Contracts on Polygonscan](#verifying-contracts-on-polygonscan)
- [Frontend Setup](#frontend-setup)
- [Demo Walkthrough](#demo-walkthrough)
- [Roles and Accounts](#roles-and-accounts)
- [Smart Contract API Reference](#smart-contract-api-reference)
- [Test Suite](#test-suite)
- [Known Issues](#known-issues)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

BlockProcure replaces manual, opaque infrastructure procurement processes with tamper-proof smart contracts on Polygon. Funds are locked in an on-chain escrow vault and released automatically only after verified milestone approvals from multiple independent inspectors.

Every invoice, quality certificate, and inspection report is stored as a cryptographic hash — making document manipulation instantly detectable. Regulators get real-time, publicly verifiable audit access without trusting any single party.

**Live deployment:** Polygon Amoy Testnet  
**Explorer:** https://amoy.polygonscan.com

---

## The Problem

Government infrastructure projects suffer from:

- **Inflated invoices** — material costs marked up with no verification
- **Duplicate billing** — same invoice submitted multiple times across projects
- **Ghost milestones** — payments released for work never completed
- **Substandard materials** — quality certificates forged or unverified
- **No audit trail** — records kept manually, alterable by the same parties who benefit

India's CAG reports consistently flag 30–40% cost overruns in infrastructure projects, with centralized and manually maintained records making post-facto audits nearly impossible.

---

## How It Works

```
Government creates project
    ↓ locks funds in PaymentVault escrow
Supplier logs invoice hashes (duplicate detection)
    ↓
Contractor submits milestone claim with evidence hash
    ↓
Inspector A signs approval on-chain
Inspector B signs approval on-chain  ← M-of-N threshold met
    ↓
PaymentVault auto-releases MATIC to contractor
    ↓
Regulator reads full audit trail from on-chain events
```

Payment is **mathematically impossible** to release without the required number of independent inspector signatures. No human intermediary can intervene.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Stakeholders                          │
│  Government  Supplier  Contractor  Inspector  Regulator  │
└──────────────────────┬──────────────────────────────────┘
                       │ Web3 / MetaMask
┌──────────────────────▼──────────────────────────────────┐
│              React Frontend (ethers.js v5)               │
│  GovPanel  ContractorPanel  InspectorPanel  AuditPanel   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Polygon PoS — Amoy Testnet                  │
│                                                          │
│  ProjectRegistry.sol    MilestoneManager.sol             │
│  ├─ createProject()     ├─ createMilestone()             │
│  ├─ assignRole()        ├─ submitClaim()                 │
│  └─ getProject()        ├─ approve() [M-of-N]            │
│                         └─ getMilestoneState()           │
│                                                          │
│  PaymentVault.sol                                        │
│  ├─ lockFunds()                                          │
│  ├─ logInvoice() [duplicate detection]                   │
│  └─ release() [conditional, nonReentrant]                │
└─────────────────────────────────────────────────────────┘
```

---

## Smart Contracts

### ProjectRegistry.sol
Stores all project metadata, stakeholder addresses, and role assignments. Immutable after creation — no admin can retroactively change project parameters.

| Function | Access | Description |
|---|---|---|
| `createProject()` | Any | Creates a project, assigns roles, sets M-of-N threshold |
| `assignRole()` | Government | Assigns SUPPLIER or other roles post-creation |
| `getProject()` | Public | Returns full project struct |
| `getInspectors()` | Public | Returns inspector address array |

### MilestoneManager.sol
Manages the full milestone lifecycle with a strict state machine.

**States:** `PENDING → UNDER_REVIEW → APPROVED → PAID`

| Function | Access | Description |
|---|---|---|
| `createMilestone()` | Government | Creates milestone with description and budget |
| `submitClaim()` | Contractor | Moves milestone to UNDER_REVIEW with evidence hash |
| `approve()` | Inspector | Signs approval — emits APPROVED when threshold met |
| `getMilestoneState()` | Public | Returns current state enum |
| `getMilestoneAmount()` | Public | Returns allocated amount in wei |

### PaymentVault.sol
Holds escrow funds. Releases payment only after `MilestoneManager` emits an APPROVED state. Includes reentrancy protection.

| Function | Access | Description |
|---|---|---|
| `lockFunds()` | Government | Locks MATIC in escrow for a project |
| `logInvoice()` | Supplier | Stores invoice hash, rejects duplicates |
| `release()` | Any | Releases payment if milestone is APPROVED |
| `getBalance()` | Public | Returns vault MATIC balance |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.20 |
| Contract Framework | Truffle v5 |
| Contract Libraries | OpenZeppelin (Ownable, ReentrancyGuard) |
| Blockchain | Polygon PoS — Amoy Testnet |
| Frontend | React + TypeScript + Vite |
| Web3 Library | ethers.js v5 |
| Wallet | MetaMask |
| Styling | Tailwind CSS |
| Notifications | Sonner |
| Icons | Lucide React |

---

## Project Structure

```
blockprocure/
│
├── contracts/
│   ├── Migrations.sol
│   ├── ProjectRegistry.sol
│   ├── MilestoneManager.sol
│   └── PaymentVault.sol
│
├── migrations/
│   ├── 1_initial_migration.js
│   └── 2_deploy_contracts.js
│
├── scripts/
│   └── deploy_ethers.js          ← recommended deploy script
│
├── test/
│   └── procurement.test.js       ← full test suite (24 cases)
│
├── build/
│   └── contracts/                ← auto-generated ABIs after compile
│
├── client/                       ← React frontend
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── config.ts             ← contract addresses go here
│       ├── lib/
│       │   └── contracts.ts      ← ethers contract instances
│       ├── components/
│       │   ├── layout/
│       │   │   ├── TopBar.tsx
│       │   │   └── Sidebar.tsx
│       │   ├── panels/
│       │   │   ├── DashboardPanel.tsx
│       │   │   ├── GovPanel.tsx
│       │   │   ├── ContractorPanel.tsx
│       │   │   ├── InspectorPanel.tsx
│       │   │   └── AuditPanel.tsx
│       │   └── shared/
│       │       └── StatusBadge.tsx
│       └── index.css
│
├── .env                          ← never commit this
├── .gitignore
├── truffle-config.js
└── package.json
```

---

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- MetaMask browser extension
- Git

Check versions:
```bash
node --version   # v18.x or higher
npm --version    # 9.x or higher
```

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/blockprocure.git
cd blockprocure

# Install contract dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
MNEMONIC="your twelve word wallet seed phrase here"
ALCHEMY_KEY="https://polygon-amoy.g.alchemy.com/v2/your_key_here"
POLYGONSCAN_API_KEY="your_polygonscan_api_key"
```

**Getting each value:**

| Variable | Where to get it |
|---|---|
| `MNEMONIC` | MetaMask → Settings → Security → Reveal Secret Recovery Phrase |
| `ALCHEMY_KEY` | https://dashboard.alchemy.com → Create App → Polygon Amoy → View Key → HTTPS URL |
| `POLYGONSCAN_API_KEY` | https://amoy.polygonscan.com → Sign in → API Keys → Add |

> **Never commit `.env` to git.** It is already in `.gitignore`.

---

## Running Locally

### Step 1 — Start Ganache

```bash
# Install Ganache globally if not already installed
npm install -g ganache

# Start with deterministic accounts
ganache --port 7545 --deterministic
```

### Step 2 — Compile contracts

```bash
npx truffle compile
```

### Step 3 — Deploy to local Ganache

```bash
npx truffle migrate --network development --reset
```

Note the deployed addresses from the output. Paste them into `client/src/config.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  ProjectRegistry:  "0x...",
  MilestoneManager: "0x...",
  PaymentVault:     "0x...",
};
```

### Step 4 — Copy ABIs to frontend

```bash
cp build/contracts/ProjectRegistry.json client/src/abis/
cp build/contracts/MilestoneManager.json client/src/abis/
cp build/contracts/PaymentVault.json client/src/abis/
```

### Step 5 — Start the frontend

```bash
cd client
npm run dev
```

Open http://localhost:5173 and connect MetaMask to `localhost:7545`.

---

## Deploying to Polygon Amoy

### Step 1 — Get test MATIC

You need at least 0.5 POL. Get it from:
- https://faucet.polygon.technology
- Polygon Discord `#faucet` channel — type `!drip YOUR_ADDRESS`

Check balance:
```
https://amoy.polygonscan.com/address/YOUR_ADDRESS
```

### Step 2 — Deploy using the ethers script

The recommended deploy method bypasses Truffle's receipt polling issues:

```bash
node scripts/deploy_ethers.js
```

You will see output like:
```
Deployer: 0x25E6...
Balance: 5.1 MATIC

Deploying ProjectRegistry...
Tx hash: 0x...
ProjectRegistry: 0xABC...

Deploying MilestoneManager...
Tx hash: 0x...
MilestoneManager: 0xDEF...

Deploying PaymentVault...
Tx hash: 0x...
PaymentVault: 0x123...

========================================
Paste into client/src/config.ts:
========================================
export const CONTRACT_ADDRESSES = {
  ProjectRegistry:  "0xABC...",
  MilestoneManager: "0xDEF...",
  PaymentVault:     "0x123...",
};
```

### Step 3 — Update config.ts

Paste the addresses from the output into `client/src/config.ts`.

### Step 4 — Add Polygon Amoy to MetaMask

| Field | Value |
|---|---|
| Network name | Polygon Amoy |
| RPC URL | https://rpc-amoy.polygon.technology |
| Chain ID | 80002 |
| Symbol | POL |
| Explorer | https://amoy.polygonscan.com |

---

## Verifying Contracts on Polygonscan

Verification makes your source code publicly readable on the explorer — important for the demo.

```bash
npx truffle run verify ProjectRegistry MilestoneManager PaymentVault --network amoy
```

After verification, anyone can read your Solidity source at:
```
https://amoy.polygonscan.com/address/CONTRACT_ADDRESS#code
```

---

## Frontend Setup

The React frontend auto-detects the connected MetaMask account and shows the appropriate panel. Switch MetaMask accounts to act as different roles.

**Add Amoy network to MetaMask** — the app will prompt you automatically on connect if you're on the wrong network.

**Build for production:**
```bash
cd client
npm run build
```

**Deploy frontend (optional):**
```bash
cd client
npx vercel --prod
# or
npx netlify deploy --prod --dir=dist
```

---

## Demo Walkthrough

Run through these steps in order during a live demo. Have 4 MetaMask accounts ready — Government, Contractor, Inspector A, Inspector B.

| Step | Account | Action | What to show |
|---|---|---|---|
| 1 | Government | Create project + lock 1 POL | Transaction on Polygonscan |
| 2 | Government | Create milestone M1 (0.5 POL) | Milestone in PENDING state |
| 3 | Government | Assign supplier role | Role assignment tx |
| 4 | Supplier | Log invoice hash | Show duplicate rejection on 2nd attempt |
| 5 | Contractor | Submit milestone claim | State → UNDER_REVIEW |
| 6 | Inspector A | Approve — approval count = 1 | State still UNDER_REVIEW |
| 7 | Inspector B | Approve — approval count = 2 | State → APPROVED, payment fires |
| 8 | Any | Open Audit Log | Full event history on-chain |
| 9 | Browser | Open Polygonscan | Show live transaction to contractor |

**Key lines to say:**
- *"The payment released automatically. No finance department. No approval email."*
- *"This duplicate invoice was blocked at submission — not discovered months later in an audit."*
- *"Every inspector's signature is permanent. If they colluded, we know exactly who and when."*

---

## Roles and Accounts

Derive all demo accounts from your mnemonic:

```bash
node -e "
const ethers = require('ethers');
const mnemonic = 'YOUR_MNEMONIC_HERE';
const roles = ['Government', 'Contractor', 'Inspector A', 'Inspector B', 'Supplier'];
for (let i = 0; i < 5; i++) {
  const path = \`m/44'/60'/0'/0/\${i}\`;
  const w = ethers.Wallet.fromMnemonic(mnemonic, path);
  console.log(\`\${roles[i].padEnd(12)}: \${w.address}\`);
}
"
```

Import each address into MetaMask using the same mnemonic. Switch accounts to act as different roles during the demo.

| Account index | Role | Can do |
|---|---|---|
| accounts[0] | Government | createProject, lockFunds, createMilestone, assignRole |
| accounts[1] | Contractor | submitClaim |
| accounts[2] | Inspector A | approve |
| accounts[3] | Inspector B | approve |
| accounts[4] | Supplier | logInvoice |

---

## Smart Contract API Reference

### Role enum (ProjectRegistry)

```solidity
enum Role { NONE, GOVERNMENT, CONTRACTOR, INSPECTOR, SUPPLIER }
// Values: 0, 1, 2, 3, 4
```

### Milestone state enum (MilestoneManager)

```solidity
enum State { PENDING, UNDER_REVIEW, APPROVED, PAID }
// Values: 0, 1, 2, 3
```

### Key events

```solidity
// ProjectRegistry
event ProjectCreated(uint indexed projectId, string name, uint budget, address contractor);
event RoleAssigned(uint indexed projectId, address account, Role role);

// MilestoneManager
event MilestoneCreated(uint indexed projectId, uint indexed milestoneId, uint amount);
event ClaimSubmitted(uint indexed projectId, uint indexed milestoneId, bytes32 evidenceHash);
event InspectorApproved(uint indexed projectId, uint indexed milestoneId, address inspector, bytes32 reportHash);
event MilestoneApproved(uint indexed projectId, uint indexed milestoneId);

// PaymentVault
event FundsLocked(uint indexed projectId, uint amount);
event InvoiceLogged(uint indexed projectId, bytes32 invoiceHash, address supplier);
event PaymentReleased(uint indexed projectId, uint indexed milestoneId, address contractor, uint amount);
```

---

## Test Suite

Run the full test suite:

```bash
# Start Ganache first
ganache --port 7545 --deterministic

# Run tests
npx truffle test --network development
```

**24 test cases across 7 sections:**

| Section | Tests |
|---|---|
| ProjectRegistry | Project creation, role assignment, access control |
| PaymentVault — fund locking | Lock funds, balance check, access control |
| PaymentVault — invoice logging | Log invoice, duplicate rejection, wrong role |
| MilestoneManager — creation | Create milestone, initial state, access control |
| MilestoneManager — claims | Submit claim, state transition, double claim |
| MilestoneManager — approvals | M-of-N flow, double approval, wrong role |
| PaymentVault — release | Auto-release, PAID state, double release protection |

---

## Known Issues

| Issue | Cause | Workaround |
|---|---|---|
| Truffle migration ETIMEDOUT | `web3-provider-engine` polling bug | Use `scripts/deploy_ethers.js` instead |
| Truffle 429 on WebSocket | Infura free tier rate limit | Use HTTP RPC or Alchemy endpoint |
| MetaMask nonce mismatch after reset | Stale nonce from previous deploys | MetaMask → Settings → Advanced → Reset Account |

---

## Roadmap

**Phase 2 (post-hackathon):**
- Chainlink price oracles for automatic invoice price validation against market rates
- Ethereum L1 anchoring for permanent milestone checkpoint proofs
- DisputeResolver contract — any stakeholder can freeze payments and trigger governance vote
- IPFS document upload with Filecoin long-term storage
- Mobile app for field inspectors

**Phase 3:**
- Multi-government deployment with shared inspector registry
- Integration with GeM (Government e-Marketplace) procurement data
- ZK proof for inspector identity without revealing personal information

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built in 24 hours at NEXUS 2026 — Vivekanand Education Society Institute of Technology.*  
*"We replaced a corrupt middleman with 47 lines of Solidity."*