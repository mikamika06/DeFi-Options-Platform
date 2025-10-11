// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OptionToken
 * @notice ERC-1155 token representing option positions identified by series ID.
 *         Minting/burning is restricted to protocol roles managed by AccessControl.
 */
contract OptionToken is ERC1155, AccessControl {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant URI_ADMIN_ROLE = keccak256("URI_ADMIN_ROLE");

    error OptionToken_InvalidAdmin();

    event BaseURIUpdated(string newUri);

    constructor(string memory baseUri, address admin) ERC1155(baseUri) {
        if (admin == address(0)) revert OptionToken_InvalidAdmin();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
        _grantRole(URI_ADMIN_ROLE, admin);
    }

    function setBaseURI(string calldata newUri) external onlyRole(URI_ADMIN_ROLE) {
        _setURI(newUri);
        emit BaseURIUpdated(newUri);
    }

    function grantRoles(address account) external onlyRole(getRoleAdmin(MINTER_ROLE)) {
        _grantRole(MINTER_ROLE, account);
        _grantRole(BURNER_ROLE, account);
    }

    function revokeRoles(address account) external onlyRole(getRoleAdmin(MINTER_ROLE)) {
        _revokeRole(MINTER_ROLE, account);
        _revokeRole(BURNER_ROLE, account);
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) {
        _mint(to, id, amount, data);
    }

    function burn(
        address from,
        uint256 id,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) {
        _burn(from, id, amount);
    }

    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) {
        _mintBatch(to, ids, amounts, data);
    }

    function burnBatch(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(BURNER_ROLE) {
        _burnBatch(from, ids, amounts);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
