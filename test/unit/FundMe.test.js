const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config")


!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", () => {
    let fundMe
    let deployer
    let MockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async () => {
      deployer = (await getNamedAccounts()).deployer
      await deployments.fixture(["all"])
      fundMe = await ethers.getContract("FundMe", deployer)
      MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
    })

    describe("constructor", async () => {
      it("sets aggregator address", async () => {
        const response = await fundMe.getPriceFeed()
        assert.equal(response, MockV3Aggregator.address)
      })
    })

    describe("fund", async () => {
      it("fails with not enough ETH", async () => {
        await expect(fundMe.fund()).to.be.revertedWith("You need to spend more ETH!")
      })
      it("updated the amoun funded data structure", async () => {
        await fundMe.fund({ value: sendValue })
        const response = await fundMe.getAddressToAmountFunded(deployer)
        assert.equal(response.toString(), sendValue.toString())
      })
      it("adds funders to array of getFunder", async () => {
        await fundMe.fund({ value: sendValue })
        const funder = await fundMe.getFunder(0)
        assert.equal(funder, deployer)
      })
    })

    describe("withdraw", async () => {
      beforeEach(async () => {
        await fundMe.fund({ value: sendValue })
      })

      it("witfraw ETH from a single founder", async () => {
        const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
        const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

        const transactionResponse = await fundMe.withdraw()
        const transactionReceipt = await transactionResponse.wait(1)
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const gasCost = gasUsed.mul(effectiveGasPrice)

        const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

        assert.equal(endingFundMeBalance, 0)
        assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString())
      })

      it("withdraw with multiple getFunder", async () => {
        const accounts = await ethers.getSigners()
        for (let i = 1; i < 6; i++) {
          const fundMeConnect = await fundMe.connect(accounts[i])
          fundMeConnect.fund({ value: sendValue })
        }

        const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
        const startingDeployerBalance = await fundMe.provider.getBalance(deployer)
        const transactionResponse = await fundMe.withdraw()
        const transactionReceipt = await transactionResponse.wait(1)
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const gasCost = gasUsed.mul(effectiveGasPrice)
        const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

        assert.equal(endingFundMeBalance, 0)
        // assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(), endingDeployerBalance.add(gasCost).toString())

        await expect(fundMe.getFunder(0)).to.be.reverted
        for (let i = 1; i < 6; i++) {
          assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0)
        }
      })
      it("only allows the owner to withdraw", async () => {
        const accounts = await ethers.getSigners()
        const notOwner = accounts[1]
        const notOwnerConnecter = await fundMe.connect(notOwner)
        await expect(notOwnerConnecter.withdraw()).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
      })
    })
  })