const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NuvoLockUpgradeable - Locking and Unlocking Tokens", function () {
  let nuvoLock, nuvoToken, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock NuvoToken
    const MockNuvoToken = await ethers.getContractFactory("MockNuvoToken");
    nuvoToken = await MockNuvoToken.deploy();
    await nuvoToken.deployed();

    // Deploy NuvoLockUpgradeable
    const NuvoLockUpgradeable = await ethers.getContractFactory("NuvoLockUpgradeable");
    nuvoLock = await upgrades.deployProxy(NuvoLockUpgradeable, [nuvoToken.address, owner.address, owner.address], { initializer: "initialize" });
    await nuvoLock.deployed();

    // Mint tokens and approve transfer
    await nuvoToken.mint(addr1.address, ethers.utils.parseUnits("1000", 18));
    await nuvoToken.connect(addr1).approve(nuvoLock.address, ethers.utils.parseUnits("1000", 18));

    await nuvoToken.mint(addr2.address, ethers.utils.parseUnits("1000", 18));
    await nuvoToken.connect(addr2).approve(nuvoLock.address, ethers.utils.parseUnits("1000", 18));
  });

  it("Should allow locking of tokens for a specified period", async function () {
    const lockAmount = ethers.utils.parseUnits("100", 18);
    const lockPeriod = 7 * 24 * 60 * 60; // 1 week

    await expect(nuvoLock.connect(addr1).lock(lockAmount, lockPeriod))
      .to.emit(nuvoLock, "Locked")
      .withArgs(addr1.address, lockAmount, (await ethers.provider.getBlock("latest")).timestamp + lockPeriod);

    const lockInfo = await nuvoLock.getLockInfo(addr1.address);
    expect(lockInfo.amount).to.equal(lockAmount);
    expect(lockInfo.unlockTime).to.be.gt(0);
    expect(lockInfo.originalLockTime).to.equal(lockPeriod);
  });

  it("Should revert if trying to lock tokens with a period shorter than the minimum", async function () {
    const lockAmount = ethers.utils.parseUnits("100", 18);
    const shortLockPeriod = 3 * 24 * 60 * 60; // 3 days, assuming minLockPeriod is 7 days

    await expect(nuvoLock.connect(addr1).lock(lockAmount, shortLockPeriod))
      .to.be.revertedWith("Lock period is too short");
  });

  it("Should revert if trying to lock an amount of zero", async function () {
    const lockAmount = 0;
    const lockPeriod = 7 * 24 * 60 * 60; // 1 week

    await expect(nuvoLock.connect(addr1).lock(lockAmount, lockPeriod))
      .to.be.revertedWith("Amount must be greater than 0");
  });

  it("Should revert if trying to lock tokens when already locked", async function () {
    const lockAmount = ethers.utils.parseUnits("100", 18);
    const lockPeriod = 7 * 24 * 60 * 60; // 1 week

    await nuvoLock.connect(addr1).lock(lockAmount, lockPeriod);

    await expect(nuvoLock.connect(addr1).lock(lockAmount, lockPeriod))
      .to.be.revertedWith("Already locked");
  });

  it("Should allow unlocking of tokens after the lock period", async function () {
    const lockAmount = ethers.utils.parseUnits("100", 18);
    const lockPeriod = 7 * 24 * 60 * 60; // 1 week

    await nuvoLock.connect(addr1).lock(lockAmount, lockPeriod);

    // Simulate time passing
    await ethers.provider.send("evm_increaseTime", [lockPeriod]);
    await ethers.provider.send("evm_mine");

    await expect(nuvoLock.connect(addr1).unlock())
      .to.emit(nuvoLock, "Unlocked")
      .withArgs(addr1.address, lockAmount);

    const lockInfo = await nuvoLock.getLockInfo(addr1.address);
    expect(lockInfo.amount).to.equal(0);

    const finalBalance = await nuvoToken.balanceOf(addr1.address);
    expect(finalBalance).to.equal(ethers.utils.parseUnits("1000", 18));
  });

  it("Should revert if trying to unlock tokens before the lock period ends", async function () {
    const lockAmount = ethers.utils.parseUnits("100", 18);
    const lockPeriod = 7 * 24 * 60 * 60; // 1 week

    await nuvoLock.connect(addr1).lock(lockAmount, lockPeriod);

    // Simulate time passing but not enough
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60]); // 3 days
    await ethers.provider.send("evm_mine");

    await expect(nuvoLock.connect(addr1).unlock())
      .to.be.revertedWith("Tokens are still locked");
  });
});
