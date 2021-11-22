import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractManager,
         KeyStorage,
         Nodes,
         Schains,
         SchainsInternal,
         SkaleVerifier,
         ValidatorService } from "../typechain";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleVerifier } from "./tools/deploy/skaleVerifier";
import { deployKeyStorage } from "./tools/deploy/keyStorage";
import { deploySkaleManagerMock } from "./tools/deploy/test/skaleManagerMock";
import { ethers, web3 } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { assert } from "chai";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { BigNumber, PopulatedTransaction, Wallet } from "ethers";
import { getValidatorIdSignature } from "./tools/signatures";

chai.should();
chai.use(chaiAsPromised);

describe("SkaleVerifier", () => {
    let validator1: SignerWithAddress;
    let owner: SignerWithAddress;
    let developer: SignerWithAddress;
    let hacker: SignerWithAddress;
    let nodeAddress: Wallet;

    let contractManager: ContractManager;
    let schains: Schains;
    let skaleVerifier: SkaleVerifier;
    let validatorService: ValidatorService;
    let nodes: Nodes;
    let keyStorage: KeyStorage;
    let schainsInternal: SchainsInternal;

    beforeEach(async () => {
        [validator1, owner, developer, hacker] = await ethers.getSigners();

        nodeAddress = new Wallet(String(privateKeys[0])).connect(ethers.provider);
        await owner.sendTransaction({to: nodeAddress.address, value: ethers.utils.parseEther("10000")});

        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        validatorService = await deployValidatorService(contractManager);
        schains = await deploySchains(contractManager);
        skaleVerifier = await deploySkaleVerifier(contractManager);
        keyStorage = await deployKeyStorage(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);

        await validatorService.connect(validator1).registerValidator("D2", "D2 is even", 0, 0);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const validatorIndex = await validatorService.getValidatorId(validator1.address);
        await validatorService.connect(owner).enableValidator(validatorIndex);
        const signature = await getValidatorIdSignature(validatorIndex, nodeAddress);
        await validatorService.connect(validator1).linkNodeAddress(nodeAddress.address, signature);

        const SCHAIN_TYPE_MANAGER_ROLE = await schainsInternal.SCHAIN_TYPE_MANAGER_ROLE();
        await schainsInternal.grantRole(SCHAIN_TYPE_MANAGER_ROLE, validator1.address);

        await schainsInternal.addSchainType(1, 16);
        await schainsInternal.addSchainType(4, 16);
        await schainsInternal.addSchainType(128, 16);
        await schainsInternal.addSchainType(0, 2);
        await schainsInternal.addSchainType(32, 4);
    });

    describe("when skaleVerifier contract is activated", async () => {

        it("should verify valid signatures with valid data", async () => {
            const isVerified = await skaleVerifier.verify(
                {
                    a: "178325537405109593276798394634841698946852714038246117383766698579865918287",
                    b: "493565443574555904019191451171395204672818649274520396086461475162723833781",
                },
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                {
                    x: {
                        a: "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                        b: "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                    },
                    y: {
                        a: "7025653765868604607777943964159633546920168690664518432704587317074821855333",
                        b: "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                    }
                }
            );

            assert(isVerified.should.be.true);
        });

        it("should not verify invalid signature", async () => {
            await skaleVerifier.verify(
                {
                    a: "178325537405109593276798394634841698946852714038246117383766698579865918287",
                    // the last digit is spoiled in parameter below
                    b: "493565443574555904019191451171395204672818649274520396086461475162723833782",
                },
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                {
                    x: {
                        a: "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                        b: "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                    },
                    y: {
                        a: "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                        b: "7025653765868604607777943964159633546920168690664518432704587317074821855333",
                    }
                }
            ).should.be.eventually.rejectedWith("Sign not in G1");
        });

        it("should not verify signatures with invalid counter", async () => {
            const isVerified = await skaleVerifier.verify(
                {
                    a: "178325537405109593276798394634841698946852714038246117383766698579865918287",
                    b: "493565443574555904019191451171395204672818649274520396086461475162723833781",
                },
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                1,  // the counter should be 0
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                {
                    x: {
                        a: "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                        b: "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                    },
                    y: {
                        a: "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                        b: "7025653765868604607777943964159633546920168690664518432704587317074821855333",
                    }
                }
            );
            assert(isVerified.should.be.false);
        });

        it("should not verify signatures with invalid hash", async () => {
            const isVerified = await skaleVerifier.verify(
                {
                    a: "178325537405109593276798394634841698946852714038246117383766698579865918287",
                    b: "493565443574555904019191451171395204672818649274520396086461475162723833781",
                },
                // the last symbol is spoiled in parameter below
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4de",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                {
                    x: {
                        a: "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                        b: "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                    },
                    y: {
                        a: "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                        b: "7025653765868604607777943964159633546920168690664518432704587317074821855333",
                    }
                }
            );

            assert(isVerified.should.be.false);
        });

        it("should not verify signatures with invalid common public key", async () => {
            await skaleVerifier.verify(
                {
                    a: "178325537405109593276798394634841698946852714038246117383766698579865918287",
                    b: "493565443574555904019191451171395204672818649274520396086461475162723833781",
                },
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                {
                    x: {
                        // the last digit is spoiled in parameter below
                        a: "12500085126843048684532885473768850586094133366876833840698567603558300429944",
                        b: "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                    },
                    y: {
                        a: "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                        b: "7025653765868604607777943964159633546920168690664518432704587317074821855333",
                    }
                }
            ).should.be.eventually.rejectedWith("Public Key not in G2");
        });

        it("should not verify signatures with invalid hash point", async () => {
            const isVerified = await skaleVerifier.verify(
                {
                    a: "178325537405109593276798394634841698946852714038246117383766698579865918287",
                    b: "493565443574555904019191451171395204672818649274520396086461475162723833781",
                },
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                // the last digit is spoiled in parameter below
                "15163860114293529009901628456926790077787470245128337652112878212941459329346",
                {
                    x: {
                        a: "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                        b: "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                    },
                    y: {
                        a: "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                        b: "7025653765868604607777943964159633546920168690664518432704587317074821855333",
                    }
                }
            );
            assert(isVerified.should.be.false);
        });

        it("should verify Schain signature with already set common public key", async () => {
            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
                await nodes.connect(validator1).createNode(nodeAddress.address,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                        name: "d2" + hexIndex,
                        domainName: "some.domain.name"
                    });
            }

            const deposit = await schains.getSchainPrice(4, 5);

            await schains.connect(validator1).addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "Bob"]));

            const bobHash = web3.utils.soliditySha3("Bob");
            if (bobHash) {
                await keyStorage.initPublicKeyInProgress(bobHash);

                await keyStorage.adding(
                    bobHash,
                    {
                        x: {
                            a: "14175454883274808069161681493814261634483894346393730614200347712729091773660",
                            b: "8121803279407808453525231194818737640175140181756432249172777264745467034059"
                        },
                        y: {
                            a: "16178065340009269685389392150337552967996679485595319920657702232801180488250",
                            b: "1719704957996939304583832799986884557051828342008506223854783585686652272013"
                        }
                    }
                );

                await keyStorage.finalizePublicKey(bobHash);
                const res = await schains.verifySchainSignature(
                    "2968563502518615975252640488966295157676313493262034332470965194448741452860",
                    "16493689853238003409059452483538012733393673636730410820890208241342865935903",
                    "0x243b6ce34e3c772e4e01685954b027e691f67622d21d261ae0b324c78b315fc3",
                    "1",
                    "16388258042572094315763275220684810298941672685551867426142229042700479455172",
                    "16728155475357375553025720334221543875807222325459385994874825666479685652110",
                    "Bob",
                );
                assert(res.should.be.true);
            } else {
                assert(false);
            }
        });
    });
});
