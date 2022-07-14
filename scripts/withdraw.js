const { ethers, getNamedAccounts } = require("hardhat")

main = async () => {
  const { deployer } = await getNamedAccounts()
  const fundMe = await ethers.getContract("FundMe", deployer)
  console.log("Funding contract .....")
  const transactionResponse = await fundMe.withdraw()
  await transactionResponse.wait(1)
  console.log("Got money back")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })