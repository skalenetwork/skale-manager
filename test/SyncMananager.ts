import {ContractManager, SyncManager} from "../typechain-types";
import {deployContractManager} from "./tools/deploy/contractManager";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import {deploySyncManager} from "./tools/deploy/syncManager";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {expect} from "chai";
import {fastBeforeEach} from "./tools/mocha";

chai.should();
chai.use(chaiAsPromised);

describe("SyncManager", () => {
    let owner: SignerWithAddress;
    let user: SignerWithAddress;

    let contractManager: ContractManager;
    let syncManager: SyncManager;

    fastBeforeEach(async () => {
        [owner, user] = await ethers.getSigners();

        contractManager = await deployContractManager();
        syncManager = await deploySyncManager(contractManager);

        await syncManager.grantRole(await syncManager.SYNC_MANAGER_ROLE(), owner.address);
    });

    it("should revert addIPRange or removeIPRange if sender does not have required role", async () => {
        await syncManager.connect(user).addIPRange("range", "0x00000001", "0x00000001")
            .should.be.eventually.rejectedWith("SYNC_MANAGER_ROLE is required");
        await syncManager.connect(user).removeIPRange("range")
            .should.be.eventually.rejectedWith("SYNC_MANAGER_ROLE is required");
        await syncManager.grantRole(await syncManager.SYNC_MANAGER_ROLE(), user.address);
        await syncManager.connect(user).addIPRange("range", "0x00000001", "0x00000001");
        await syncManager.connect(user).removeIPRange("range");
    });

    it("should revert if IP range name is already taken", async () => {
        await syncManager.addIPRange("range", "0x00000001", "0x00000001");
        await syncManager.addIPRange("range", "0x00000002", "0x00000002")
            .should.be.eventually.rejectedWith("IP range name is already taken");
    });

    it("should revert removeIPRange if IP range does not exist", async () => {
        await syncManager.removeIPRange("range")
            .should.be.eventually.rejectedWith("IP range does not exist");
    });

    it("should revert if startIP greater than endIP", async () => {
        await syncManager.addIPRange("range", "0x00000002", "0x00000001")
            .should.be.eventually.rejectedWith("Invalid IP ranges provided");
    });

    it("should add and remove IP address range", async () => {
        const rangeName = "range";
        const newStartIP = "0x00000001";
        const newEndIP = "0x00000002";
        await syncManager.addIPRange(rangeName, newStartIP, newEndIP)
            .should.emit(syncManager, "IPRangeAdded")
            .withArgs(rangeName, newStartIP, newEndIP);
        {
            const {startIP, endIP} = await syncManager.getIPRangeByName(rangeName);
            expect(startIP).to.be.equal(newStartIP);
            expect(endIP).to.be.equal(newEndIP);
        }
        await syncManager.removeIPRange(rangeName)
            .should.emit(syncManager, "IPRangeRemoved")
            .withArgs(rangeName);
        {
            const {startIP, endIP} = await syncManager.getIPRangeByName(rangeName);
            expect(startIP).to.be.equal("0x00000000");
            expect(endIP).to.be.equal("0x00000000");
        }
    });

    it("should return list of ranges", async () => {
        const ipRanges = [
            {
                name: "range1",
                startIP: '0x00000001',
                endIP: '0x00000002'
            },
            {
                name: "range2",
                startIP: '0x00000003',
                endIP: '0x00000004'
            }
        ];

        await syncManager.addIPRange(ipRanges[0].name, ipRanges[0].startIP, ipRanges[0].endIP);
        await syncManager.addIPRange(ipRanges[1].name, ipRanges[1].startIP, ipRanges[1].endIP);
        const ipRangesNumber = await syncManager.getIPRangesNumber();
        for (let i = 0; i < ipRangesNumber; i++) {
            const {startIP, endIP} = await syncManager.getIPRangeByIndex(i);
            expect(startIP).to.be.equal(ipRanges[i].startIP);
            expect(endIP).to.be.equal(ipRanges[i].endIP);
        }
    });
});
