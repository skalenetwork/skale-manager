
import {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {deployContractManager} from "./tools/deploy/contractManager";
import {deployDkr} from "./tools/deploy/dkr";
import {expect} from "chai";
import {deployNodes} from "./tools/deploy/nodes";
import {deployValidatorService} from "./tools/deploy/delegation/validatorService";
import {deploySchains} from "./tools/deploy/schains";
import {SchainType} from "./tools/types";
import {registerNodes} from "./tools/nodes";


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
    console.log(nodesData); // TODO: remove

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
        []
    )

    return {
        ...context,
        nodes,
        schains,
        validatorId,
        schainName,
        schainHash,
        // schainNodes,
        // spareNodes
    }
}

describe("DKR", () => {
    it("should not allow anyone to start re-sharing", async () => {
        const {dkr, hacker} = await loadFixture(initialFixture);
        await expect(dkr.connect(hacker).start([1, 2, 3], [3, 4, 5], 2, 5))
            .to.be.revertedWith("Message sender is invalid");
    })

    it("should start keys re-sharing", async () => {
        const {dkr} = await loadFixture(existingSchainFixture);
        console.log(await ethers.resolveAddress(dkr)); // TODO: remove
        // await dkr.start()
    });
});
