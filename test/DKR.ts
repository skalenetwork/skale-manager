
import {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployContractManager} from "./tools/deploy/contractManager";
import {deployDkr} from "./tools/deploy/dkr";
import {expect} from "chai";
import {deployNodes} from "./tools/deploy/nodes";
import {deployValidatorService} from "./tools/deploy/delegation/validatorService";
import {deploySchains} from "./tools/deploy/schains";
import {SchainType} from "./tools/types";
import {getSecretKeyShare, NodeData, registerNodes} from "./tools/nodes";
import {generateKeys} from "./tools/rotation";
import {deploySchainsInternal} from "./tools/deploy/schainsInternal";
import {deploySkaleDKG} from "./tools/deploy/skaleDKG";
import {deployNodeRotation} from "./tools/deploy/nodeRotation";
import {deployKeyStorage} from "./tools/deploy/keyStorage";
import {bn254} from "@noble/curves/bn254";


const initialFixture = async () => {
    const [deployer, validator, schainOwner, hacker] = await ethers.getSigners();
    const contractManager = await deployContractManager();
    const dkr = await deployDkr(contractManager);

    return {
        contractManager,
        dkr,
        owner: deployer,
        hacker,
        validator,
        schainOwner
    }
}

const existingSchainFixture = async () => {
    const schainSize = 16;
    const spareNodesNumber = 16;

    const context = await loadFixture(initialFixture);

    const validatorService = await deployValidatorService(context.contractManager);
    await validatorService.connect(context.validator).registerValidator(
        "D2",
        "Validator for testing",
        130,
        0
    );
    const validatorId = 1n;

    const nodes = await deployNodes(context.contractManager);
    const nodesData = await registerNodes(
        schainSize + spareNodesNumber,
        context.validator,
        nodes,
        validatorService
    );

    const schains = await deploySchains(context.contractManager);
    await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), context.owner);
    const schainName = "D2's schain";
    const schainHash = ethers.id(schainName);
    await schains.addSchainByFoundation(
        5n,
        SchainType.LARGE,
        0n,
        schainName,
        context.schainOwner,
        context.schainOwner,
        [],
        {value: ethers.parseEther("100")}
    );

    const schainsInternal = await deploySchainsInternal(context.contractManager);
    const commonPublicKey = await generateKeys(
        schainHash,
        nodesData,
        await deploySkaleDKG(context.contractManager),
        schainsInternal,
        await deployNodeRotation(context.contractManager)
    );

    const groupNodesIds = await schainsInternal.getNodesInGroup(schainHash);
    const schainNodes = groupNodesIds.map(id => nodesData.find(node => node.id === id) as NodeData);
    const spareNodes = nodesData.filter(node => !groupNodesIds.includes(node.id));

    return {
        ...context,
        nodes,
        schains,
        validatorId,
        schainName,
        schainHash,
        commonPublicKey,
        schainNodes,
        spareNodes
    }
}

describe("DKR", () => {
    it("should not allow anyone to start re-sharing", async () => {
        const {dkr, hacker} = await loadFixture(initialFixture);
        await expect(dkr.connect(hacker).start([1, 2, 3], [3, 4, 5], 2, 5))
            .to.be.revertedWith("Message sender is invalid");
    })

    it("should generate schain keys", async () => {
        const {contractManager, schainHash, commonPublicKey, schainNodes} = await loadFixture(existingSchainFixture);
        const keyStorage = await deployKeyStorage(contractManager);
        const storedPublicKey = await keyStorage.getCommonPublicKey(schainHash);
        const expected = commonPublicKey.toAffine();
        expect(storedPublicKey.x.a).to.equal(expected.x.c0);
        expect(storedPublicKey.x.b).to.equal(expected.x.c1);
        expect(storedPublicKey.y.a).to.equal(expected.y.c0);
        expect(storedPublicKey.y.b).to.equal(expected.y.c1);

        // Any t shares recover the common secret key
        const Fr = bn254.fields.Fr;
        const shares = schainNodes.map(node => getSecretKeyShare(node, schainHash));
        const t = Math.floor((shares.length * 2 + 1) / 3);
        const xs = shares.map((_, index) => BigInt(index + 1)).slice(-t);
        const secretKey = xs.reduce((sum, x) => {
            const lagrangeCoefficient = xs.reduce(
                (product, other) => other === x ? product : Fr.mul(product, Fr.div(other, Fr.sub(other, x))),
                1n
            );
            return Fr.add(sum, Fr.mul(lagrangeCoefficient, shares[Number(x) - 1]));
        }, 0n);
        expect(bn254.G2.Point.BASE.multiply(secretKey).equals(commonPublicKey)).to.be.true;
    });

    it("should start keys re-sharing", async () => {
        const {dkr} = await loadFixture(existingSchainFixture);
        console.log(await ethers.resolveAddress(dkr)); // TODO: remove
        // await dkr.start()
    });
});
