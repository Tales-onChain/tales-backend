// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TalesUserRegistry is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Events for L2 optimization
    event BatchMinted(address indexed to, uint256[] tokenIds);

    constructor() ERC721("TalesUser", "TALES") {}

    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        unchecked {
            _tokenIdCounter.increment();
        }
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function batchMint(address[] calldata tos, string[] calldata uris) public onlyOwner {
        require(tos.length == uris.length, "Arrays length mismatch");
        require(tos.length > 0 && tos.length <= 50, "Invalid batch size");

        uint256[] memory tokenIds = new uint256[](tos.length);

        for (uint256 i = 0; i < tos.length;) {
            uint256 tokenId = _tokenIdCounter.current();
            unchecked {
                _tokenIdCounter.increment();
                tokenIds[i] = tokenId;
                i++;
            }
            _safeMint(tos[i-1], tokenId);
            _setTokenURI(tokenId, uris[i-1]);
        }

        emit BatchMinted(msg.sender, tokenIds);
    }

    // Add the required _burn override to resolve the conflict
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}