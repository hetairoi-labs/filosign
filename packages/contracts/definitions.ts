export const definitions = {
  "0x7a69": {
    "FSManager": {
      "address": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
      "abi": [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "CannotApproveSelf",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyServer",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderAlreadyApproved",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderNotApproved",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderNotRegistered",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "SenderApproved",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "SenderRevoked",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            }
          ],
          "name": "approveSender",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "approvedSenders",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "cidRegistry",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "fileRegistry",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "account_",
              "type": "address"
            }
          ],
          "name": "isRegistered",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "keyRegistry",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            }
          ],
          "name": "revokeSender",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "server",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint8",
              "name": "version_",
              "type": "uint8"
            }
          ],
          "name": "setActiveVersion",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "version",
          "outputs": [
            {
              "internalType": "uint8",
              "name": "",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
    },
    "FSFileRegistry": {
      "address": "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
      "abi": [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "AlreadySigned",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "BadSignersLength",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ECDSAInvalidSignature",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "length",
              "type": "uint256"
            }
          ],
          "name": "ECDSAInvalidSignatureLength",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "name": "ECDSAInvalidSignatureS",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "FileAlreadyRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "FileNotRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSender",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidShortString",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSignature",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSigner",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "OnlyServer",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SenderNotRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "SignatureExpired",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "signer",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "SignerNotApproved",
          "type": "error"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "str",
              "type": "string"
            }
          ],
          "name": "StringTooLong",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "UnsortedSigners",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "ZeroSigner",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [],
          "name": "EIP712DomainChanged",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "cidIdentifier",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint48",
              "name": "timestamp",
              "type": "uint48"
            }
          ],
          "name": "FileRegistered",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "cidIdentifier",
              "type": "bytes32"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "signer",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint48",
              "name": "timestamp",
              "type": "uint48"
            }
          ],
          "name": "FileSigned",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            }
          ],
          "name": "cidIdentifier",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "pure",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address[]",
              "name": "signers_",
              "type": "address[]"
            }
          ],
          "name": "computeSignersCommitment",
          "outputs": [
            {
              "internalType": "bytes20",
              "name": "",
              "type": "bytes20"
            }
          ],
          "stateMutability": "pure",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "eip712Domain",
          "outputs": [
            {
              "internalType": "bytes1",
              "name": "fields",
              "type": "bytes1"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "version",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "chainId",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "verifyingContract",
              "type": "address"
            },
            {
              "internalType": "bytes32",
              "name": "salt",
              "type": "bytes32"
            },
            {
              "internalType": "uint256[]",
              "name": "extensions",
              "type": "uint256[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            }
          ],
          "name": "fileRegistrations",
          "outputs": [
            {
              "components": [
                {
                  "internalType": "bytes32",
                  "name": "cidIdentifier",
                  "type": "bytes32"
                },
                {
                  "internalType": "address",
                  "name": "sender",
                  "type": "address"
                },
                {
                  "internalType": "uint8",
                  "name": "signersCount",
                  "type": "uint8"
                },
                {
                  "internalType": "uint256",
                  "name": "timestamp",
                  "type": "uint256"
                }
              ],
              "internalType": "struct FSFileRegistry.FileRegistrationView",
              "name": "",
              "type": "tuple"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "who",
              "type": "address"
            }
          ],
          "name": "hasSigned",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "cidId",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "who",
              "type": "address"
            }
          ],
          "name": "isSigner",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "manager",
          "outputs": [
            {
              "internalType": "contract IFSManager",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "nonce",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address[]",
              "name": "signers_",
              "type": "address[]"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "registerFile",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "signer_",
              "type": "address"
            },
            {
              "internalType": "bytes20",
              "name": "dl3SignatureCommitment_",
              "type": "bytes20"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "registerFileSignature",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "viewer_",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "validateFileAckSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address[]",
              "name": "signers_",
              "type": "address[]"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "validateFileRegistrationSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "pieceCid_",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "sender_",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "signer_",
              "type": "address"
            },
            {
              "internalType": "bytes20",
              "name": "dl3SignatureCommitment_",
              "type": "bytes20"
            },
            {
              "internalType": "uint256",
              "name": "timestamp_",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "signature_",
              "type": "bytes"
            }
          ],
          "name": "validateFileSigningSignature",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
    },
    "FSKeyRegistry": {
      "address": "0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968",
      "abi": [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "DataAlreadyRegistered",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidCommitmentDilithiumPk",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidCommitmentKyberPk",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSaltPin",
          "type": "error"
        },
        {
          "inputs": [],
          "name": "InvalidSaltSeed",
          "type": "error"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "user",
              "type": "address"
            }
          ],
          "name": "KeygenDataRegistered",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "user_",
              "type": "address"
            }
          ],
          "name": "isRegistered",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "keygenData",
          "outputs": [
            {
              "internalType": "bytes16",
              "name": "salt_pin",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_seed",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_challenge",
              "type": "bytes16"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_kyber_pk",
              "type": "bytes20"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_dilithium_pk",
              "type": "bytes20"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "publicKeys",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes16",
              "name": "salt_pin_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_seed_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes16",
              "name": "salt_challenge_",
              "type": "bytes16"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_kyber_pk_",
              "type": "bytes20"
            },
            {
              "internalType": "bytes20",
              "name": "commitment_dilithium_pk_",
              "type": "bytes20"
            }
          ],
          "name": "registerKeygenData",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ]
    }
  }
} as const;