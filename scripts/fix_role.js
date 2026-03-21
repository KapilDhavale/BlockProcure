const ProjectRegistry = artifacts.require("ProjectRegistry");

module.exports = async function (callback) {
    try {
        const reg = await ProjectRegistry.deployed();
        const gov = (await web3.eth.getAccounts())[0];

        // Addresses being used in your MetaMask demo
        const insp1 = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b";
        const insp2 = "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d";

        console.log("Fixing Roles for Project ID 1...");

        // Role.INSPECTOR = 3
        await reg.assignRole(1, insp1, 3, { from: gov });
        console.log("✓ Inspector 1 assigned: " + insp1);

        await reg.assignRole(1, insp2, 3, { from: gov });
        console.log("✓ Inspector 2 assigned: " + insp2);

        console.log("\nAll roles verified! You should now be able to approve in the UI.");

        callback();
    } catch (err) {
        console.error("\n✗ Failed to assign role:", err.message);
        callback(err);
    }
};
