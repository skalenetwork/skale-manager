import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         DecryptionContract,
         DecryptionInstance,
         ECDHContract,
         ECDHInstance,
         NodesFunctionalityInstance,
         SchainsDataContract,
         SchainsDataInstance,
         SchainsFunctionalityContract,
         SchainsFunctionalityInstance,
         SchainsFunctionalityInternalContract,
         SchainsFunctionalityInternalInstance,
         SkaleDKGContract,
         SkaleDKGInstance,
         SkaleVerifierContract,
         SkaleVerifierInstance,
         ValidatorServiceInstance} from "../types/truffle-contracts";

import { gasMultiplier } from "./utils/command_line";

const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const SchainsFunctionality: SchainsFunctionalityContract = artifacts.require("./SchainsFunctionality");
const SchainsFunctionalityInternal: SchainsFunctionalityInternalContract = artifacts.require("./SchainsFunctionalityInternal");
const Decryption: DecryptionContract = artifacts.require("./Decryption");
const ECDH: ECDHContract = artifacts.require("./ECDH");
const SkaleVerifier: SkaleVerifierContract = artifacts.require("./SkaleVerifier");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");

import { deployContractManager } from "./utils/deploy/contractManager";
import { deployValidatorService } from "./utils/deploy/delegation/validatorService";
import { deployNodesFunctionality } from "./utils/deploy/nodesFunctionality";
import { deploySchainsData } from "./utils/deploy/schainsData";
chai.should();
chai.use(chaiAsPromised);

contract("SkaleVerifier", ([validator1, owner, developer, hacker]) => {
    let contractManager: ContractManagerInstance;
    let nodesFunctionality: NodesFunctionalityInstance;
    let schainsData: SchainsDataInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let schainsFunctionalityInternal: SchainsFunctionalityInternalInstance;
    let decryption: DecryptionInstance;
    let ecdh: ECDHInstance;
    let skaleVerifier: SkaleVerifierInstance;
    let skaleDKG: SkaleDKGInstance;
    let validatorService: ValidatorServiceInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodesFunctionality = await deployNodesFunctionality(contractManager);
        validatorService = await deployValidatorService(contractManager);
        validatorService.registerValidator("D2", validator1, "D2 is even", 0, 0);

        schainsData = await deploySchainsData(contractManager);

        schainsFunctionality = await SchainsFunctionality.new(
            "SkaleManager",
            "SchainsData",
            contractManager.address,
            {from: validator1, gas: 7900000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality", schainsFunctionality.address);

        schainsFunctionalityInternal = await SchainsFunctionalityInternal.new(
            "SchainsFunctionality",
            "SchainsData",
            contractManager.address,
            {from: validator1, gas: 7000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionalityInternal", schainsFunctionalityInternal.address);

        skaleDKG = await SkaleDKG.new(contractManager.address, {from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

        decryption = await Decryption.new({from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("Decryption", decryption.address);

        ecdh = await ECDH.new({from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("ECDH", ecdh.address);

        skaleVerifier = await SkaleVerifier.new(
            contractManager.address,
            {from: validator1, gas: 8000000 * gasMultiplier},
        );
        await contractManager.setContractsAddress("SkaleVerifier", skaleVerifier.address, {from: validator1});
    });

    describe("when skaleVerifier contract is activated", async () => {

        it("should verify valid signatures with valid data", async () => {
            // const signa = new BigNumber(
            //     "12246224789371979764448582489488838691424696526644556990733838563729335147344"
            // );
            // const signb = new BigNumber(
            //     "10528945047297938115197671113541113701111057011888716549967014037021507698430"
            // );
            //
            // const hash = "0x3733cd977ff8eb18b987357e22ced99f46097f31ecb239e878ae63760e83e4d5";
            //
            // const counter = 2;
            //
            // const hasha = new BigNumber(
            //     "8330398017606383362778967296125384542293285683930042644463579736059414477560"
            // );
            // const hashb = new BigNumber(
            //     "15983567607269484412063625758442416507299349120463367396521067445601767939624"
            // );
            //
            // const pkx1 = new BigNumber(
            //     "7400107192966145181399535745499335165347120346963667754929581055788152472106"
            // );
            // const pky1 = new BigNumber(
            //     "18353520504408127630771487258260700969877478367957411410017068328387547117081"
            // );
            // const pkx2 = new BigNumber(
            //     "4917434737461214318927199341232485422238948576908897268618382214023701714282"
            // );
            // const pky2 = new BigNumber(
            //     "15295158583345622866054024228469218054851674208376922650223378778985088227953"
            // );

            // const isVerified = await skaleVerifier.verify(
            //     signa,
            //     signb,
            //     hash,
            //     counter,
            //     hasha,
            //     hashb,
            //     pkx1,
            //     pky1,
            //     pkx2,
            //     pky2
            // );
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
                await nodesFunctionality.createNode(validator1,
                    "0x00" +
                    "2161" +
                    "0000" +
                    "7f0000" + hexIndex +
                    "7f0000" + hexIndex +
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "d2" + hexIndex,
                    {from: validator1});
            }

            const deposit = await schainsFunctionality.getSchainPrice(4, 5);

            await schainsFunctionality.addSchain(
                validator1,
                deposit,
                "0x10" +
                "0000000000000000000000000000000000000000000000000000000000000005" +
                "04" +
                "0000" +
                "426f62",
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
