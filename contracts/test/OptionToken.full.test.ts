import { expect } from "chai";
import { ethers } from "hardhat";

describe("OptionToken full coverage", function () {
  async function deployFixture() {
    const [admin, alice, bob, carol] = await ethers.getSigners();
    const OptionToken = await ethers.getContractFactory("OptionToken");
    const token = await OptionToken.deploy("https://base/{id}.json", admin.address);
    await token.waitForDeployment();
    return { admin, alice, bob, carol, token, OptionToken };
  }

  it("rejects zero admin in constructor", async function () {
    const OptionToken = await ethers.getContractFactory("OptionToken");
    await expect(OptionToken.deploy("ipfs://base/{id}.json", ethers.ZeroAddress)).to.be.revertedWithCustomError(
      OptionToken,
      "OptionToken_InvalidAdmin"
    );
  });

  it("assigns roles to admin and supports URI update", async function () {
    const { admin, alice, token } = await deployFixture();

    const minterRole = await token.MINTER_ROLE();
    const burnerRole = await token.BURNER_ROLE();
    const uriRole = await token.URI_ADMIN_ROLE();

    expect(await token.hasRole(minterRole, admin.address)).to.equal(true);
    expect(await token.hasRole(burnerRole, admin.address)).to.equal(true);
    expect(await token.hasRole(uriRole, admin.address)).to.equal(true);

    await expect(token.connect(alice).setBaseURI("https://new/{id}.json")).to.be.revertedWithCustomError(
      token,
      "AccessControlUnauthorizedAccount"
    );

    await expect(token.connect(admin).setBaseURI("https://new/{id}.json"))
      .to.emit(token, "BaseURIUpdated")
      .withArgs("https://new/{id}.json");
  });

  it("grants and revokes mint/burn roles correctly", async function () {
    const { admin, alice, token } = await deployFixture();
    const minterRole = await token.MINTER_ROLE();
    const burnerRole = await token.BURNER_ROLE();

    await expect(token.connect(alice).grantRoles(alice.address)).to.be.revertedWithCustomError(
      token,
      "AccessControlUnauthorizedAccount"
    );

    await token.connect(admin).grantRoles(alice.address);
    expect(await token.hasRole(minterRole, alice.address)).to.equal(true);
    expect(await token.hasRole(burnerRole, alice.address)).to.equal(true);

    await token.connect(admin).revokeRoles(alice.address);
    expect(await token.hasRole(minterRole, alice.address)).to.equal(false);
    expect(await token.hasRole(burnerRole, alice.address)).to.equal(false);
  });

  it("enforces mint/burn permissions for single and batch operations", async function () {
    const { admin, alice, bob, token } = await deployFixture();
    const minterRole = await token.MINTER_ROLE();
    const burnerRole = await token.BURNER_ROLE();

    await token.connect(admin).grantRoles(alice.address);
    expect(await token.hasRole(minterRole, alice.address)).to.equal(true);
    expect(await token.hasRole(burnerRole, alice.address)).to.equal(true);

    const seriesId = 1n;
    await token.connect(alice).mint(bob.address, seriesId, 3n, "0x");
    expect(await token.balanceOf(bob.address, seriesId)).to.equal(3n);

    await expect(token.connect(bob).mint(bob.address, seriesId, 1n, "0x")).to.be.revertedWithCustomError(
      token,
      "AccessControlUnauthorizedAccount"
    );

    await token.connect(alice).burn(bob.address, seriesId, 1n);
    expect(await token.balanceOf(bob.address, seriesId)).to.equal(2n);

    await expect(token.connect(bob).burn(bob.address, seriesId, 1n)).to.be.revertedWithCustomError(
      token,
      "AccessControlUnauthorizedAccount"
    );

    const ids = [2n, 3n];
    const amounts = [5n, 7n];
    await token.connect(alice).mintBatch(bob.address, ids, amounts, "0x");
    expect(await token.balanceOf(bob.address, ids[0])).to.equal(5n);
    expect(await token.balanceOf(bob.address, ids[1])).to.equal(7n);

    await token.connect(alice).burnBatch(bob.address, ids, [2n, 3n]);
    expect(await token.balanceOf(bob.address, ids[0])).to.equal(3n);
    expect(await token.balanceOf(bob.address, ids[1])).to.equal(4n);
  });

  it("reports supported interfaces", async function () {
    const { token } = await deployFixture();
    const ierc1155 = "0xd9b67a26" as const;
    const iaccess = "0x7965db0b" as const;
    expect(await token.supportsInterface(ierc1155)).to.equal(true);
    expect(await token.supportsInterface(iaccess)).to.equal(true);
  });
});
