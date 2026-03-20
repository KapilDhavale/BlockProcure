import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES } from '@/config'
import RegistryABI from '@/abis/ProjectRegistry.json'
import MilestoneABI from '@/abis/MilestoneManager.json'
import VaultABI from '@/abis/PaymentVault.json'

export type Contracts = {
    registry: ethers.Contract
    milestone: ethers.Contract
    vault: ethers.Contract
}

export function getContracts(signer: ethers.Signer): Contracts {
    return {
        registry: new ethers.Contract(CONTRACT_ADDRESSES.ProjectRegistry, RegistryABI.abi, signer),
        milestone: new ethers.Contract(CONTRACT_ADDRESSES.MilestoneManager, MilestoneABI.abi, signer),
        vault: new ethers.Contract(CONTRACT_ADDRESSES.PaymentVault, VaultABI.abi, signer),
    }
}

export const STATE_LABELS: Record<number, string> = {
    0: 'PENDING',
    1: 'UNDER REVIEW',
    2: 'APPROVED',
    3: 'PAID',
}
