import { expect } from "chai";
import { ethers } from "hardhat";

describe("OptionToken", function () {
  const BASE_URI = "https://example.com/{id}.json";

  it("initializes roles and mints/burns positions", async function () {
    const [admin, minter, user] = await ethers.getSigners();

    const OptionToken = await ethers.getContractFactory("OptionToken");
    const optionToken = await OptionToken.deploy(BASE_URI, admin.address);
    await optionToken.waitForDeployment();

    const minterRole = await optionToken.MINTER_ROLE();
    const burnerRole = await optionToken.BURNER_ROLE();
    const uriAdminRole = await optionToken.URI_ADMIN_ROLE();

    expect(await optionToken.hasRole(minterRole, admin.address)).to.equal(true);
    expect(await optionToken.hasRole(burnerRole, admin.address)).to.equal(true);
    expect(await optionToken.hasRole(uriAdminRole, admin.address)).to.equal(true);

    await optionToken.connect(admin).grantRoles(minter.address);
    expect(await optionToken.hasRole(minterRole, minter.address)).to.equal(true);

    const seriesId = 1n;
    await optionToken.connect(minter).mint(user.address, seriesId, 1n, "0x");
    expect(await optionToken.balanceOf(user.address, seriesId)).to.equal(1n);

    await optionToken.connect(minter).burn(user.address, seriesId, 1n);
    expect(await optionToken.balanceOf(user.address, seriesId)).to.equal(0n);
  });
});
