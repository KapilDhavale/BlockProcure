// migrations/2_deploy_contracts.js
// Run: truffle migrate --reset --network development

const fs   = require('fs')
const path = require('path')

const ProjectRegistry  = artifacts.require('ProjectRegistry')
const MilestoneManager = artifacts.require('MilestoneManager')
const PaymentVault     = artifacts.require('PaymentVault')

module.exports = async function (deployer, network, accounts) {

  console.log('\n========================================')
  console.log('  BlockProcure — Deploying Contracts')
  console.log('  Network:', network)
  console.log('  Deployer:', accounts[0])
  console.log('========================================\n')

  // 1. ProjectRegistry — no constructor args
  await deployer.deploy(ProjectRegistry)
  const registry = await ProjectRegistry.deployed()
  console.log('✓ ProjectRegistry deployed at:', registry.address)

  // 2. MilestoneManager — needs registry address
  await deployer.deploy(MilestoneManager, registry.address)
  const milestone = await MilestoneManager.deployed()
  console.log('✓ MilestoneManager deployed at:', milestone.address)

  // 3. PaymentVault — needs registry + milestone addresses
  await deployer.deploy(PaymentVault, registry.address, milestone.address)
  const vault = await PaymentVault.deployed()
  console.log('✓ PaymentVault deployed at:', vault.address)

  // 4. Write ONLY the three addresses — no extra fields that break TS imports
  const addresses = {
    ProjectRegistry:  registry.address,
    MilestoneManager: milestone.address,
    PaymentVault:     vault.address,
  }

  // Writes to src/deployed-addresses.json (same folder as config.ts)
  const outFile = path.resolve(__dirname, '../client/src/deployed_addresses.json')
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2))

  console.log('\n========================================')
  console.log('  ProjectRegistry  :', registry.address)
  console.log('  MilestoneManager :', milestone.address)
  console.log('  PaymentVault     :', vault.address)
  console.log('========================================')
  console.log('✓ Written to src/deployed-addresses.json')
  console.log('  Refresh your browser — no manual edits needed.\n')
}