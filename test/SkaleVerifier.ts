import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         NodesInstance,
         SchainsDataInstance,
         SchainsFunctionalityInstance,
         SkaleVerifierInstance,
         ValidatorServiceInstance } from "../types/truffle-contracts";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsData } from "./tools/deploy/schainsData";
import { deploySchainsFunctionality } from "./tools/deploy/schainsFunctionality";
import { deploySkaleVerifier } from "./tools/deploy/skaleVerifier";
chai.should();
chai.use(chaiAsPromised);

contract("SkaleVerifier", ([validator1, owner, developer, hacker]) => {
    let contractManager: ContractManagerInstance;
    let schainsData: SchainsDataInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let skaleVerifier: SkaleVerifierInstance;
    let validatorService: ValidatorServiceInstance;
    let nodes: NodesInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        validatorService = await deployValidatorService(contractManager);
        schainsData = await deploySchainsData(contractManager);
        schainsFunctionality = await deploySchainsFunctionality(contractManager);
        skaleVerifier = await deploySkaleVerifier(contractManager);

        await validatorService.registerValidator("D2", "D2 is even", 0, 0, {from: validator1});
    });

    describe("when skaleVerifier contract is activated", async () => {

        it("should verify valid signatures with valid data", async () => {
            const isVerified = await skaleVerifier.verify(
                "178325537405109593276798394634841698946852714038246117383766698579865918287",
                "493565443574555904019191451171395204672818649274520396086461475162723833781",
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                "7025653765868604607777943964159633546920168690664518432704587317074821855333",
                "14411459380456065006136894392078433460802915485975038137226267466736619639091",
            );

            assert(isVerified.should.be.true);
        });

        it("should not verify invalid signature", async () => {
            await skaleVerifier.verify(
                "178325537405109593276798394634841698946852714038246117383766698579865918287",
                // the last digit is spoiled in parameter below
                "493565443574555904019191451171395204672818649274520396086461475162723833782",
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                "7025653765868604607777943964159633546920168690664518432704587317074821855333",
            ).should.be.eventually.rejectedWith("Sign not in G1");
        });

        it("should not verify signatures with invalid counter", async () => {
            const isVerified = await skaleVerifier.verify(
                "178325537405109593276798394634841698946852714038246117383766698579865918287",
                "493565443574555904019191451171395204672818649274520396086461475162723833781",
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                1,  // the counter should be 0
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                "7025653765868604607777943964159633546920168690664518432704587317074821855333",
            );
            assert(isVerified.should.be.false);
        });

        it("should not verify signatures with invalid hash", async () => {
            const isVerified = await skaleVerifier.verify(
                "178325537405109593276798394634841698946852714038246117383766698579865918287",
                "493565443574555904019191451171395204672818649274520396086461475162723833781",
                // the last symbol is spoiled in parameter below
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4de",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                "7025653765868604607777943964159633546920168690664518432704587317074821855333",
            );

            assert(isVerified.should.be.false);
        });

        it("should not verify signatures with invalid common public key", async () => {
            await skaleVerifier.verify(
                "178325537405109593276798394634841698946852714038246117383766698579865918287",
                "493565443574555904019191451171395204672818649274520396086461475162723833781",
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                "15163860114293529009901628456926790077787470245128337652112878212941459329347",
                // the last digit is spoiled in parameter below
                "12500085126843048684532885473768850586094133366876833840698567603558300429944",
                "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                "7025653765868604607777943964159633546920168690664518432704587317074821855333",
            ).should.be.eventually.rejectedWith("Public Key not in G2");
        });

        it("should not verify signatures with invalid hash point", async () => {
            const isVerified = await skaleVerifier.verify(
                "178325537405109593276798394634841698946852714038246117383766698579865918287",
                "493565443574555904019191451171395204672818649274520396086461475162723833781",
                "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5",
                0,
                "3080491942974172654518861600747466851589809241462384879086673256057179400078",
                // the last digit is spoiled in parameter below
                "15163860114293529009901628456926790077787470245128337652112878212941459329346",
                "12500085126843048684532885473768850586094133366876833840698567603558300429943",
                "8276253263131369565695687329790911140957927205765534740198480597854608202714",
                "14411459380456065006136894392078433460802915485975038137226267466736619639091",
                "7025653765868604607777943964159633546920168690664518432704587317074821855333",
            );
            assert(isVerified.should.be.false);
        });

        it("should verify Schain signature with already set common public key", async () => {
            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await nodes.createNode(validator1,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                    "0x1122334455667788990011223344556677889900112233445566778899001122"],
                        name: "d2" + hexIndex
                    },
                    {from: validator1});
            }

            const deposit = await schainsFunctionality.getSchainPrice(4, 5);

            await schainsFunctionality.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "Bob"]),
                {from: validator1});

            await schainsData.setPublicKey(
                await web3.utils.soliditySha3("Bob"),
                "14175454883274808069161681493814261634483894346393730614200347712729091773660",
                "8121803279407808453525231194818737640175140181756432249172777264745467034059",
                "16178065340009269685389392150337552967996679485595319920657702232801180488250",
                "1719704957996939304583832799986884557051828342008506223854783585686652272013",
            );
            const res = await skaleVerifier.verifySchainSignature(
                "2968563502518615975252640488966295157676313493262034332470965194448741452860",
                "16493689853238003409059452483538012733393673636730410820890208241342865935903",
                "0x243b6ce34e3c772e4e01685954b027e691f67622d21d261ae0b324c78b315fc3",
                "1",
                "16388258042572094315763275220684810298941672685551867426142229042700479455172",
                "16728155475357375553025720334221543875807222325459385994874825666479685652110",
                "Bob",
            );
            assert(res.should.be.true);
        });
    });
});
