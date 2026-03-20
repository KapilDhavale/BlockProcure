module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log("-----------------------------------------");
        console.log("Account:", accounts[0]);
        const balance = await web3.eth.getBalance(accounts[0]);
        console.log("Balance:", web3.utils.fromWei(balance, "ether"), "MATIC");
        console.log("-----------------------------------------");
        process.exit(0);
    } catch (e) {
        console.error("Error connecting to RPC:", e.message);
        process.exit(1);
    }
};
