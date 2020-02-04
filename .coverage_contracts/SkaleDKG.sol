/*
    SkaleDKG.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin

    SKALE Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SKALE Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;
import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/INodesData.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/ISchainsFunctionalityInternal.sol";
import "./SchainsFunctionality.sol";
import "./SchainsFunctionalityInternal.sol";

interface IECDH {
    function deriveKey(
        uint256 privKey,
        uint256 pubX,
        uint256 pubY
    )
        external
        pure
        returns(uint256, uint256);
}

interface IDecryption {
    function decrypt(bytes32 ciphertext, bytes32 key) external pure returns (uint256);
}


contract SkaleDKG is Permissions {
function coverage_0x645ceaf0(bytes32 c__0x645ceaf0) public pure {}


    struct Channel {
        bool active;
        address dataAddress;
        bool[] broadcasted;
        uint numberOfBroadcasted;
        Fp2 publicKeyx;
        Fp2 publicKeyy;
        uint numberOfCompleted;
        bool[] completed;
        uint startedBlockNumber;
        uint nodeToComplaint;
        uint fromNodeToComplaint;
        uint startComplaintBlockNumber;
    }

    struct Fp2 {
        uint x;
        uint y;
    }

    struct BroadcastedData {
        bytes secretKeyContribution;
        bytes verificationVector;
    }

    uint constant P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint constant G2A = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint constant G2B = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint constant G2C = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint constant G2D = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    uint constant TWISTBX = 19485874751759354771024239261021720505790618469301721065564631296452457478373;
    uint constant TWISTBY = 266929791119991161246907387137283842545076965332900288569378510910307636690;

    uint constant G1A = 1;
    uint constant G1B = 2;

    mapping(bytes32 => Channel) public channels;
    mapping(bytes32 => mapping(uint => BroadcastedData)) data;

    event ChannelOpened(bytes32 groupIndex);

    event ChannelClosed(bytes32 groupIndex);

    event BroadcastAndKeyShare(
        bytes32 indexed groupIndex,
        uint indexed fromNode,
        bytes verificationVector,
        bytes secretKeyContribution
    );

    event AllDataReceived(bytes32 indexed groupIndex, uint nodeIndex);
    event SuccessfulDKG(bytes32 indexed groupIndex);
    event BadGuy(uint nodeIndex);
    event FailedDKG(bytes32 indexed groupIndex);
    event ComplaintSent(bytes32 indexed groupIndex, uint indexed fromNodeIndex, uint indexed toNodeIndex);
    event NewGuy(uint nodeIndex);

    modifier correctGroup(bytes32 groupIndex) {coverage_0x645ceaf0(0x48aaec2882e54fc1e12a777990d5cfc4b67cb94623342bb83858d90b0999635d); /* function */ 

coverage_0x645ceaf0(0x6fe3f88dc770044f65f4a65e46ab6c1516348de94f3111c797af24dcd1c5b0d0); /* line */ 
        coverage_0x645ceaf0(0xe4d1a047554235de84f842d27624c49e5e3cbe17b2db86c81f0180770108009c); /* assertPre */ 
coverage_0x645ceaf0(0x2b4336d7ed306324769369becd96916c24c3ce4d4040901d7f3fccc88e2e5124); /* statement */ 
require(channels[groupIndex].active, "Group is not created");coverage_0x645ceaf0(0xf6f2375edd49f349de24ff4f417e4f4e48558f550d7c1ed2417f12ec8711131d); /* assertPost */ 

coverage_0x645ceaf0(0xf19dcf9c91581ade280192b8020d8251d457b79a0c31376f56d7b3ae503982a5); /* line */ 
        _;
    }

    modifier correctNode(bytes32 groupIndex, uint nodeIndex) {coverage_0x645ceaf0(0xb222551bc709c5e496b725eca2be2b151d9aec8a946cac6e7bc1b420fc6c4e48); /* function */ 

coverage_0x645ceaf0(0x669aaf4fbbeab1f2f2b6ca2416df8a76bef275b39f2f934a499fc1aa976e7750); /* line */ 
        coverage_0x645ceaf0(0x902fd4a5744b06612eb29756229acc330dda6b219c73686444045cea64356db9); /* statement */ 
uint index = findNode(groupIndex, nodeIndex);
coverage_0x645ceaf0(0x7d3bd902e363c1aee5d6aef646450d516b6a23f79d7042c444662c27d0b8d004); /* line */ 
        coverage_0x645ceaf0(0x2d27ea88e3aefbd2fb30ec7964d6e65831ae68b0a339ee05c60f18e33fdc1835); /* assertPre */ 
coverage_0x645ceaf0(0x7fdca51bdd7ddba26c68697159c48cbaa93e2437158fc4ae5beb2c52d9ded8f7); /* statement */ 
require(index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex), "Node is not in this group");coverage_0x645ceaf0(0xf172e002a279cd01480ec1c4b5a1e3a246be2a21960197ebc722b871f18570bd); /* assertPost */ 

coverage_0x645ceaf0(0x0a0a2ea8c130a6df928fad48dea4a056013718bedd16dcea49864b0c8962a3d9); /* line */ 
        _;
    }

    constructor(address contractsAddress) Permissions(contractsAddress) public {coverage_0x645ceaf0(0x30e48e557d4be8e498d9f727aa5a71772e788d1e074a962d9947fd82f314bdcc); /* function */ 


    }

    function openChannel(bytes32 groupIndex) external allowThree("SchainsData", "ValidatorsData", "SkaleDKG") {coverage_0x645ceaf0(0xd98be14999f3b7a9f9605cb289ffa9b5b022e1107aa9c67d15293f6a32547951); /* function */ 

coverage_0x645ceaf0(0xee7735984f767c554091fcbb40b5af5e14a6cf26f524de666dd8154c978551eb); /* line */ 
        coverage_0x645ceaf0(0x9a5483c2f8c3ac53dd9bc0e44ac9530d4900171cf923bc784f17706c86142ead); /* assertPre */ 
coverage_0x645ceaf0(0xb5f13ddf6763e4e90f913e2a5730010b931b8d9aa5e7beac1f4ca2ea26a7187b); /* statement */ 
require(!channels[groupIndex].active, "Channel already is created");coverage_0x645ceaf0(0x96df81a6052202768e0da6658bd3dbcd94fbb4cc4bead1bf4de9100e32fcd1e3); /* assertPost */ 

coverage_0x645ceaf0(0x15020d6c25d007dc37d1a5dc3c11d9bcfacaeaa916bb45c32369bf7dc819109a); /* line */ 
        coverage_0x645ceaf0(0x1eb8718c8382ed2237c5a6d026c9eb8b6794ff322ffed5e1e4ddd8c2907461d9); /* statement */ 
channels[groupIndex].active = true;
coverage_0x645ceaf0(0x784dcc37ed8d4672a56542ee7448815552884615562bef5aedc8631dbd4a7608); /* line */ 
        coverage_0x645ceaf0(0xce22409f24e1861a6bf41279a4499f1996a1dbcdf306d6d4cf5a751790b03d74); /* statement */ 
channels[groupIndex].dataAddress = msg.sender;
coverage_0x645ceaf0(0xc06212f71317c42b1d53af81f8b112deb47fa32b5e6a73cf54e6eb84b63e8b24); /* line */ 
        coverage_0x645ceaf0(0x51e51cbe99f006ffab2835049188b753f34fd4da3939679cb5f7c0fcd9a48f74); /* statement */ 
channels[groupIndex].broadcasted = new bool[](IGroupsData(channels[groupIndex].dataAddress).getRecommendedNumberOfNodes(groupIndex));
coverage_0x645ceaf0(0xd08c362ae0c344cc9c5c7f702cb087015287766904d249777bf8bc2e0bdbddbe); /* line */ 
        coverage_0x645ceaf0(0xeb9597c9e234d0e2364d99fbdc94b0b528193a2228f80fa9af7a94c552e624e9); /* statement */ 
channels[groupIndex].completed = new bool[](IGroupsData(channels[groupIndex].dataAddress).getRecommendedNumberOfNodes(groupIndex));
coverage_0x645ceaf0(0x73d57861ff99256ad5d987dfeffa60a3d01f39e24d1daa96d33c138a014c027e); /* line */ 
        coverage_0x645ceaf0(0xaef29fbc86ad505c3bdf01bf6e2b1b16249f001a8c397150c3501bffe34b24c5); /* statement */ 
channels[groupIndex].publicKeyy.x = 1;
coverage_0x645ceaf0(0x820c11bfa2c6e97421db8792309d3e580f855987380f8ace8064501384de1a39); /* line */ 
        coverage_0x645ceaf0(0x358735560e4a1bc06ced808b5f417a1e5feafcdd924c307a1f412caabfac63d6); /* statement */ 
channels[groupIndex].nodeToComplaint = uint(-1);
coverage_0x645ceaf0(0x5761d6d2df13622219a3430ff0481dd37a1d9f3a0a931aae9538fa2629888a60); /* line */ 
        coverage_0x645ceaf0(0x6835f1e28245cb3bae287d200627e5d754f8b6ea65f35edab8e30be0e070cbdb); /* statement */ 
emit ChannelOpened(groupIndex);
    }

    function deleteChannel(bytes32 groupIndex) external allowTwo("SchainsData", "ValidatorsData") {coverage_0x645ceaf0(0xbecf45146e720f7653cd9794ed24bf7712007130f528bc648b60a43fd91c3b18); /* function */ 

coverage_0x645ceaf0(0x6b567d91c03494b4239f9a62778a32fd578dec1efc7976aa1bdcbc2cd21f07be); /* line */ 
        coverage_0x645ceaf0(0xf6fedfc9704ca19f4a960c2142bed39ab3d5364f6dd19e5b39eb83f36b30d5f8); /* assertPre */ 
coverage_0x645ceaf0(0x74094ba0cc6ad3374df021dafd78a9eb729758bbdb4fd65155479248616cd565); /* statement */ 
require(channels[groupIndex].active, "Channel is not created");coverage_0x645ceaf0(0xd98f9d243e6f5d800330ca2009bedfadb10cd07765b2e2ee9f113150509bb961); /* assertPost */ 

coverage_0x645ceaf0(0x49096bdaee7744ea7d8949118f05cc564b4332c808424a6d46d601b9c082c79a); /* line */ 
        delete channels[groupIndex];
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes calldata verificationVector,
        bytes calldata secretKeyContribution
    )
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, nodeIndex)
    {coverage_0x645ceaf0(0xb991a780bf882e1bc5e984e74b17c6f2bb32a755924b3bb69b27ff012bb81f8d); /* function */ 

coverage_0x645ceaf0(0x428392bb535cf8123b7613aa421d43d96715f47037cdbec0fb60ebe152da0d9f); /* line */ 
        coverage_0x645ceaf0(0x65f5c28460daf57ed8d27aede937817f4b27d80656d3a4f341beb07382ab1e36); /* assertPre */ 
coverage_0x645ceaf0(0x7989c76c14b07e409cb347c6db88861272e1886d45bc4aee5cd3cc850f680094); /* statement */ 
require(isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");coverage_0x645ceaf0(0xf2836ae29512a94a04704cef584790797a68c704df2fd23734a7f2e50d993c60); /* assertPost */ 

coverage_0x645ceaf0(0x8ee3c453879b1ca466d7b8198fec2420749764807e2d9aef5552c56bbc3c9adc); /* line */ 
        coverage_0x645ceaf0(0x185f16de2e6486495f7f6b61487295dfcfa81bdefe1b276e4ca0e74a7084b43b); /* statement */ 
isBroadcast(
            groupIndex,
            nodeIndex,
            secretKeyContribution,
            verificationVector
        );
coverage_0x645ceaf0(0x40dabb9d42fcad9a678342f693c83d2c908ef495a05ebc398e45db89699946db); /* line */ 
        coverage_0x645ceaf0(0x3d8d31026078367f8511a05a5c1133512ac75a6a86b83db9d595bb7b90ebf30f); /* statement */ 
bytes32 vector;
coverage_0x645ceaf0(0x8f29fcc41574def15133e6958d1085994ec8f16f4be476d1e90363a7d11483fc); /* line */ 
        coverage_0x645ceaf0(0xbb271edda6b72810c75f05e8fdb841eedd3dca4c9a258f345f3bc257bd1c2d58); /* statement */ 
bytes32 vector1;
coverage_0x645ceaf0(0xb3ab2fad191b9a6487afb1b1cb90508195c8f480124ae8e7ffd8f968cc69538f); /* line */ 
        coverage_0x645ceaf0(0x9f30ec24808758a3a2c7d249e47d8f916ec88c132814a8b433bc5ce90964d994); /* statement */ 
bytes32 vector2;
coverage_0x645ceaf0(0xb7c551d5055d9bbc09d1015f76f53c082f1c869d456dd6b6576b07ce0b8e93a6); /* line */ 
        coverage_0x645ceaf0(0x9aa33c08e7b54009a7c6b25cf2f0510b104df32babce705ef95fc07b1d2ad0c7); /* statement */ 
bytes32 vector3;
coverage_0x645ceaf0(0xd5e6fc19adb0a68212e6ded4350c8e8dc367b8b97968f65b8c5e70619fcf0d20); /* line */ 
        assembly {
            vector := calldataload(add(4, 160))
            vector1 := calldataload(add(4, 192))
            vector2 := calldataload(add(4, 224))
            vector3 := calldataload(add(4, 256))
        }
coverage_0x645ceaf0(0xbbd31cb09430cbd344e4d6c96ae16607adfe80839eed59bcc8fd521ca3c1642e); /* line */ 
        coverage_0x645ceaf0(0xee4a553dbd482422075e0395e0c046f2ce1c04e2c6d3d7babf1ddb8246d810ca); /* statement */ 
adding(
            groupIndex,
            uint(vector),
            uint(vector1),
            uint(vector2),
            uint(vector3)
        );
coverage_0x645ceaf0(0x3d875c2ff5e9d5643b9095f740ec75d2c9fc4caf22b4329a9672afd68247b938); /* line */ 
        coverage_0x645ceaf0(0x43e1237d8597078bc88a49b2f0a5c10fb204eead7c8b30c7974f12d5e335b8d9); /* statement */ 
emit BroadcastAndKeyShare(
            groupIndex,
            nodeIndex,
            verificationVector,
            secretKeyContribution
        );
    }

    function complaint(bytes32 groupIndex, uint fromNodeIndex, uint toNodeIndex)
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
        correctNode(groupIndex, toNodeIndex)
    {coverage_0x645ceaf0(0x10ca5ca2094a49a04f32617399b8023224cf8a476bd1f6aaae74d28b6faf5766); /* function */ 

coverage_0x645ceaf0(0x53138390bf1badcec1441d38099bea3a8db3d9227b15f89320ada33e0b8437fb); /* line */ 
        coverage_0x645ceaf0(0x57eda6a451d2528488b992ff436d5100a6a64497dcc85109f936540eb91637b8); /* assertPre */ 
coverage_0x645ceaf0(0x7168da14de635c1020d11813ed5f4e14e7cbbf176de5cac4fb08494cfa10b1e6); /* statement */ 
require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");coverage_0x645ceaf0(0xb71077d349c9d1f1c2114c066f488ed9312d1bc707c7b5f8333f15d727c4c8ef); /* assertPost */ 

coverage_0x645ceaf0(0x72249aea8e8bf504e982603d0fad480b13e42c451b5a9f26d30619dda1356dbc); /* line */ 
        coverage_0x645ceaf0(0x1ecdf285d03d55a458959e95e00cbc0c82b3dcdc945b37c87345b68b6687a82b); /* statement */ 
if (isBroadcasted(groupIndex, toNodeIndex) && channels[groupIndex].nodeToComplaint == uint(-1)) {coverage_0x645ceaf0(0x218a34bfbd7bd8e5f41d09735b86a0f09ce2fab82c5f882d8b572eee4dd766b1); /* branch */ 

            // need to wait a response from toNodeIndex
coverage_0x645ceaf0(0xfb3f3283237aa74d00febd4d514a1b22cc24765f0781b055ed8cca4200a017fa); /* line */ 
            coverage_0x645ceaf0(0xf93854a656f88aec65e9e542c3ee049d86dcbe46f8672f86b8ea1d9d071738bd); /* statement */ 
channels[groupIndex].nodeToComplaint = toNodeIndex;
coverage_0x645ceaf0(0x1d3efb0b6cf8e21e8273dcbcea4e7442aca90e1ec71963f6289bb5ce89c922cc); /* line */ 
            coverage_0x645ceaf0(0x927c6209593527bffaddf5b27dbc881c170fd9a920608fc0a990cc9c4cadf78b); /* statement */ 
channels[groupIndex].fromNodeToComplaint = fromNodeIndex;
coverage_0x645ceaf0(0xf78577a28b133a4ea4bff35b4d19b79f42e33b12b2f0dcc80119120a2d162903); /* line */ 
            coverage_0x645ceaf0(0xa25df9a05cd1f9e2c3c84a0e68eeedb5e1ffc1393234db29e6427fb8188f5b07); /* statement */ 
channels[groupIndex].startComplaintBlockNumber = block.number;
coverage_0x645ceaf0(0x7e2d849134624ed4ed23bc5d19e19ece84f5d63e29b03b3a0a8816d5930d60b0); /* line */ 
            coverage_0x645ceaf0(0x69c8c55d85c41824765a9bcec1710ddc35c538e82f0bd89c5b517780e0f3983b); /* statement */ 
emit ComplaintSent(groupIndex, fromNodeIndex, toNodeIndex);
        } else {coverage_0x645ceaf0(0xb6e400b7052a4761897afc87adc9e17be85aca835882179a6e4e96ff0b557ce2); /* statement */ 
coverage_0x645ceaf0(0xdc3dd731db0c216c862f2dd30c160d3e04642b3fb95d72d989576a3ea4dd0bc4); /* branch */ 
if (isBroadcasted(groupIndex, toNodeIndex) && channels[groupIndex].nodeToComplaint != toNodeIndex) {coverage_0x645ceaf0(0xa8bfd83b0ed75b2483b04153e0a41cad41fcc8f4a899e15ae01fbe4597e8396d); /* branch */ 

coverage_0x645ceaf0(0x1db43bfebcbbc868d92a3678d1e6d5c826f63ca67b86e70cb3424240bf0cf2e7); /* line */ 
            coverage_0x645ceaf0(0x9a773cd05f4725ee2fc86a2fdf217bfba967618f603f4d2713addba20827010a); /* statement */ 
revert("One complaint has already sent");
        } else {coverage_0x645ceaf0(0x9804c64e36b14b7d656d677f5eac9fbaa6661ac896ca6234edf185fba3020a56); /* statement */ 
coverage_0x645ceaf0(0xa4ded7da104b9dcd583cf3b64ccd2e8e5fffece2072b142f6005f317480d6d9f); /* branch */ 
if (isBroadcasted(groupIndex, toNodeIndex) && channels[groupIndex].nodeToComplaint == toNodeIndex) {coverage_0x645ceaf0(0x019fe856efef5513243d545ac0252c4dd5de2be96e46504243d0e1c58733eb99); /* branch */ 

coverage_0x645ceaf0(0xa53289dce208eb5fda58eb4b9fa5810d7b998538d2cb2dfd96f8a57d6f5e66a0); /* line */ 
            coverage_0x645ceaf0(0x60b5961c9131816710470800b0091c49042712f4f33a9e8675cc5ed0ebe7a68d); /* assertPre */ 
coverage_0x645ceaf0(0xabf05fadd37ccb48515f65bdbc70932ec9314fa569f95eb43a11a3cc48a7c699); /* statement */ 
require(channels[groupIndex].startComplaintBlockNumber + 120 <= block.number, "One more complaint rejected");coverage_0x645ceaf0(0x5c59e9b9653257bff5bf14e9aa6ba02f92e98eecb2c8ed7cda013ff79d6a5531); /* assertPost */ 

            // need to penalty Node - toNodeIndex
coverage_0x645ceaf0(0x900871348566679087efb75da0c2e7106f680cfc18dd25d79411b57379aca63c); /* line */ 
            coverage_0x645ceaf0(0xb214b18ab441bbca0bed567d142004f150e292431a6249f4d65bf6530183d10c); /* statement */ 
finalizeSlashing(groupIndex, channels[groupIndex].nodeToComplaint);
        } else {coverage_0x645ceaf0(0x557a3ebd9ca0804f3278ff90ee37599b1104ae64134c3ef124fdd9b8c85449ac); /* statement */ 
coverage_0x645ceaf0(0x8fefc518f85b2d0285de573e7f6756647fe221eb8ced93f4098fe5073ab3342b); /* branch */ 
if (!isBroadcasted(groupIndex, toNodeIndex)) {coverage_0x645ceaf0(0xce23ca88c9b2aaa222c91314ca19cbe1fc07bdedef439e0f66dcf3824b188e4d); /* branch */ 

            // if node have not broadcasted params
coverage_0x645ceaf0(0x3a5e63e89b1412c1c35bc9c9406b88878cf4e4590fb1b2f311630160c7b24ca5); /* line */ 
            coverage_0x645ceaf0(0x327c3699dea40ecca574e96ac27ab2a5e1906ae689be3929c4143184198374fa); /* assertPre */ 
coverage_0x645ceaf0(0x7d0041221fcd14a90fecd789ab9865a5711b220d34a8c238ef14db1779bc86ac); /* statement */ 
require(channels[groupIndex].startedBlockNumber + 120 <= block.number, "Complaint rejected");coverage_0x645ceaf0(0xf19a5dafb60406b8c9b80040f0ca1a97f4d413bed4db743b1edef7b2b5be8632); /* assertPost */ 

            // need to penalty Node - toNodeIndex
coverage_0x645ceaf0(0x701def9629afb0997a9ffdda15dfc6baf72ba68467c08869fc472b4527fd7f8b); /* line */ 
            coverage_0x645ceaf0(0x9a9c475572b5580d761e5b168712a76e6329b17356a274aabe9c71bc97e87461); /* statement */ 
finalizeSlashing(groupIndex, channels[groupIndex].nodeToComplaint);
        }else { coverage_0x645ceaf0(0xf3ee6db3b00190ac200c3947de7bcaabeed7edafaf59eb4fe88e9cff103b0ec8); /* branch */ 
}}}}
    }

    function response(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint secretNumber,
        bytes calldata multipliedShare
    )
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
    {coverage_0x645ceaf0(0x9703955b0be7b485694c91752886d406fd9cd5682dac3e11231539b058648e8c); /* function */ 

coverage_0x645ceaf0(0xa65fd922f483162ffae3d97ebe295c95894a6f324a4540f81009bb144c1c6a56); /* line */ 
        coverage_0x645ceaf0(0xadb36f1d82d3b9b4d24ffbdfe9738763f50a5a8f6f7e01c2c3f044b128a8ccb1); /* assertPre */ 
coverage_0x645ceaf0(0x51e4a52159a727519e4ac8eb1a3f34782a9a9f3bf48af8b694fa6f81109f0c4f); /* statement */ 
require(channels[groupIndex].nodeToComplaint == fromNodeIndex, "Not this Node");coverage_0x645ceaf0(0x87cee31794f231dcbaff800a5087fa40a706bc8564a2442381b7e682d6b25676); /* assertPost */ 

coverage_0x645ceaf0(0x9510631b78b6a436c6b304dc79f5c1d73792272fd69a0a3e5edadbbcdbbeaf7d); /* line */ 
        coverage_0x645ceaf0(0xdd08514ff585af885affbdba26fb1d398041ca7eac8722920b5ad12d580cbca7); /* assertPre */ 
coverage_0x645ceaf0(0xfb770040b90f712710187ca4b52c6c515002f2628b010fe8373d140e4841c0f9); /* statement */ 
require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");coverage_0x645ceaf0(0xa927e3cd20d8b19d17801d028a7ab1506753572bdfd441f004ccf6b0272bc354); /* assertPost */ 


        // uint secret = decryptMessage(groupIndex, secretNumber);

        // DKG verification(secret key contribution, verification vector)
        // uint indexOfNode = findNode(groupIndex, fromNodeIndex);
        // bytes memory verVec = data[groupIndex][indexOfNode].verificationVector;
coverage_0x645ceaf0(0x195f4854b20d63348540dc062cef4754744e95e24eed1bfa0bbf60611068129a); /* line */ 
        coverage_0x645ceaf0(0x69066642b1b131622910ec94111026d33982f2cbca2b581f137381651d9b446c); /* statement */ 
bool verificationResult = verify(
            groupIndex,
            fromNodeIndex,
            secretNumber,
            multipliedShare
        );
coverage_0x645ceaf0(0x2b560cdeaabd75328fe1b504f34b2fa290f57024ba2eca1889d047a14108a4aa); /* line */ 
        coverage_0x645ceaf0(0xac4fcf8d2b7a0e72af4f1e091a6fac26281e643a1977cd7c7cb83cb2f180de2f); /* statement */ 
uint badNode = (verificationResult ? channels[groupIndex].fromNodeToComplaint : channels[groupIndex].nodeToComplaint);
coverage_0x645ceaf0(0xddf02e497fdd5464247998bb1655b70448d62768ac5fe8105e870d78bd8e20aa); /* line */ 
        coverage_0x645ceaf0(0x3eabc3fa75e396c9d252c276f4995a3fa3f5be16c3a7e6211c345b0cc1ddf10e); /* statement */ 
finalizeSlashing(groupIndex, badNode);
    }

    function allright(bytes32 groupIndex, uint fromNodeIndex)
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
    {coverage_0x645ceaf0(0xd0f3d49632a833347ec3b5016a959f41a9a40cfcf0c8f471d995d01f9c5df95e); /* function */ 

coverage_0x645ceaf0(0xaab8c2bc076289f1f00a2eb38ec61aa86668de1fdeec7f0dcc8f9b142399b1b2); /* line */ 
        coverage_0x645ceaf0(0x7db1630a6fa7a74cd16c34aa20e116d90f441711a62667317166faff5a265e39); /* assertPre */ 
coverage_0x645ceaf0(0xabdba8788817a8ee9f03006952a9297b9e20afc7bb292c2c93b7874fe025d4a5); /* statement */ 
require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");coverage_0x645ceaf0(0x76771bc0824c4ad27b34d135802696ff8dbebcc9aafe1d814546411637b29372); /* assertPost */ 

coverage_0x645ceaf0(0xfaddcf704d8f3774e0c84a511f1c8fe261bde3630202d2539938ce975b8acfe5); /* line */ 
        coverage_0x645ceaf0(0xc89b00b00dbd05fca134d579836b67ab0f9bfbbbcc2348d03e80421db81e8232); /* statement */ 
uint index = findNode(groupIndex, fromNodeIndex);
coverage_0x645ceaf0(0x3b6e4e07419601cb1107bcfb5d6a69adf501f2a79d220b05dc324a69b9e1c761); /* line */ 
        coverage_0x645ceaf0(0x8967c26ba14cc6b07a4ed453e4f0dd5ecfbf8629445697dd80b9a251b515ca13); /* statement */ 
uint numberOfParticipant = IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex);
coverage_0x645ceaf0(0x143dbe727f42c0b031ab689363f9c6d6fd805bc6b5a650bbfca9a8ed2a34b500); /* line */ 
        coverage_0x645ceaf0(0xf67f19a93b484eb2166417d9d8bd8b3971c9052c0093ebd8b42bda9b646c86b6); /* assertPre */ 
coverage_0x645ceaf0(0x8da6bf975e509a4c5913864a105730b90f92b1b42f36715aa2d538394ffc28d3); /* statement */ 
require(numberOfParticipant == channels[groupIndex].numberOfBroadcasted, "Still Broadcasting phase");coverage_0x645ceaf0(0xbfd89ae3f32329cc8609e2b65ae538cf99f2125c5eba7cb023abb107bc418176); /* assertPost */ 

coverage_0x645ceaf0(0xc6870cce371e750c593ebe78eaec295ea357cad3ff70ecead5136810c9661472); /* line */ 
        coverage_0x645ceaf0(0x94d44308446105afeebe3d2f0049262443feee827b77e062f41b4641749c3d05); /* assertPre */ 
coverage_0x645ceaf0(0xff625d07cf35f9edcdc10c22c05885637ab8eb5cba2aa390cc18b96b5973f26a); /* statement */ 
require(!channels[groupIndex].completed[index], "Node is already alright");coverage_0x645ceaf0(0x487d6beb9fb48a92ea475428b783ff2d3463c4c28cc429c94ac72ac871be8abb); /* assertPost */ 

coverage_0x645ceaf0(0x535cb0809ebd8e4c3b37f19b8f7514689bf6232150ee17de5ec8a260a494372b); /* line */ 
        coverage_0x645ceaf0(0x12506e5f2a13cdf71a08ce1b01c9db3417f1c973d616985a1e37f10c617bb381); /* statement */ 
channels[groupIndex].completed[index] = true;
coverage_0x645ceaf0(0x0e86874f5a4bf2256a8954e304585a06661ef29775e668e01bea458863d5b866); /* line */ 
        channels[groupIndex].numberOfCompleted++;
coverage_0x645ceaf0(0xd4809f6b740988cb700fa5a362824bc195d0139bcc53a6dba4baed6e97e43461); /* line */ 
        coverage_0x645ceaf0(0x588ea08757f0067c6b5983151c9ffc29d0b64f55ea6d99bb1b9e867829cdb54c); /* statement */ 
emit AllDataReceived(groupIndex, fromNodeIndex);
coverage_0x645ceaf0(0xf79623244c44d82f69f01ad8f7b7442a9ce9451ea451e1b992170f36f10ea7fd); /* line */ 
        coverage_0x645ceaf0(0x4cefee32005a17bee6cfe46be77b03006ffefe13637bfab548a0ee23f73012a1); /* statement */ 
if (channels[groupIndex].numberOfCompleted == numberOfParticipant) {coverage_0x645ceaf0(0x726f6821d5538a7e66ee093447d6c0fd3880f0e43adf33a3cf72eabfbcfa4fba); /* branch */ 

coverage_0x645ceaf0(0xa8e9354b9ccd59c5ca4411d5ad0b91c4016b502562accf4f6cf5c19c4c2e8039); /* line */ 
            coverage_0x645ceaf0(0xc8847feab090c4210e058dd9ab9683f26b7b747d2b1b89b034914fa2ce7cf3c9); /* statement */ 
IGroupsData(channels[groupIndex].dataAddress).setPublicKey(
                groupIndex,
                channels[groupIndex].publicKeyx.x,
                channels[groupIndex].publicKeyx.y,
                channels[groupIndex].publicKeyy.x,
                channels[groupIndex].publicKeyy.y
            );
coverage_0x645ceaf0(0xf8d2b429ba1e626174b83155041247c1431cf4e9f72a8956fadf004a48fe5eb4); /* line */ 
            delete channels[groupIndex];
coverage_0x645ceaf0(0xc3cf14bb15f5e5297ad658b7d764112db85657c05e79901f1631af6e89bb1661); /* line */ 
            coverage_0x645ceaf0(0x3490d4683243ba0c16788704cdcc2c56b422a8678e24916213bb98da471922d7); /* statement */ 
emit SuccessfulDKG(groupIndex);
        }else { coverage_0x645ceaf0(0xc652791869a4c4eb9391aa1c3171f490443cd38686cfbeb6a69c83fe34aa606d); /* branch */ 
}
    }

    function isChannelOpened(bytes32 groupIndex) external view returns (bool) {coverage_0x645ceaf0(0x9e76af25e674d7d95461f2cb9df5fa1268e416e46f3aae3a3fdeddae2b487455); /* function */ 

coverage_0x645ceaf0(0x00cdcf1032dc71818c8ab3d94e31248c8700bc50383bb028bb2fff9e30aa3b3d); /* line */ 
        coverage_0x645ceaf0(0x19f87fe5f6dff2315b413b97a55dc3c4d53919125c6008b0c75b339ecad8d1f0); /* statement */ 
return channels[groupIndex].active;
    }

    function isBroadcastPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {coverage_0x645ceaf0(0x9b7f66a00fc58f2dec8331df32acf369cd5d278dcaf304542417690a6e46b014); /* function */ 

coverage_0x645ceaf0(0x72115064f070bf97188cfdbe7d3072ae9ddce87350735a0214f21511af0c1873); /* line */ 
        coverage_0x645ceaf0(0x4829852004d8b8d8695413c31e512f5e02b7e8808613f8eb10b54aa44468d5ec); /* statement */ 
uint index = findNode(groupIndex, nodeIndex);
coverage_0x645ceaf0(0x2f0c24d58fb2f65e4c48d40d4c14c78686c8acbf2e14ceac5aae4a25599fb9a1); /* line */ 
        coverage_0x645ceaf0(0xc638ba461a7356f65b0bed42c8e72a99b41b8f64ef435b145e511541874e7baf); /* statement */ 
return channels[groupIndex].active &&
            index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            isNodeByMessageSender(nodeIndex, msg.sender) &&
            !channels[groupIndex].broadcasted[index];
    }

    function isComplaintPossible(bytes32 groupIndex, uint fromNodeIndex, uint toNodeIndex) external view returns (bool) {coverage_0x645ceaf0(0x5b16fa37d70755d20025234e165b195624a2802d3d614de039674323eb8d4145); /* function */ 

coverage_0x645ceaf0(0xc920618cee0cbdd837e2f5530aad27b7451226c70abbb558b7fcfb7340740a93); /* line */ 
        coverage_0x645ceaf0(0xce6b35e812cb66c5aa01fc41aca0223b6622fb78d3a87fa77955e59c83985c3e); /* statement */ 
uint indexFrom = findNode(groupIndex, fromNodeIndex);
coverage_0x645ceaf0(0x725786b4eda1c4f6857f68bf325b9cdbae9036477993d4330f8f7a97245617f1); /* line */ 
        coverage_0x645ceaf0(0x30fa002297fa4c88c67b8818992fbad188d4be085fe5e4908bbc13efe41d1b87); /* statement */ 
uint indexTo = findNode(groupIndex, toNodeIndex);
coverage_0x645ceaf0(0x2004d3fc0b078c5c901918a26341147c3e7e37b45853894cd59995fd649af019); /* line */ 
        coverage_0x645ceaf0(0xb587697ae511fec9ffe9e3a6a02e96edeed9a092038cdfa70089defb16357a3a); /* statement */ 
bool complaintSending = channels[groupIndex].nodeToComplaint == uint(-1) ||
            (
                channels[groupIndex].broadcasted[indexTo] &&
                channels[groupIndex].startComplaintBlockNumber + 120 <= block.number &&
                channels[groupIndex].nodeToComplaint == toNodeIndex
            ) ||
            (
                !channels[groupIndex].broadcasted[indexTo] &&
                channels[groupIndex].nodeToComplaint == toNodeIndex &&
                channels[groupIndex].startedBlockNumber + 120 <= block.number
            );
coverage_0x645ceaf0(0xeb89e3264cfd6ee067b06f4d2e874a5a39d4f0ab0d75874402ffb62dc4f34206); /* line */ 
        coverage_0x645ceaf0(0x5ac4225814f91745b97db9bbf9fceece5fab67f91465e02fe5daebaffd43ba24); /* statement */ 
return channels[groupIndex].active &&
            indexFrom < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            indexTo < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            isNodeByMessageSender(fromNodeIndex, msg.sender) &&
            complaintSending;
    }

    function isAlrightPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {coverage_0x645ceaf0(0x61cbc044755161fd47aef5a95c45935bd81adc0ededbc1075dace4e50f0591c0); /* function */ 

coverage_0x645ceaf0(0x6703af190f23fa0307fdcf26c14bd33b311b83ebb77c5996249b90efa161b79c); /* line */ 
        coverage_0x645ceaf0(0xe76b03b1ca77270af1b5acd7738b5077b7d8b76b628fb1f72184ab6d64db914f); /* statement */ 
uint index = findNode(groupIndex, nodeIndex);
coverage_0x645ceaf0(0x9f0117f1f2f1dc3ad81fc655d51947e99336d8a4cc63a39a746bb98ce5e224a6); /* line */ 
        coverage_0x645ceaf0(0x516f8ca6ca46378aab5484e47a471090a4a5c65eed6f81dab28412a1a0339f83); /* statement */ 
return channels[groupIndex].active &&
            index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            isNodeByMessageSender(nodeIndex, msg.sender) &&
            IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) == channels[groupIndex].numberOfBroadcasted &&
            !channels[groupIndex].completed[index];
    }

    function isResponsePossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {coverage_0x645ceaf0(0x4f1964ff642f55137e00b9e9c61fe6ee40572eb748f94a543ca791c0585f13a7); /* function */ 

coverage_0x645ceaf0(0xf001358367377b2ad9e818cffca120a87dd6212700f4b9be7d62b6cb33ccab38); /* line */ 
        coverage_0x645ceaf0(0x77a00048c8ab7bf07710265c0067c0927c7096abc924fff85789e15345176811); /* statement */ 
uint index = findNode(groupIndex, nodeIndex);
coverage_0x645ceaf0(0xc82fba232ecdf58bde23a13157c639fe3390dacd62ad91439285afb8b75585cc); /* line */ 
        coverage_0x645ceaf0(0x13228b2c93953411d69ee875ebf3035b0b5a66815838d6a69f05dac98a734fc6); /* statement */ 
return channels[groupIndex].active &&
            index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            isNodeByMessageSender(nodeIndex, msg.sender) &&
            channels[groupIndex].nodeToComplaint == nodeIndex;
    }

    function finalizeSlashing(bytes32 groupIndex, uint badNode) internal {coverage_0x645ceaf0(0xc7797167c312a23c53c4ca9803a9b789877541ec0397aed73101536fcac00397); /* function */ 

coverage_0x645ceaf0(0x7b244c736d618bf6fe0b292614c79cc22f709e017017a01f18905d0ef42559c9); /* line */ 
        coverage_0x645ceaf0(0x371d692b1787eb1cf9fe20c99994ed63d2fd29663e1d6010b00705524ccb9ee1); /* statement */ 
SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            contractManager.getContract("SchainsFunctionalityInternal"));
coverage_0x645ceaf0(0x902c120bba81b2a7f6d83be4a7e9c9c943962b7f8849f4aac8fdead471d5f526); /* line */ 
        coverage_0x645ceaf0(0x9703a7c5f30524d3b14e197b875d0b94446f466830200d81ac990dbc649a4606); /* statement */ 
SchainsFunctionality schainsFunctionality = SchainsFunctionality(
            contractManager.getContract("SchainsFunctionality"));

coverage_0x645ceaf0(0x33f3281780b270489637535bda843d158157f93f6c513e2d43a9d325f1b340b7); /* line */ 
        coverage_0x645ceaf0(0x50129aedea4b3b45f7c097dbfc2f1ddff9303a270fa1b726622305fcf4bda8f3); /* statement */ 
emit BadGuy(badNode);
coverage_0x645ceaf0(0xf7ad1d9521833601d2b7ec0268ae2929bda14f608fd06948c216d51f6043643c); /* line */ 
        coverage_0x645ceaf0(0xdf9bfac806bb792c5cf0e3e431db0ccca65fa2fbcc46e30b5d8f152626dfb3e6); /* statement */ 
emit FailedDKG(groupIndex);
coverage_0x645ceaf0(0x8bba511b0e6ed28dbb063a0a5dc914b88ae143b2f58a223e79c91d42be73f397); /* line */ 
        coverage_0x645ceaf0(0x194a2fa03ba9a755607a1bc5b341891e16376957812d7fbb8cb976cee06aca26); /* statement */ 
if (schainsFunctionalityInternal.isAnyFreeNode(groupIndex)) {coverage_0x645ceaf0(0x664124028aa7382b3057e994ed76f08a458c81ae5fbedddddebd6318836a2bcd); /* branch */ 

coverage_0x645ceaf0(0x5479f4d95388904a972133cbc5f3567998bc02bc8a3baa8567b9b1eb40280a8f); /* line */ 
            coverage_0x645ceaf0(0x5cb471725b190f35087c9820c09d41f3eb9903b1db38db4de90cfc807f0da878); /* statement */ 
uint newNode = schainsFunctionality.rotateNode(
                badNode,
                groupIndex
            );
coverage_0x645ceaf0(0xebe8e8da6397f033d29022e620e95f65f923e39663ffe8a98766bc155464db79); /* line */ 
            coverage_0x645ceaf0(0xe7d57a61c1bf8d4d60ff8716fc62b1d9b3f8f7fb79f3568c9b1dfbd799ae1044); /* statement */ 
emit NewGuy(newNode);
coverage_0x645ceaf0(0xf90c8bdb7a642977f5fd4a5cf6d6fd60baeae3ca733164f32a0a3172884e3864); /* line */ 
            delete channels[groupIndex];
coverage_0x645ceaf0(0x06f8ae87216a55771a33af342401d0b0e187ba3306ed382a362aeb7c829f68c7); /* line */ 
            coverage_0x645ceaf0(0xcd63aaa848fd49a829213a87c57b50aabb9fd974f39d20e660f8316ad0bc8e90); /* statement */ 
this.openChannel(groupIndex);
        } else {coverage_0x645ceaf0(0x43b3d800e895d35d9899bd909c4df2a9908ec08eb1cf5dfd801bd1ebe371284a); /* branch */ 

coverage_0x645ceaf0(0x614bf0464eb2b5868c5158c465bffd98a0dca471031dbf4b1ca0c0483da1d354); /* line */ 
            coverage_0x645ceaf0(0x4c05804d0e9196eb117392fd5c2894c5dd687e4c6a676eec28c807f9b41e4113); /* statement */ 
schainsFunctionalityInternal.removeNodeFromSchain(
                badNode,
                groupIndex
            );
coverage_0x645ceaf0(0x86fab1b80b73dbffb6e3f3a3b14386c4a7afee5b2d85ca1e7b0891095f20f3dc); /* line */ 
            coverage_0x645ceaf0(0x7c551b2509db939e83abdc87f14aee1ff833f9e651255fe8ae4ae2eadab2da50); /* statement */ 
IGroupsData(channels[groupIndex].dataAddress).setGroupFailedDKG(groupIndex);
coverage_0x645ceaf0(0x6f105f6f657d208358b12762e41d487dee52dac17c211ed9ec013bcd8a2df94d); /* line */ 
            delete channels[groupIndex];
        }
    }

    function verify(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint secretNumber,
        bytes memory multipliedShare
    )
        internal
        view
        returns (bool)
    {coverage_0x645ceaf0(0x24607103f6ffa6d6ee0f2abf72e03c428f75b35152e8229ce75744aed856daf6); /* function */ 

coverage_0x645ceaf0(0xe1e28b9e7fe45af0b36b7b3969ae683682f3bfbb58a5778facfa585f9f36b7d1); /* line */ 
        coverage_0x645ceaf0(0x8bb0c299572296804c55d16bebe741ea26039472167e324b4bc9830a554db798); /* statement */ 
uint index = findNode(groupIndex, fromNodeIndex);
coverage_0x645ceaf0(0x8be74a2120cde7350a98cb93a3687aa93dea6e9a35c1d617bd7d9e4daa2e0202); /* line */ 
        coverage_0x645ceaf0(0xb8490e8d28d8823b2d2b2c54d9d1760c212b22d67b4e6c4d5cca54f3ed801888); /* statement */ 
uint secret = decryptMessage(groupIndex, secretNumber);
coverage_0x645ceaf0(0x989b1dcda648b510993da497ef8b4866a95d362fc44e08a25523c63dede2c583); /* line */ 
        coverage_0x645ceaf0(0xc904a64c43f661edebe71c49230ba78efb7f650c67b03f9d184e20fd9392b4c4); /* statement */ 
bytes memory verificationVector = data[groupIndex][index].verificationVector;
coverage_0x645ceaf0(0x52dee84762bab6a24332f077f6341f37bb67e776cbb5923e6c5e989a26ec4dba); /* line */ 
        coverage_0x645ceaf0(0x8c62c9869e24242762e9322ff24757ed9e010f956aeca258fafdda91d56431d3); /* statement */ 
Fp2 memory valX = Fp2({x: 0, y: 0});
coverage_0x645ceaf0(0x988204c34904d3d7e00ccdeae4efbf2a67fea73793b33ded24ca32572d3a00b1); /* line */ 
        coverage_0x645ceaf0(0x0f2a4651c79a4f5c8b4f96d9578019505a6bffffa550a2ae547dd9d130ba66b7); /* statement */ 
Fp2 memory valY = Fp2({x: 1, y: 0});
coverage_0x645ceaf0(0xf055a374ad755087fda2b894464cb7f16c70b125ec845e7e9d0230f293e0dfe7); /* line */ 
        coverage_0x645ceaf0(0x1758514e1f359585551bb5c478bbc5b1f6f2ede29a163bccfae5d31e4de5ae18); /* statement */ 
Fp2 memory tmpX = Fp2({x: 0, y: 0});
coverage_0x645ceaf0(0x443d13a036c80d1108558341c257260ce70e43acf1b81df9a40cf13e1d3d7e63); /* line */ 
        coverage_0x645ceaf0(0xb779e767af383b32e6b8d5b64e869caeddede155b9ce411fee374111ea847bf5); /* statement */ 
Fp2 memory tmpY = Fp2({x: 1, y: 0});
coverage_0x645ceaf0(0x3c70b9b6181ba10d2b73169dce25bd60d064f4583ce8e8cac3b111c12eb19f53); /* line */ 
        coverage_0x645ceaf0(0x20f7deef3aee073cb741371e50ff9d34237774bf35e47c69f65794740bcb8ee2); /* statement */ 
for (uint i = 0; i < verificationVector.length / 128; i++) {
coverage_0x645ceaf0(0xaa12cea96f52fec0f9926dab1b50a3cf2f5b6e0441f4457b264fbc3c8e5d3ef2); /* line */ 
            coverage_0x645ceaf0(0xc6408e5f7132d6257f7a9ff189e385d015fa5108c3f158120699d2433f3a35a1); /* statement */ 
(tmpX, tmpY) = loop(index, verificationVector, i);
coverage_0x645ceaf0(0xf0ae3c6edc1c38c03a22f6f9f9ed89c909dcf250e688022b2a16d3ac367d9522); /* line */ 
            coverage_0x645ceaf0(0x04cd9fefe6ba797ff8f70b09fc0c26cf98a143a66c341f5c8ac614a03f81532c); /* statement */ 
(valX, valY) = addG2(
                tmpX,
                tmpY,
                valX,
                valY
            );
        }
coverage_0x645ceaf0(0x69ce34c0b190a6ea2eb33ba99397d2c6d96c9d2663f275a6d5bdd7a316494576); /* line */ 
        coverage_0x645ceaf0(0x426c66e9ae38f5e94fe43975b0166bf900925202fa7409e3c93fb8f4a2c6748e); /* statement */ 
return checkDKGVerification(valX, valY, multipliedShare) && checkCorrectMultipliedShare(multipliedShare, secret);
    }

    function getCommonPublicKey(bytes32 groupIndex, uint256 secretNumber) internal view returns (bytes32 key) {coverage_0x645ceaf0(0x06eec983deb42961b2156142de8df2976e8d6e38cf428a612b516ce0f8a23b39); /* function */ 

coverage_0x645ceaf0(0x931f00672b13ec4418dcb6b05784b3bb6bbd0537a18355a7b6d445090f85f86b); /* line */ 
        coverage_0x645ceaf0(0xd9f829466668cda0d2592ac5bb102e5fdbe31c9ee6688dcc53f06651a38f1ff9); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x645ceaf0(0xb9c52d915350d8271f9b78f8227c2c9a62f67744201ca1062d678df3055fc3c0); /* line */ 
        coverage_0x645ceaf0(0x308b2397526ce5e79d26ae7c47f81505fb0e0d142b3d0be0aac46ccdfd625aef); /* statement */ 
address ecdhAddress = contractManager.contracts(keccak256(abi.encodePacked("ECDH")));
coverage_0x645ceaf0(0xae2f459d0d4fe8cc6a0c82076332fb3f5a7d6e47022f963313b15724d23bc6cb); /* line */ 
        coverage_0x645ceaf0(0xb749ab13287f236785c23a7d27979f8621327349497943c1e824148924301cd0); /* statement */ 
bytes memory publicKey = INodesData(nodesDataAddress).getNodePublicKey(channels[groupIndex].fromNodeToComplaint);
coverage_0x645ceaf0(0x3e2862b03a2adce287ac7de93b97af27caea1917069d6b8b640dad853f57a852); /* line */ 
        coverage_0x645ceaf0(0x65fcde1c9cfa4bcc4cb6a38b3bf1992dd08df47a63b079b9e7afb8a0ab0f55fa); /* statement */ 
uint256 pkX;
coverage_0x645ceaf0(0xe5b5bb934706aa68a920dba91d765ea017b9426a8bf0e420179d03b227338fcf); /* line */ 
        coverage_0x645ceaf0(0xd961532a339fc18363f692c94b3057a9c4b1d2d92765792fc629d9b59742fc55); /* statement */ 
uint256 pkY;

coverage_0x645ceaf0(0xd526b823aac4d6519de9114df8f1fd75eb3cf56bf910759aece495eefe99305f); /* line */ 
        coverage_0x645ceaf0(0x1037c0428487bac8aa8c08f6e904ffbb28f351b3e7a38f23bd4010c0642d700a); /* statement */ 
(pkX, pkY) = bytesToPublicKey(publicKey);

coverage_0x645ceaf0(0xf0b59ed7be807fbbe78526fe2b2994ee8c444554a014997f964ede692c1ef5d1); /* line */ 
        coverage_0x645ceaf0(0x53a87dcf330e20a71106d00d2a799d7fbf8bdc3a6506123fbc0df646747c76fc); /* statement */ 
(pkX, pkY) = IECDH(ecdhAddress).deriveKey(secretNumber, pkX, pkY);

coverage_0x645ceaf0(0x72777f6eaf2f791b070e83616ec32c933ee25adcb5ed0d3c7bbf4f577df80c47); /* line */ 
        coverage_0x645ceaf0(0xa37872b56ad4b1f655ae14879717db11041be53799486ce238d84f0c303d325d); /* statement */ 
key = bytes32(pkX);
    }

    /*function hashed(uint x) public pure returns (bytes32) {
        return sha256(abi.encodePacked(uint2str(x)));
    }

    function toBytes(uint256 x) internal pure returns (bytes memory b) {
        b = new bytes(32);
        assembly { mstore(add(b, 32), x) }
    }

    function uint2str(uint num) internal pure returns (string memory) {
        if (num == 0) {
            return "0";
        }
        uint j = num;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        uint num2 = num;
        while (num2 != 0) {
            bstr[k--] = byte(uint8(48 + num2 % 10));
            num2 /= 10;
        }
        return string(bstr);
    }

    function bytes32ToString(bytes32 x) internal pure returns (string memory) {
        bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (uint j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }*/

    function decryptMessage(bytes32 groupIndex, uint secretNumber) internal view returns (uint) {coverage_0x645ceaf0(0xc7f6faf3b568f69475b894240139fae6799e8d5e140056f7b82c70d54dc82ba8); /* function */ 

coverage_0x645ceaf0(0x4fb365bfba9a23257c5635e12044a6560aafd54dcd97fc8d9f9c924be5efec2e); /* line */ 
        coverage_0x645ceaf0(0x963dcbb36c90a9542062d529a56f85886bda5e1ebc2187f78c563029311be044); /* statement */ 
address decryptionAddress = contractManager.contracts(keccak256(abi.encodePacked("Decryption")));

coverage_0x645ceaf0(0xba6ee1fa47e2b4254f0ef0dfd70a242fbf8f0bda7e5ae36f40bc15311d2b254e); /* line */ 
        coverage_0x645ceaf0(0xc30694d37d24761dc9c6447b4c1ad9dfda908643c5dc260062e450645f3b0b7d); /* statement */ 
bytes32 key = getCommonPublicKey(groupIndex, secretNumber);

        // Decrypt secret key contribution
coverage_0x645ceaf0(0xc61266a0aa69f793af6296a2223adaaab47fa50830fde1f3977ef8de235b8e4b); /* line */ 
        coverage_0x645ceaf0(0xe7ada9121f379bcd4bd545783cea8790a3b5566adebe15cbf87c1fee94466e7a); /* statement */ 
bytes32 ciphertext;
coverage_0x645ceaf0(0xd1e4b855cf6812c0b350ea6acc50d2ba1fce89713be9e7ef1cdd390b13b3442b); /* line */ 
        coverage_0x645ceaf0(0xe07c28730abfde5c6027fbbc95aeb9a268949c7849da1bb6030f6dd3063714b2); /* statement */ 
uint index = findNode(groupIndex, channels[groupIndex].fromNodeToComplaint);
coverage_0x645ceaf0(0x966d22a2a4dd719d83f8c0289c025281ce8e41e87906ba79f600f70d01ebd9e5); /* line */ 
        coverage_0x645ceaf0(0x89605c6925059355048ec606809d17dd375fc6da74c6a60499de6f9e88c6fe10); /* statement */ 
uint indexOfNode = findNode(groupIndex, channels[groupIndex].nodeToComplaint);
coverage_0x645ceaf0(0x9abb3ff91b0fee41223e6234f0a5e90f811e9a00518c2ce2a8a7ec03c04185ed); /* line */ 
        coverage_0x645ceaf0(0xcce942a2dd80080a44f37f3b0af6d67cfa384bb5eeba9e568b02aa24395f3033); /* statement */ 
bytes memory sc = data[groupIndex][indexOfNode].secretKeyContribution;
coverage_0x645ceaf0(0x6cf5a26b36d17a74fd73b3dac1aa13b7e49167740ed15beede3241ff8ffe1d38); /* line */ 
        assembly {
            ciphertext := mload(add(sc, add(32, mul(index, 97))))
        }

coverage_0x645ceaf0(0xbf8b8389be8886b82b33a62de7b23e70345b48f83925dc519700536f975773cc); /* line */ 
        coverage_0x645ceaf0(0x4c5d3f5320d9d717aabb1b80e34f7e3043d26ca332ceea29a4bf3904926dbb4d); /* statement */ 
uint secret = IDecryption(decryptionAddress).decrypt(ciphertext, key);
coverage_0x645ceaf0(0xa288e2357d9d0bb5a8e5f7665b479d3ddf8f23d1660992813e6fa50fff67106a); /* line */ 
        coverage_0x645ceaf0(0xa7b0c484a4f542f04f0c0a7281af8085e9d9e672b6ea1bdcec9587eee5cc5777); /* statement */ 
return secret;
    }

    function adding(
        bytes32 groupIndex,
        uint x1,
        uint y1,
        uint x2,
        uint y2
    )
        internal
    {coverage_0x645ceaf0(0x3424dac9ffa62f64a918423fe57273929eab357cce281569dc78a30f954bf4c9); /* function */ 

coverage_0x645ceaf0(0x5940bcc3afcf18590ed495b4328341293b3089e82799c747bef58560f28ca632); /* line */ 
        coverage_0x645ceaf0(0x20a37630c77c37e1ab0830948092549eb69baa45be5b0ea2a04b3902680e8cbd); /* assertPre */ 
coverage_0x645ceaf0(0x208e820e0fd12a6d081c6fccd75c9bf82ac4ce430a991bdbe3e8de728cb4e64e); /* statement */ 
require(isG2(Fp2({ x: x1, y: y1 }), Fp2({ x: x2, y: y2 })), "Incorrect G2 point");coverage_0x645ceaf0(0x27c392e6fed2449dc1aeda0d80cbbc31e07df993f2715e25661af10d42852519); /* assertPost */ 

coverage_0x645ceaf0(0x3ef596a35daac48dcf08d98e987cdebdc8628f7f7640f67b50e8a2ac032cda94); /* line */ 
        coverage_0x645ceaf0(0xffaa9a66f8912a5c78bbbcf676897e8d95ab27fe81de1436171c66a26fef704d); /* statement */ 
(channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = addG2(
            Fp2({ x: x1, y: y1 }),
            Fp2({ x: x2, y: y2 }),
            channels[groupIndex].publicKeyx,
            channels[groupIndex].publicKeyy
        );
    }

    function isBroadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes memory sc,
        bytes memory vv
    )
        internal
    {coverage_0x645ceaf0(0x59534b3f052b3e521999f693e022c1c41b3b5a6b923d343bc6f189d1704249c5); /* function */ 

coverage_0x645ceaf0(0x025b373c7f64e9f23360115b973f730c4c918c0dca900d30f03e221ee2336b3f); /* line */ 
        coverage_0x645ceaf0(0xbaa8b59b30ec7fffce5cd02a6925a8af5ea6a9f5dd948402090c317f021a28a4); /* statement */ 
uint index = findNode(groupIndex, nodeIndex);
coverage_0x645ceaf0(0xdce36e72f1a2be9690f9a0c6f059d8b8a27eec6b9e18a0bc07332da164517cdc); /* line */ 
        coverage_0x645ceaf0(0x16a04a8745816e40ced66f452844dbd76619313886af5228340e1324729dda3a); /* assertPre */ 
coverage_0x645ceaf0(0xdde7bfb219fa6665d046e8f59a300ee2f3deedc0ec48353cb63ec2eecc285410); /* statement */ 
require(channels[groupIndex].broadcasted[index] == false, "This node is already broadcasted");coverage_0x645ceaf0(0x167fc4da3f164a8bacb7672401de1c7d27fcaf8a605cb9747a2ba3d1500f6b67); /* assertPost */ 

coverage_0x645ceaf0(0xf4707d6e4caff1f091c22f2ecfd3f0e213b5bb0ab7cd80d863bba2a547cc5c0f); /* line */ 
        coverage_0x645ceaf0(0xc38be4c02086d404c4c4e4fe5b0882b53aa9bd817e7d72ea10ee3a3115c72067); /* statement */ 
channels[groupIndex].broadcasted[index] = true;
coverage_0x645ceaf0(0x8d93a9375b0920a802ad8d5b36690ca0d484f27430c60ca38186d653fc3d0b0a); /* line */ 
        channels[groupIndex].numberOfBroadcasted++;
coverage_0x645ceaf0(0x086457f34e26bdb86760562fc7d4ac4605a52f0b3dce8048649c3e3098a392c7); /* line */ 
        coverage_0x645ceaf0(0x236380fb64b6491525df8f1f2406d8940c1a6a6315ae225011cfbff6bc01ce16); /* statement */ 
data[groupIndex][index] = BroadcastedData({
            secretKeyContribution: sc,
            verificationVector: vv
        });
    }

    function isBroadcasted(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {coverage_0x645ceaf0(0xfb3c66a70f7b9d95a89bfbb06f6eb56f97f0a3c7683d0c7d1853b7e88a0feaaa); /* function */ 

coverage_0x645ceaf0(0x2abc5f3dad104fe9ed73a6b1b9391e3c193228ff853d65f666cf917d79258661); /* line */ 
        coverage_0x645ceaf0(0x604ec66ccec791536d007c081da6f330478f26064c8531400987df181220860d); /* statement */ 
uint index = findNode(groupIndex, nodeIndex);
coverage_0x645ceaf0(0x3de9964c5fb3cbdcc1f19e1afd6c642630b6b844f18b7610c587ba47d11fdfbd); /* line */ 
        coverage_0x645ceaf0(0xfb890ff38c614ad7d39c5a792c7d90c9ac00f619901f471c68a6b9e36a956d49); /* statement */ 
return channels[groupIndex].broadcasted[index];
    }

    function findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint) {coverage_0x645ceaf0(0x9e0869d618dde668a087681213b9df9a5f17972cc6cd7c005f37a1e6f9121ba5); /* function */ 

coverage_0x645ceaf0(0x9439c3110fdea480a8819a757db2cfb5201bc2194036e8606db1bd325109cded); /* line */ 
        coverage_0x645ceaf0(0xc8b15ab2d9276597d3b99427c3bc1fbcdd1f9f60fd34e9633a9bc77c7498f47b); /* statement */ 
uint[] memory nodesInGroup = IGroupsData(channels[groupIndex].dataAddress).getNodesInGroup(groupIndex);
coverage_0x645ceaf0(0x0150b21f5ee420bc8851a7f925f3b61470c1a56589a50b91b9e9368acc63c9cd); /* line */ 
        coverage_0x645ceaf0(0x21e85e87fb78ea15e7e5a7db02c194d15bddf6b1482a998176ac064dc81dfde6); /* statement */ 
uint correctIndex = nodesInGroup.length;
coverage_0x645ceaf0(0xf5aab728a245e724a01143ffe41602e8ddfa85ea198c923fbfe7eb76e15ca0a1); /* line */ 
        coverage_0x645ceaf0(0x7201912c565776c2f92ffc867f42ee50d3b518630c86d418bfa7ba992c22cd3b); /* statement */ 
bool set = false;
coverage_0x645ceaf0(0x7b9b2c6c05f5353bdeb5d32f0d68ab508b7cc790dcf05a83e17b30d388ceaef1); /* line */ 
        coverage_0x645ceaf0(0xe84a1d30d50cab6ffe2e76f9d2d2ebb83c9a5502903708f84e8bafa308e4e652); /* statement */ 
for (uint index = 0; index < nodesInGroup.length; index++) {
coverage_0x645ceaf0(0x371d62cd6bac1debce8db3c99ef42c58609baa2e2abdc4fc2c5d54bfb8c5d02e); /* line */ 
            coverage_0x645ceaf0(0x5faa202affb6f827018d4652be93787815e0f87cd3945d4f6ec218bd599ced04); /* statement */ 
if (nodesInGroup[index] == nodeIndex && !set) {coverage_0x645ceaf0(0x596b97876939f8730377ff04a1e6bd1c2a7ed0b62e0445e7f20de09b09cf636c); /* branch */ 

coverage_0x645ceaf0(0xbeb7948f14d1d4b295120b11809ae26372b70f206acba383aa6f55cc25cd6d91); /* line */ 
                coverage_0x645ceaf0(0xa3c4ecfd00383749dfc8f9cdee82a4c92e3d6243075fc474d77448210585fb00); /* statement */ 
correctIndex = index;
coverage_0x645ceaf0(0xb80a3f81b3c49eae296bd024e7ae646faa264f29e3bd89f9c98073cbab431166); /* line */ 
                coverage_0x645ceaf0(0x2c14e64b58d8db6b0ed7f68cad7722238a718161fd24fa4b8428d60accb27235); /* statement */ 
set = true;
            }else { coverage_0x645ceaf0(0x6b6ee9482402a446188ac9593e763db6a85df9dc76789145d399f8fbd7b0593f); /* branch */ 
}
        }
coverage_0x645ceaf0(0x9a8a3016b71ab58232ffd55c9add812183933e0b1a24604456327c4d20fdedcf); /* line */ 
        coverage_0x645ceaf0(0xa5347e30ef1011998fffa36c648133f9e282e9fb0c6d04d24cfaafafadd89113); /* statement */ 
return correctIndex;
    }

    function isNodeByMessageSender(uint nodeIndex, address from) internal view returns (bool) {coverage_0x645ceaf0(0xa0b5626e0572461f87f6500b2edf7336b30eee6b5b29a4979364d5a96b7e2c1b); /* function */ 

coverage_0x645ceaf0(0x28a5f6accce6ffd3c21c9ff7b4d130772f871c3b486e4a54c85b4cb814cd006b); /* line */ 
        coverage_0x645ceaf0(0xfb665f9755c8b42b2d019dac15a274741fa3cc0fd176ad00c8b784be517da1cc); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x645ceaf0(0x759c5fea589f8b9e382b3ca46bb9d660eca77b74f74ccd045b7a7b6ea7651256); /* line */ 
        coverage_0x645ceaf0(0x35e5a929dacd835ad5007967b3b1e4b409ca7c4e451a85892dcc64a9b467131d); /* statement */ 
return INodesData(nodesDataAddress).isNodeExist(from, nodeIndex);
    }

    // Fp2 operations

    function addFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0x9208d867432faad615719ea1e56e04de3e3bdccac02b6b1514f35eff70ba7f10); /* function */ 

coverage_0x645ceaf0(0xa95d63d1a8124ef0de62a2cfb25e188d399cc5401b9f6f3fc249d3e7c10071df); /* line */ 
        coverage_0x645ceaf0(0x36d50c7b92c5196ea4d0638107d7549128ddd5df64af208733c04ee05978f0a7); /* statement */ 
return Fp2({ x: addmod(a.x, b.x, P), y: addmod(a.y, b.y, P) });
    }

    function scalarMulFp2(uint scalar, Fp2 memory a) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0x877e97abbc2d6d8cd3e1f1390e231d39d70d4ab71291461f764508f7478d683f); /* function */ 

coverage_0x645ceaf0(0xf5a0cc0407b1e544916bd93cdc1403b472feedc705ab9a10cea298bb0404cdb8); /* line */ 
        coverage_0x645ceaf0(0x9258549fbd6d56aa111080854ccc470feb3f7fe6189efe4bdde3e217c3389df2); /* statement */ 
return Fp2({ x: mulmod(scalar, a.x, P), y: mulmod(scalar, a.y, P) });
    }

    function minusFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0x4ad89662fd10bf9c17b181fcbdc92b10f720069a652a9d234e4f4e4bc3a58c68); /* function */ 

coverage_0x645ceaf0(0x8ab5fa2a60f1a24c9eb6602c29605ee0c4682966b2eff01b5b58dfda055a83f2); /* line */ 
        coverage_0x645ceaf0(0xf03865be24d617d74925bf8f360217357f322099f2fc0780127f867441ee8563); /* statement */ 
uint first;
coverage_0x645ceaf0(0x0109d28032ca1c626b53fbeb15df9dfc273fdbc453e3e25bd6a10326f4ea4fd7); /* line */ 
        coverage_0x645ceaf0(0xfa2485da355ee4294a6b4439d53fc7038cb9e073b81616e013de6d81e0ea3e65); /* statement */ 
uint second;
coverage_0x645ceaf0(0xc0fdec4ac9deca0018dcbda65fc3379ff2fec69ef3d1b2fffe66e9c51a4d7595); /* line */ 
        coverage_0x645ceaf0(0x2335a47648d1a4814d33da1644e011e82906056b26f7c1acd1dc42a038c42313); /* statement */ 
if (a.x >= b.x) {coverage_0x645ceaf0(0xa20ee0ef33c2e9a034c6808b38903e70776360635a9468e942b19d3eab450551); /* branch */ 

coverage_0x645ceaf0(0x8a990ea558e4b5bae7c18e18f177ffae82538b0e3b74f41fbcd7241b0f2577c6); /* line */ 
            coverage_0x645ceaf0(0xe4c3c54340bcc6f01f5cf5f69c2c69910b6e79584ca55fa15818c3d8cbf6422c); /* statement */ 
first = addmod(a.x, P - b.x, P);
        } else {coverage_0x645ceaf0(0x75a6eefdb452249f672a8b14d33498f55b738457d842c23cc836c1ec467f9f55); /* branch */ 

coverage_0x645ceaf0(0x1f396bda12a6ded6dab9c66e6ff3b1adb3e27d25488b9b3769aad3301f832ae0); /* line */ 
            coverage_0x645ceaf0(0xf1d6e74ff5891412a113925520e4bf5ef1c8dae0496c07120be204791edc7af6); /* statement */ 
first = P - addmod(b.x, P - a.x, P);
        }
coverage_0x645ceaf0(0x626b2f2de9a577b307671e8c5c45c5f364bf29beaf140e13ed4fb20887b722b2); /* line */ 
        coverage_0x645ceaf0(0xce4c292ea3c727bae7e1d3d5e0043d3271cfff73eedd85039f823f4b3fd35b75); /* statement */ 
if (a.y >= b.y) {coverage_0x645ceaf0(0x620440013c6a854ff10a18b15960829c97cb335042b4a99b9054f3e1c953ec89); /* branch */ 

coverage_0x645ceaf0(0xaef818f6172a6e9751bc1bc9320e7749f7e977dbfc5bd0b3ce1e51f0e71dfdef); /* line */ 
            coverage_0x645ceaf0(0x80ba709336ba7178728cf125ce876a06b10276e0b1a6df388ecc603f000c4212); /* statement */ 
second = addmod(a.y, P - b.y, P);
        } else {coverage_0x645ceaf0(0x890d9758d7bdaf0d0a87e0860a711234d927dde26f3ba0051271e48a24b134d1); /* branch */ 

coverage_0x645ceaf0(0xe637e876c38c571d1f61b0d8a3c62f91a0ca7a1232aee6a90da4292ccce9052d); /* line */ 
            coverage_0x645ceaf0(0x89bc85d04062d9638ff3d2fa0cf193d29308e2c1d6b2c7083c675f89fb751199); /* statement */ 
second = P - addmod(b.y, P - a.y, P);
        }
coverage_0x645ceaf0(0xd3e8f117372f4c8ad22771bf95250016554272592c903bea636490de4f5016b7); /* line */ 
        coverage_0x645ceaf0(0xf3afd48060d334fecaa4cc1b535eafb9ef09b6db9192a1bb411af80baa2db42f); /* statement */ 
return Fp2({ x: first, y: second });
    }

    function mulFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0xdd7bf0744346c7b961de7528353987a0de9691eccfc855c6536c7c339c10e619); /* function */ 

coverage_0x645ceaf0(0x16e0cd300501dd426e2a57a8e3471f78630dee3418cb88e9c216e0e0084fa0b3); /* line */ 
        coverage_0x645ceaf0(0xed1e96f0b95622300c47cb47fb8649f492b06a4f5ff9081776d873df6ed5f4e9); /* statement */ 
uint aA = mulmod(a.x, b.x, P);
coverage_0x645ceaf0(0xab2d8b5bd3c2f1275d3ee1016b3d217ca97650ed8eebba6b969bcac733590ff7); /* line */ 
        coverage_0x645ceaf0(0x9320c5e7519a2e97a2d29101496cbb604fa374deb8b8b5ead197fdb7cc8908d1); /* statement */ 
uint bB = mulmod(a.y, b.y, P);
coverage_0x645ceaf0(0x2753df80eb807983a8c3e194aef4f23951ada1cc73e096e8e9fcb6d8316fc02d); /* line */ 
        coverage_0x645ceaf0(0xa47a22b1aba20081809598e521d7af24b6a85a30d150162a5e8fd56ff05aa529); /* statement */ 
return Fp2({
            x: addmod(aA, mulmod(P - 1, bB, P), P),
            y: addmod(mulmod(addmod(a.x, a.y, P), addmod(b.x, b.y, P), P), P - addmod(aA, bB, P), P)
        });
    }

    function squaredFp2(Fp2 memory a) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0x1d921f44161cba86daffc500c4f6d7dfa8509b46f3158e07609d3075c5737f4b); /* function */ 

coverage_0x645ceaf0(0x2f0c6a4e2196f8d9ab937fb9fc95fcfde816b45af730c29228101a758bb0c85a); /* line */ 
        coverage_0x645ceaf0(0xee6bc98731e49ecd568c604b24d6ee723032ec79261355b69f86159c1adc46a1); /* statement */ 
uint ab = mulmod(a.x, a.y, P);
coverage_0x645ceaf0(0x3cf798506b66d651565f664471702a80216fbb0f3426b44e7d6c4e98e8518108); /* line */ 
        coverage_0x645ceaf0(0x8eed56ff9f0d6c53a4587c5ff0198abab29d7263bcab55d39fec6b921e567ea4); /* statement */ 
uint mult = mulmod(addmod(a.x, a.y, P), addmod(a.x, mulmod(P - 1, a.y, P), P), P);
coverage_0x645ceaf0(0x0a1b3223d81f0130ab512183bbe5e43294586ea850efb8fdad93b09983cd2f16); /* line */ 
        coverage_0x645ceaf0(0xacfcaf0c660248bb6c05e3026a7ef1f7687e85a2ebcccbc4830707a921e5b45a); /* statement */ 
return Fp2({ x: mult, y: addmod(ab, ab, P) });
    }

    function inverseFp2(Fp2 memory a) internal view returns (Fp2 memory x) {coverage_0x645ceaf0(0x699eaa5f228d58c4925ff4dc6b6c41f73ab481aece5ce07964aaa04ea8079d35); /* function */ 

coverage_0x645ceaf0(0x659201115e66c7412d90756870165e712391a0f9de00e41180009ed85dd89616); /* line */ 
        coverage_0x645ceaf0(0xba0ad8deab75c956c6272ded5e56ac7ad790105c25a0c5e96a493450a91780b7); /* statement */ 
uint t0 = mulmod(a.x, a.x, P);
coverage_0x645ceaf0(0xa96f487c63fe487792997e5f16386fa497fad5eb2f7870094586360ae1457e22); /* line */ 
        coverage_0x645ceaf0(0xa76d9159065da23df71b6c9a7117fc39fdb06c92efeb7859afaf5f5319084539); /* statement */ 
uint t1 = mulmod(a.y, a.y, P);
coverage_0x645ceaf0(0xa74408030daf3f61503d16570e4af3ceb63459caf538c6a4aa701a4e239b6dab); /* line */ 
        coverage_0x645ceaf0(0x71a800ea47f3fcd5fed107baa4092ab60bd8ab2e9389e843c3fa0be480735c9f); /* statement */ 
uint t2 = mulmod(P - 1, t1, P);
coverage_0x645ceaf0(0x79602293c60d29ecc0f069ee1e3e6f489686ef51c145472e03006670d3a3277b); /* line */ 
        coverage_0x645ceaf0(0xd219855fe8bc9369a7498e3c2c1dc389e0feeb2ca3648b8fe27fc7df2d916784); /* statement */ 
if (t0 >= t2) {coverage_0x645ceaf0(0x22bb426e30eca41ef742a5bbdc55643bff2186d3494303cf53d62a3020f68519); /* branch */ 

coverage_0x645ceaf0(0x34645963edc847b050c2fdda5df7cef852d674f180833d275f70da5abc10ead6); /* line */ 
            coverage_0x645ceaf0(0x9d13fcbbc28529dc013af0c147577dc00c7eef192d364212405247a1617f0afb); /* statement */ 
t2 = addmod(t0, P - t2, P);
        } else {coverage_0x645ceaf0(0xa9601813f9dee58677dd449eaf64a72fdf82814b5cbbb3983633f3fc88d022ae); /* branch */ 

coverage_0x645ceaf0(0x8b2356ee109ecc6127645510d0f66989f85ecc6aea515f5db2f886ef913e95c7); /* line */ 
            coverage_0x645ceaf0(0x46ba9cca98c7c21338039a1cc2837085c7a4433a171068b12fcf85dcceaf0de8); /* statement */ 
t2 = P - addmod(t2, P - t0, P);
        }
coverage_0x645ceaf0(0x38b6520bb1aa33477f9fadc2025f0e7faf21a82ac24444db9dbdc60c73acaa52); /* line */ 
        coverage_0x645ceaf0(0x5444fe5071c138705cd7017f6abf9cf03eab7709e9b13960403b5012fe839901); /* statement */ 
uint t3 = bigModExp(t2, P - 2);
coverage_0x645ceaf0(0x5b244fc8fcae211d8e31afd8203196ceefb7a4135e5f3ad1a79124f96feb4a82); /* line */ 
        coverage_0x645ceaf0(0x6f1c4876cb4ef2cc8b7a9449e33fd6804b7b0425094c8a0e6232e81116fe970b); /* statement */ 
x.x = mulmod(a.x, t3, P);
coverage_0x645ceaf0(0x440e9435a1c9e7af4b6958612c81be5498a518564b863e1ab89a57d098c7aca9); /* line */ 
        coverage_0x645ceaf0(0xd45a689f3d0a0a7bf7daba130c212243982f9647a971e5926fd850e4ff75048f); /* statement */ 
x.y = P - mulmod(a.y, t3, P);
    }

    // End of Fp2 operations

    function isG1(uint x, uint y) internal pure returns (bool) {coverage_0x645ceaf0(0xebb21f8fb4e000d3faa696e7f108eb5d8c3cdcab2ed9ba427a1daa12c57edf14); /* function */ 

coverage_0x645ceaf0(0x9b1057a3bbb0ab15000b93a98ecc210ffda4aa02082888f3b19fdcf864022295); /* line */ 
        coverage_0x645ceaf0(0x890efdd2c68951cb88a1fca68593c9fe4c034cd5e8562b51e48bc11ad643216a); /* statement */ 
return mulmod(y, y, P) == addmod(mulmod(mulmod(x, x, P), x, P), 3, P);
    }

    function isG2(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {coverage_0x645ceaf0(0xa6ef654fbf5775c6b065232cf706887e4ce1d4117b62ab430c78436c3e24999c); /* function */ 

coverage_0x645ceaf0(0x54c0c601fb66a42959a326f2c4232e9a47552c1b9c2ccd0ba62e36cddf354a08); /* line */ 
        coverage_0x645ceaf0(0x4ca1e33245d738de8e99c5259ce85dcca2ebea21eda3c67150ee122438052da5); /* statement */ 
if (isG2Zero(x, y)) {coverage_0x645ceaf0(0x9d7246d15f942195dd2fa55af570ac025d4bca01b17fcd09a8b3e6dd53fac3cb); /* branch */ 

coverage_0x645ceaf0(0x7f3b80bc22cd4bf62287d5fd71cda8f9f18ca8a88aac63684adc5f42cea73648); /* line */ 
            coverage_0x645ceaf0(0x9dbde3b386774690f02b27fc460a330a32ebf8623652bd2239c218305a098937); /* statement */ 
return true;
        }else { coverage_0x645ceaf0(0xd6fd19f615b5a9dd8f3659bc4d65e768b935e99e64e6f7586787a93a58c4c65c); /* branch */ 
}
coverage_0x645ceaf0(0x0450570697705f42a50de0a9fc1855893236cad6f79fbd642f10f83e2d6cb5a0); /* line */ 
        coverage_0x645ceaf0(0x7d07871deb5c974ea1e33e79b9c206a8ecea82c691c6225d0aa54b78b8de483c); /* statement */ 
Fp2 memory squaredY = squaredFp2(y);
coverage_0x645ceaf0(0xe76fb752c5c08e031c19d4a73ede947e7b35c64fa835b9f6984967f77d90fff1); /* line */ 
        coverage_0x645ceaf0(0x4b87d4b6a7c4fa25e9582f652cc41b619333c24e71743e7b3f7d6983e739a33a); /* statement */ 
Fp2 memory res = minusFp2(minusFp2(squaredY, mulFp2(squaredFp2(x), x)), Fp2({x: TWISTBX, y: TWISTBY}));
coverage_0x645ceaf0(0x754b74e9dea5575a50c58bac827b9ed951e566063e0ae52942a6d4d2dbddf9c4); /* line */ 
        coverage_0x645ceaf0(0x071310f39d305deb2ee2e973231d757ea7287e0b91c4be41371552504188fd59); /* statement */ 
return res.x == 0 && res.y == 0;
    }

    function isG2Zero(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {coverage_0x645ceaf0(0xd6146ad550b61af96af91e7e2d0910e1538300872ed4beeefc51756aec8b1d1e); /* function */ 

coverage_0x645ceaf0(0xb17e33167f999fa2dd7143a9f4c1575b251b4e6c7d5165115ccc86a748fe274d); /* line */ 
        coverage_0x645ceaf0(0x8a08ec4e8f5a8aada6b4ad0325cf7391f9d044336213b989190907e3512408ac); /* statement */ 
return x.x == 0 && x.y == 0 && y.x == 1 && y.y == 0;
    }

    function doubleG2(Fp2 memory x1, Fp2 memory y1) internal view returns (Fp2 memory x3, Fp2 memory y3) {coverage_0x645ceaf0(0x6af7fbe6895c0f20eea8045af8de3eec16858f793a4580af26649c13b9bfe8b6); /* function */ 

coverage_0x645ceaf0(0x6a7a497f938414b446f4a3c9cfb8a2afc29901c6220e5676bd03681edd16fc99); /* line */ 
        coverage_0x645ceaf0(0xb8c6b107567a54610c15dcc50db1247b4c32b187aabe9905b436644114054b22); /* statement */ 
if (isG2Zero(x1, y1)) {coverage_0x645ceaf0(0x82b741ab88b8ab27fc850055385a28cf1e6d9fe755e23af3a4ec7a3a6eb5b53c); /* branch */ 

coverage_0x645ceaf0(0xd195b0f55a93b1e3edc62d9d2bec5e29817159544001ab22d2bd2de0c6bba2f0); /* line */ 
            coverage_0x645ceaf0(0xd7083fff42a6a4afd1425596c8638ab59d64f3e2426b5b496ae199394b373de2); /* statement */ 
x3 = x1;
coverage_0x645ceaf0(0x9171df77efe1ea6252112c12a69a9371b7869b0ec26403af8a993a7c13c0bef4); /* line */ 
            coverage_0x645ceaf0(0xee54915362110dba430c1008e00c22260537f5929033c92fcb864b535490dbec); /* statement */ 
y3 = y1;
        } else {coverage_0x645ceaf0(0x6bf71db5eb1753f3864cbec57eb7519fdbf02de8f6b8635017f5754dd3019759); /* branch */ 

coverage_0x645ceaf0(0xe917e3c7aa5c8ff01322486e403255ceb1d3822ca5cd2ddd3604812cea1cd935); /* line */ 
            coverage_0x645ceaf0(0x1d1cedacfd252ba2d638ab9b23692ad29a66b45deb54835aedd38e147daced40); /* statement */ 
Fp2 memory s = mulFp2(scalarMulFp2(3, squaredFp2(x1)), inverseFp2(scalarMulFp2(2, y1)));
coverage_0x645ceaf0(0x6e7e69cc629bf6e475a1edd5ca441c0cda807e81ffdbc609baaaa4df075855c4); /* line */ 
            coverage_0x645ceaf0(0x108678d0eeff6c85aa7d67c42d1d67a6bf04af9cab451ac833b593efa4c57d82); /* statement */ 
x3 = minusFp2(squaredFp2(s), scalarMulFp2(2, x1));
coverage_0x645ceaf0(0x3f356d6f5e320ac5e91732f483ba012cc1b15c0e55f67b54d43637f613440604); /* line */ 
            coverage_0x645ceaf0(0x828a0c4a7294b6806a55494c8b3e7220801df38a3c063383dd530480040b8ead); /* statement */ 
y3 = addFp2(y1, mulFp2(s, minusFp2(x3, x1)));
coverage_0x645ceaf0(0xb7ce92a34926c4681e14f1308fefe1d1de8c89487d80b84124a381bf3a4f9cd2); /* line */ 
            coverage_0x645ceaf0(0xa43fecb80544ad54a56b8b8261b1efe4b0d11f8876e5cb25a69954c3bd24d7e3); /* statement */ 
y3.x = P - (y3.x % P);
coverage_0x645ceaf0(0x142b56fa9ccd262c9c144ca7d95335af91eb4b2ba54935736beaed8354bacbc6); /* line */ 
            coverage_0x645ceaf0(0x5ecd27293e0107e61a666bc0fcbb721343114c92e44abf55db36735fd2c875d4); /* statement */ 
y3.y = P - (y3.y % P);
        }
    }

    function u1(Fp2 memory x1) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0xa5382154a8ff0b07c1ed7a1e24ba3e5563d536ed9c68532ee4612d3eeeff536a); /* function */ 

coverage_0x645ceaf0(0xdba9814d2c32818b52f416706150ce3135673b7b085e7236e060196fe33d790b); /* line */ 
        coverage_0x645ceaf0(0x3d5464b53c283a329ba50a553d79b5204ad14f3607b160fdbfa89ea93f479ddb); /* statement */ 
return mulFp2(x1, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function u2(Fp2 memory x2) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0x8f332641b948f0797e9f181a3a471d10de8ac2485ec090ef6b38927e9e16e033); /* function */ 

coverage_0x645ceaf0(0xc880c33fc089fd06b696ee5f0cc139b0a1f85f2740600c0d13fd56aafa8e70cf); /* line */ 
        coverage_0x645ceaf0(0x7b4668afb6751d83d7c6f2731946b3a478522d8c673b032cd1086c187ee447f7); /* statement */ 
return mulFp2(x2, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function s1(Fp2 memory y1) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0x4269d849f505375648899aa697852cf1dc44e851858b4fff70f21245b19f6ae4); /* function */ 

coverage_0x645ceaf0(0x4a574d59849b0c61fa66a9c47710dc8d192052298cb4dd703a591c61314825c3); /* line */ 
        coverage_0x645ceaf0(0x9fa328545b2735243ffe14a6bc4fd0e95cfe89526edfc64ee6596bb05252a988); /* statement */ 
return mulFp2(y1, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function s2(Fp2 memory y2) internal pure returns (Fp2 memory) {coverage_0x645ceaf0(0x06fa88c23e2ac298b91f5375526d1b7f166c6ef1dca92423d6740324bd44b33c); /* function */ 

coverage_0x645ceaf0(0x4352cb2e058c674dc969cd3e4e7d451f7ddb49af684f0bdb7cdb570ea6b76d99); /* line */ 
        coverage_0x645ceaf0(0x23ce9ef867e9cb097966a9f7b1a0caf06d57e730c132848b05a9aec0c3570e94); /* statement */ 
return mulFp2(y2, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function isEqual(
        Fp2 memory u1Value,
        Fp2 memory u2Value,
        Fp2 memory s1Value,
        Fp2 memory s2Value
    )
        internal
        pure
        returns (bool)
    {coverage_0x645ceaf0(0x4e25bef3ab1010483723cc69d3892cc1c64e0ae2a9dd1b20d6f1171913d23bf7); /* function */ 

coverage_0x645ceaf0(0x91af7348f28db359efb0e0174f9c1a53b21b9fba8ed419c4c7c85255306e73b2); /* line */ 
        coverage_0x645ceaf0(0x49ebe9ab979f775c266061b30a5cfec2f1fe53edaf85c6210c199894d19a053c); /* statement */ 
return (u1Value.x == u2Value.x && u1Value.y == u2Value.y && s1Value.x == s2Value.x && s1Value.y == s2Value.y);
    }

    function addG2(
        Fp2 memory x1,
        Fp2 memory y1,
        Fp2 memory x2,
        Fp2 memory y2
    )
        internal
        view
        returns (
            Fp2 memory x3,
            Fp2 memory y3
        )
    {coverage_0x645ceaf0(0xf06c0be975574c1e767cfb742da206cce9c92d144b01f91a05f672532eb55ded); /* function */ 

coverage_0x645ceaf0(0x914bf811e61e2e82f7ec68ea051bc8d9092e356081795153d4ef12f411dd8e25); /* line */ 
        coverage_0x645ceaf0(0x62366088453bc891543cb75dec1fe9f8b34e054426e0a5f7b2893d8622761792); /* statement */ 
if (isG2Zero(x1, y1)) {coverage_0x645ceaf0(0x90f6a815fdbab1627020c914c3205ae74230172ac1a295a2ba31498a9d6dc875); /* branch */ 

coverage_0x645ceaf0(0x3b91f0e29d3ced406ab02f26aa516659fe2486b69f2ed1fb0d521130cd5d852a); /* line */ 
            coverage_0x645ceaf0(0x3baa95376c8b53a7f4d387fcf120010b66aefe6e29d3948605a248ef7ea9554b); /* statement */ 
return (x2, y2);
        }else { coverage_0x645ceaf0(0x428eae9f041c451d05fddbbd3dd9acc2f32e94efccdef4ae1fcda49f7886f229); /* branch */ 
}
coverage_0x645ceaf0(0x12e5532d00cb409d5419dc07a3a0a492e6b5d569fcf6b9c657462a62871c6e7e); /* line */ 
        coverage_0x645ceaf0(0x1ec50c990e5de3cb9b556da4ecc62989de575a6b0aaf9e06cc0c42517086b82a); /* statement */ 
if (isG2Zero(x2, y2)) {coverage_0x645ceaf0(0x686259a2f47bd158b324d4bf57ed4fe8cd94f8e3f70c94ab89d011d2d7465b74); /* branch */ 

coverage_0x645ceaf0(0xae37fd5173929f11e8e38132a0cda5658d6fc8aefadc62d191df014df6ddcbaf); /* line */ 
            coverage_0x645ceaf0(0x086b5a89c228807235f4b50f8a806df41a8abd149aa6da1f39a25af0c3dd84c7); /* statement */ 
return (x1, y1);
        }else { coverage_0x645ceaf0(0x2f62c041462ca86fac44fc27f8c9067d86650ea05450c5c4d13da1323dbeca17); /* branch */ 
}
coverage_0x645ceaf0(0xbcc9f4357ebc232e0b95773926c398434c9df7f8fe418aa8e04a463889a991a9); /* line */ 
        coverage_0x645ceaf0(0x4f9698a1320ff5f54d53a5b9b1c26ddd03a71f63306d8ad8f52dcf88ff76429d); /* statement */ 
if (
            isEqual(
                u1(x1),
                u2(x2),
                s1(y1),
                s2(y2)
            )
        ) {coverage_0x645ceaf0(0x652aefa13a83d412b40ceebd2cc4da9ee858af67b333541631e1432b17b454ce); /* branch */ 

coverage_0x645ceaf0(0x950b21294dc63778e8037c9dea0f99eb8f11b0c9de6309125cb6ef1ba4fec43d); /* line */ 
            coverage_0x645ceaf0(0x965ff59fbca869742ab8598925be01cdb865f74c4daf86c365f982f1edea4b5a); /* statement */ 
(x3, y3) = doubleG2(x1, y1);
        }else { coverage_0x645ceaf0(0xcda666679d83af22cedc6d9209ff84719bb19bfaf22e287788aba4f44d02c599); /* branch */ 
}

coverage_0x645ceaf0(0x42344f22f1f4bc1908e565e6c0b7dc34698fee4e4a98dd5fbcfc79a13a3118ed); /* line */ 
        coverage_0x645ceaf0(0x83bde8533d29644c476a7cbefc9ca68abed0a3af2e17c5264d633f132acac82d); /* statement */ 
Fp2 memory s = mulFp2(minusFp2(y2, y1), inverseFp2(minusFp2(x2, x1)));
coverage_0x645ceaf0(0xeaad9eee6613f994ba817aff9849a8d59ba9514d1ac0740b74d68c1e7a189213); /* line */ 
        coverage_0x645ceaf0(0x9a17811b57f6d4121a596af2def44eb3a3589936c5e62b88c3b73f8d32acadc5); /* statement */ 
x3 = minusFp2(squaredFp2(s), addFp2(x1, x2));
coverage_0x645ceaf0(0xfd46b55f6666ebe9bf67a83162932cbf8cc35dbdc97d9b21f5088b05f58f3f4d); /* line */ 
        coverage_0x645ceaf0(0xb350808b92df3172d55c4b9fd5f9bf04b706cea152c19c63ca72fa788879faac); /* statement */ 
y3 = addFp2(y1, mulFp2(s, minusFp2(x3, x1)));
coverage_0x645ceaf0(0xa5e6aa49f8ae82afb93a49f122dcc66b20928bc108d0fabd0d83f6d3e83168ca); /* line */ 
        coverage_0x645ceaf0(0x1123456c2ae8881449823210ed7d5043bd229580e1f7e1bad30198f0893b5f73); /* statement */ 
y3.x = P - (y3.x % P);
coverage_0x645ceaf0(0x15fc0f832d2f02c8a9b3dab625948a74afbfe5b7ed74a1dbbb8532244715fe02); /* line */ 
        coverage_0x645ceaf0(0x739807342c87182eeb046e30da5fa304c8b1864015cbebbe263d1aaba16ebc83); /* statement */ 
y3.y = P - (y3.y % P);
    }

    // function binstep(uint _a, uint _step) internal view returns (uint x) {
    //     x = 1;
    //     uint a = _a;
    //     uint step = _step;
    //     while (step > 0) {
    //         if (step % 2 == 1) {
    //             x = mulmod(x, a, P);
    //         }
    //         a = mulmod(a, a, P);
    //         step /= 2;
    //     }
    // }

    function mulG2(
        uint scalar,
        Fp2 memory x1,
        Fp2 memory y1
    )
        internal
        view
        returns (Fp2 memory x, Fp2 memory y)
    {coverage_0x645ceaf0(0x98f0e9336b99ace224eeda14d28c64c72f12436a4f86165714d098971e4c0fbd); /* function */ 

coverage_0x645ceaf0(0x6e4ba3455ad68aba563857fb118699f80ac35692911071b98899599f9f6d2e15); /* line */ 
        coverage_0x645ceaf0(0x768ba7c73e438423ef9400891789572dd56889fea9900486778aa217a5d90277); /* statement */ 
uint step = scalar;
coverage_0x645ceaf0(0x78dbddd0c9e8960f0a2d8277209408531d8bbc3a893b098e2eb2815be0f3cccc); /* line */ 
        coverage_0x645ceaf0(0x4b871a01c5e9ed9a3dad80e3be9d10b7f6503abf3968c6cbb9571c38eac84b64); /* statement */ 
x = Fp2({x: 0, y: 0});
coverage_0x645ceaf0(0x5d903baf1ddf0122053b89ded84910204d83a70e772165c3526673f876f3017e); /* line */ 
        coverage_0x645ceaf0(0xdaa9d201dc8111977d7f8f2498fa1e89856c0bfa1b036019c81e636e3d55239d); /* statement */ 
y = Fp2({x: 1, y: 0});
coverage_0x645ceaf0(0x8c8e81334ae43ac58257434cf0e699ae21772f475e4bb204588469beb3c13760); /* line */ 
        coverage_0x645ceaf0(0xbf6b6493f899ff5e26db16536dfb08369acebbde8062e3f31820e3542a9511d0); /* statement */ 
Fp2 memory tmpX = x1;
coverage_0x645ceaf0(0x6ecde3566b7d0da38cd7774de4f8755da9fea05fe2a770d943611775382c184b); /* line */ 
        coverage_0x645ceaf0(0x0d5693464328a0b78798cde75a18acb710bd494e3a525aba9dab7a038e586413); /* statement */ 
Fp2 memory tmpY = y1;
coverage_0x645ceaf0(0xb83112a5e71dc874428c38b167fb56c4cdd8b9d88207b6c5b8ec644d2afb1f54); /* line */ 
        coverage_0x645ceaf0(0x2902b202bb905cca5a0272105ef42f3d1eac63b2e530eed1e34f10db0babae77); /* statement */ 
while (step > 0) {
coverage_0x645ceaf0(0x89cc940d2862d2431a915e45758253c81b7a5472287a1dbaa8b15ea4d79d8b65); /* line */ 
            coverage_0x645ceaf0(0xe133287ef4bc4b5ae8487905506c5356c0a1f2b404f9aa7fbe714cb90c11c444); /* statement */ 
if (step % 2 == 1) {coverage_0x645ceaf0(0xd29cae5478045f33aafa039aea3e552a841bc014e1ecebcd66c2ca9e30ceff86); /* branch */ 

coverage_0x645ceaf0(0xfc75a4ebf5d218b098e28cb8a8a00ecd71bec8cddad926cbdec5a2cccc31cd0b); /* line */ 
                coverage_0x645ceaf0(0x131c4cdfdc8ee742d098c44d21841cd7244c2ce7d2da13098fe70dbf3adf1115); /* statement */ 
(x, y) = addG2(
                    x,
                    y,
                    tmpX,
                    tmpY
                );
            }else { coverage_0x645ceaf0(0x9d1960770ab90c606272a9589b6b8d90d3ace27204d4d61989c2f6f707ac810c); /* branch */ 
}
coverage_0x645ceaf0(0x52b56173da5a7c8d40f10931cb374d151437718d1f1bcbefce60502c18738c17); /* line */ 
            coverage_0x645ceaf0(0x0b65a122900430c0154e2e823103317abdeb42883e19d79491287356c214566f); /* statement */ 
(tmpX, tmpY) = doubleG2(tmpX, tmpY);
coverage_0x645ceaf0(0xa5fb9a5a4da59bf744e5ecde4641f8d3bf0cbacaf9e1cffe87266b8b8c9d6d76); /* line */ 
            coverage_0x645ceaf0(0xb85cdcac0fb462e53bcb045c27f2dae7f7f8e0d126cf2d50110d3276e65dcd46); /* statement */ 
step >>= 1;
        }
    }

    function bigModExp(uint base, uint power) internal view returns (uint) {coverage_0x645ceaf0(0x1f6daf657132454733918187ea573fd2dee9480326c51459042a748c0fecfba8); /* function */ 

coverage_0x645ceaf0(0x517a4becdb88ecf969e760f88d59e8777f7db5dc4a3d4f624aad7b510e1543cc); /* line */ 
        coverage_0x645ceaf0(0x3277c5d18ac49fe56fcdb1e361c6f7feff98a5c9cd1cf53f5db97944c0599b9c); /* statement */ 
uint[6] memory inputToBigModExp;
coverage_0x645ceaf0(0x9ef6282ef812cbb3108814b18c241a538282ce548c87b164453218791c1543ae); /* line */ 
        coverage_0x645ceaf0(0xbdcbddf23dc8630589741810160325f39a7eed8054bfbfbdd7a2b3f98d60046b); /* statement */ 
inputToBigModExp[0] = 32;
coverage_0x645ceaf0(0x5557717da362c411d590fd3b1806af2615d9dcce34e5716aac41047b0eae1063); /* line */ 
        coverage_0x645ceaf0(0xdc0c6914f0fefe56c78011c404e76b5f6255317dbe2d368ce55395bc9e1c5989); /* statement */ 
inputToBigModExp[1] = 32;
coverage_0x645ceaf0(0xf4648b6693977c3a7b43539204e13091aa9c10d5373d895e157e60ec426118c5); /* line */ 
        coverage_0x645ceaf0(0x1df7da7d34d69da2feba849930ab627944c74579565e0b7159505e90fcaf47d9); /* statement */ 
inputToBigModExp[2] = 32;
coverage_0x645ceaf0(0x9c86dd5786e3586037081ca6170e0d028d5ed40ec61d0a659cbdaa8b264a8f6c); /* line */ 
        coverage_0x645ceaf0(0x665e3250089676ed7aca0f3b7c01dcfdfb4faa8648bcb7253c54eca0a466d55a); /* statement */ 
inputToBigModExp[3] = base;
coverage_0x645ceaf0(0xc61a8c4e7c044789992d0c83309c8631659b53426c6683a57fecdf90f53ac60e); /* line */ 
        coverage_0x645ceaf0(0xa8f8b9cb0ccf5e10112b813297f32b20922d9c14c3c8e1666642bc38eb07c67c); /* statement */ 
inputToBigModExp[4] = power;
coverage_0x645ceaf0(0x516953cc106aec1db5f9701d166e3115aa6fbfe794fd6a40586a8f8396badd33); /* line */ 
        coverage_0x645ceaf0(0x096c0ff529f56e6f0161bc0341f061b1f19f999642c3d21699f9b3a38a0f5ef3); /* statement */ 
inputToBigModExp[5] = P;
coverage_0x645ceaf0(0x677e0efb291b3abf6b74b2a07be404a0858dc1dc6e59c23706a27588db0832cb); /* line */ 
        coverage_0x645ceaf0(0x9a69d3fb17bd308a53a88bdf60fff160a0d536843ac36b67c4b09e9b4063d3e1); /* statement */ 
uint[1] memory out;
coverage_0x645ceaf0(0x36c328fa2405e8d2bfced794964a198dfd90bfbbedafb07ca29dbd1f0ab7005c); /* line */ 
        coverage_0x645ceaf0(0x7f7c70b7561bc1fc0f09a2d805db547ae05f2c6d9e071312574d6ffc60dcb066); /* statement */ 
bool success;
coverage_0x645ceaf0(0x7aa5e2170ae286627e2d38fe29b9e6d81f6345f28c95d3ef6d1f2d4f81df7683); /* line */ 
        assembly {
            success := staticcall(not(0), 5, inputToBigModExp, mul(6, 0x20), out, 0x20)
        }
coverage_0x645ceaf0(0x0723c9151370f3917a397069794a833c1455833fb53fd320a0df90e149994717); /* line */ 
        coverage_0x645ceaf0(0x28141ad070bdb2372a6d3dcb76f72e56733cbda2b9c6fc1ab619fb40100ae858); /* assertPre */ 
coverage_0x645ceaf0(0x7e9772b5883e05594ade5601080151e924992e021fb0720516a0396e3ec8f8ec); /* statement */ 
require(success, "BigModExp failed");coverage_0x645ceaf0(0x05e2a4304eca425b0ca6c6fccbb24d28243b85daab03698a89c24e50d16c70a3); /* assertPost */ 

coverage_0x645ceaf0(0xefc663b66f5a7354f25664a38f63cc5c12d48508c91ced3ca52467145f54b9bf); /* line */ 
        coverage_0x645ceaf0(0xd8f89c2aef06e8d4ecb3285ba2b0eea1dafe7f24b052bca081083d7a0b4b7651); /* statement */ 
return out[0];
    }

    function loop(uint index, bytes memory verificationVector, uint loopIndex) internal view returns (Fp2 memory, Fp2 memory) {coverage_0x645ceaf0(0xf71ad90e215f031f4e1c55b530a0a7d1105800639d7d049ccdf8dde050d3679b); /* function */ 

coverage_0x645ceaf0(0x4fd2b0ba85c861a5526160e0130b9df1fdc8a1aade7a405ca45bed0e5d8f8e38); /* line */ 
        coverage_0x645ceaf0(0x6f93edc8f040d5621fb8d829a12f6113d95b60ff02a6e08dcad5654de88ebcb4); /* statement */ 
bytes32[4] memory vector;
coverage_0x645ceaf0(0xf080dbe48f68a5f0a1080b860a108b909bbf5edbf13bc9292c3d54bc96c89d1c); /* line */ 
        coverage_0x645ceaf0(0x5df762c402697bbbc2543a44276376ebc64f4b0a443560933dfd099b27a2568e); /* statement */ 
bytes32 vector1;
coverage_0x645ceaf0(0xd0540b08e0fff4f5314e133b27d0ae62af450ac6a6c730911b32e53ad9c9f12e); /* line */ 
        assembly {
            vector1 := mload(add(verificationVector, add(32, mul(loopIndex, 128))))
        }
coverage_0x645ceaf0(0x03b60a33d2e6b9f58bd0d62649361b764fc72397dadfc41ea0bae43bbc40f034); /* line */ 
        coverage_0x645ceaf0(0x3f5846a35e733e4f13594d7869b39d0b6d62bb3fd77da125acc45b07eddcc06e); /* statement */ 
vector[0] = vector1;
coverage_0x645ceaf0(0x9878d60a61f9a51e94422596f9aa9362d454a63db022d9a873241525e4b0e2c1); /* line */ 
        assembly {
            vector1 := mload(add(verificationVector, add(64, mul(loopIndex, 128))))
        }
coverage_0x645ceaf0(0x9a9ce32f80307f9fad0cc2e8024aaebc31da560ac718b9d1c2fe2bb0215f9b2b); /* line */ 
        coverage_0x645ceaf0(0x9962aa9df5f259d2fbc9b3ad113cece1bff5b185098f62fe2a6f914c88af5f71); /* statement */ 
vector[1] = vector1;
coverage_0x645ceaf0(0xb60d19f7a2b52b5cc2229f8fc86498df0ac75a534d50d371edfe2483b90b91bf); /* line */ 
        assembly {
            vector1 := mload(add(verificationVector, add(96, mul(loopIndex, 128))))
        }
coverage_0x645ceaf0(0x65486da06a6efff2c360059e50a1ee2c511fee3087bd328d6e27ed6dc36fd1aa); /* line */ 
        coverage_0x645ceaf0(0x3243c60f9e694b3307f91aad5c555ea939bf0bc1f0bd20ab0115daad9a66b74a); /* statement */ 
vector[2] = vector1;
coverage_0x645ceaf0(0x3c997d4443a1b8981d5c857d01e3f8185dcd0079f41a8a10ab7378771fd51f0e); /* line */ 
        assembly {
            vector1 := mload(add(verificationVector, add(128, mul(loopIndex, 128))))
        }
coverage_0x645ceaf0(0xa320bf98c8c72c82939188b80bcab7908cd34958bc95f3891c5368c60a0cb19a); /* line */ 
        coverage_0x645ceaf0(0x9387fb364509d05011d72fbdca8e20289ca40b7ee0214e4e918580657f98e45b); /* statement */ 
vector[3] = vector1;
coverage_0x645ceaf0(0x8415d3f7f7cfc981d95383071a91a225cc0ddf99d188741d969493fa47daea87); /* line */ 
        coverage_0x645ceaf0(0x73f9aa788ca3b5de7b1a5f6d7d67fa0af1d09f835ecc089c0ed66d8d3cfad4c7); /* statement */ 
return mulG2(
            bigModExp(index + 1, loopIndex),
            Fp2({x: uint(vector[1]), y: uint(vector[0])}),
            Fp2({x: uint(vector[3]), y: uint(vector[2])})
        );
    }

    function checkDKGVerification(Fp2 memory valX, Fp2 memory valY, bytes memory multipliedShare) internal pure returns (bool) {coverage_0x645ceaf0(0x5ec20d1232a3cff3e0f65be7f07ed80a97bf55c8a857f89d9ff7f9d83b736216); /* function */ 

coverage_0x645ceaf0(0x13daa41543ae541d0f93b9b29b40cd08ade8d09e1597774e4f42450b16bfd5c0); /* line */ 
        coverage_0x645ceaf0(0xd4d34cad1963249a282a816b90c493f898b896452830bc386b3de933aef36dd6); /* statement */ 
Fp2 memory tmpX;
coverage_0x645ceaf0(0x7371909d5841a486b46fb5aa9454fb4117c6c4b3d8904a0f4e7babf00c3980a1); /* line */ 
        coverage_0x645ceaf0(0xf6fbd13f4535b561d6c4e1cd38888ece0521aec8bb7ab3a8a1f7134f60a29124); /* statement */ 
Fp2 memory tmpY;
coverage_0x645ceaf0(0x7ca76c99a34242bcccd9e637bba5c14506d7827418d53108deef80c63781899e); /* line */ 
        coverage_0x645ceaf0(0x0811e701ce11c0444861b7f76a622f0f8a659a28124337ccdeff436355809956); /* statement */ 
(tmpX, tmpY) = bytesToG2(multipliedShare);
coverage_0x645ceaf0(0xa99d34b45bed6f8a6254359058b123df087c43bc6d79ce2869325cf919a44a3f); /* line */ 
        coverage_0x645ceaf0(0x370023e015227d62701270117ac319fb0fb28188e3ba646cc629f8d349aed357); /* statement */ 
return valX.x == tmpX.y && valX.y == tmpX.x && valY.x == tmpY.y && valY.y == tmpY.x;
    }

    // function getMulShare(uint secret) public view returns (uint, uint, uint) {
    //     uint[3] memory inputToMul;
    //     uint[2] memory mulShare;
    //     inputToMul[0] = G1A;
    //     inputToMul[1] = G1B;
    //     inputToMul[2] = secret;
    //     bool success;
    //     assembly {
    //         success := staticcall(not(0), 7, inputToMul, 0x60, mulShare, 0x40)
    //     }
    //     require(success, "Multiplication failed");
    //     uint correct;
    //     if (!(mulShare[0] == 0 && mulShare[1] == 0)) {
    //         correct = P - (mulShare[1] % P);
    //     }
    //     return (mulShare[0], mulShare[1], correct);
    // }

    function checkCorrectMultipliedShare(bytes memory multipliedShare, uint secret) internal view returns (bool) {coverage_0x645ceaf0(0x064fd7980792c7e17e5850e1d1d5b080c515f717df23f684a96524e2361fdb7f); /* function */ 

coverage_0x645ceaf0(0x7db02d227ad005c4e8c664ac276ca88975b2a47177da45564cc5fbfa0b5c81b6); /* line */ 
        coverage_0x645ceaf0(0xf0139afac38cbc2b6f5a0fa53ee0a37d4a3ba4080e8e82bff762b38f8dd22e79); /* statement */ 
Fp2 memory tmpX;
coverage_0x645ceaf0(0xfc784a3ed36525c1982ff7dd45c41b6b2b7e263d886080b1d8a42598972fe5e5); /* line */ 
        coverage_0x645ceaf0(0x068a171f53f9c424e5ea3e649e56e4f4ada88cf5a2261a7184de81b98496f25d); /* statement */ 
Fp2 memory tmpY;
coverage_0x645ceaf0(0xd7ce0debb6f99b5f7e90be3ca5d25e645017cfb6e0409c1d5c521a5c69b1557f); /* line */ 
        coverage_0x645ceaf0(0x5570597501f66fbd054aa5c92fbcbc571de32a2f035edfce9803f5a396eee3d6); /* statement */ 
(tmpX, tmpY) = bytesToG2(multipliedShare);
coverage_0x645ceaf0(0x795d1b6ffe13031ca860ef2e393ba93286079f29cd3ff60040f469bbeb0a4e56); /* line */ 
        coverage_0x645ceaf0(0x42cfe0171203c5045fa9a99c5bc9934e3d3dea79c3e4f7f98162de8b26780234); /* statement */ 
uint[3] memory inputToMul;
coverage_0x645ceaf0(0xfe2765377bf5fada2c2aedf57ffec28bfbdcbacbd7d5a8f7beed0df8075495e4); /* line */ 
        coverage_0x645ceaf0(0xf2d9e5f26ab1b42f512d1960e42f95bf23bdc719cb345c0cdffaee696459c3cf); /* statement */ 
uint[2] memory mulShare;
coverage_0x645ceaf0(0xf0ce37a923699fffbe14303fd562ed1e7574cd878ff591bb94aab6f6495238f1); /* line */ 
        coverage_0x645ceaf0(0x5671fed921ef6065f1c71605bf18af16fb59448c9af40fa5201e4596380edb80); /* statement */ 
inputToMul[0] = G1A;
coverage_0x645ceaf0(0x9f70d8f2a64d808c25e290083fe957fa29e07a8c59ea049cc3760c801f715421); /* line */ 
        coverage_0x645ceaf0(0x57349ef298f64cebaec71f908baf87871af672b69bdc17bf9475d6ef0cfc176d); /* statement */ 
inputToMul[1] = G1B;
coverage_0x645ceaf0(0xf2bea0cc61cc4dea5e99e3cb431faa22303c2fe21cbc8c3be0c401d9313ec9fb); /* line */ 
        coverage_0x645ceaf0(0xcf12dee6aa968f67a82a41864eec4b3bddf4be20f02d9bd44c0f1bcc5c8940f2); /* statement */ 
inputToMul[2] = secret;
coverage_0x645ceaf0(0x116d1382233e35db3fd27f89cf5f19ef3df64b3cf040bff183844df13b290a9c); /* line */ 
        coverage_0x645ceaf0(0xc11edb7da5ab4ae0fd36eedeec1d6b3fd0ab30384fcebff8156696be7ec55207); /* statement */ 
bool success;
coverage_0x645ceaf0(0xfa11f31916446d4720a222826eabcd61a11ac7b0e9f79abf4b3ac38718a8a594); /* line */ 
        assembly {
            success := staticcall(not(0), 7, inputToMul, 0x60, mulShare, 0x40)
        }
coverage_0x645ceaf0(0x9c90cde09c50954a4abc78f662753f88b19d6754baed84a3cd798685ac8c1cee); /* line */ 
        coverage_0x645ceaf0(0x2a74aaf25bf9522281d65ec088a73bbff765e3b94856fd08d517e20df68cd091); /* assertPre */ 
coverage_0x645ceaf0(0x80cc7a78508db83fc6f68bda465dbe910950ff102f44d7c23f2393998e0dc193); /* statement */ 
require(success, "Multiplication failed");coverage_0x645ceaf0(0xc8abceb3482443001167927af63d4be113d338d302e05a7e30f7d740476a1fdd); /* assertPost */ 

coverage_0x645ceaf0(0xe5f29aa0a94c09bf9af3f1723b532e12fa70ff69cc87a8b1199bc22ae901a308); /* line */ 
        coverage_0x645ceaf0(0xb3bef8e471d5698a3f946501da6b681c32ce8f892b13f16fd993e03a246f7a58); /* statement */ 
if (!(mulShare[0] == 0 && mulShare[1] == 0)) {coverage_0x645ceaf0(0xfa9b425c573d8ab06f472dd2a63614c237b82c21bba65ae8b8207a54dc18d099); /* branch */ 

coverage_0x645ceaf0(0x12534e4a329775b3b9c2246adb5ad214eeee865deeff1cd1044238d0c0ce4028); /* line */ 
            coverage_0x645ceaf0(0xdecf1db4b574dd48bd2b7deb46da45f6ca8afaaea0c5a39af132c734899a9e65); /* statement */ 
mulShare[1] = P - (mulShare[1] % P);
        }else { coverage_0x645ceaf0(0x08dd1b1133b8cf63f7d36551a3e6dff98c26bd817a104bd7847877509303ecba); /* branch */ 
}

coverage_0x645ceaf0(0x27efc5281e33d26af67b811165b26fb7230e4afbb6939bdecc0aa6373b99d2c8); /* line */ 
        coverage_0x645ceaf0(0x48b31f7b2e3dc3c871c53d73aa46d3b706455a643a4bcc34bc0aac7196afb262); /* assertPre */ 
coverage_0x645ceaf0(0xed6f4dde39b4565140fc89a4c06190c0a0b8afcf705106cc3a171bc07a9defd3); /* statement */ 
require(isG1(G1A, G1B), "G1.one not in G1");coverage_0x645ceaf0(0x669d78c00f89242f13eee9909867656cd4e41dd245e52cb5517b889907090079); /* assertPost */ 

coverage_0x645ceaf0(0x21c4987976e779fb0dc83037f64979d6239bcee3a43b6ef2e8e50307c473b553); /* line */ 
        coverage_0x645ceaf0(0x1b485d5f8f412c044302d1f7e376e2ecc3e85ca13bdf54173d9ef65cecd4289c); /* assertPre */ 
coverage_0x645ceaf0(0xde1e5c0f681cc4f5237b4b83975b0fc139959e0bfd908cf18ab419cba93e794a); /* statement */ 
require(isG1(mulShare[0], mulShare[1]), "mulShare not in G1");coverage_0x645ceaf0(0x654d2e7e480df014c858f6dcbbbde70ac23ce70a7308a8021c4cc170ccca02b0); /* assertPost */ 


coverage_0x645ceaf0(0x7bd99ff2e619aaf362048e634390b5bbc3fe44dea3ac90e1aa4f79a89810014c); /* line */ 
        coverage_0x645ceaf0(0x1e20d00e3cd11d00fa3d54f463c6e0f89496e9b6fc7930bf48e91107eef8606b); /* assertPre */ 
coverage_0x645ceaf0(0x5a9ca79a5bc3f4482a88ff3172eb6dd8eead6389b95ae5e1e0d061aa233e2cbe); /* statement */ 
require(isG2(Fp2({x: G2A, y: G2B}), Fp2({x: G2C, y: G2D})), "G2.one not in G2");coverage_0x645ceaf0(0xab3782028a4faa9aeca634f638624218134368a9d35b82e8ac7d2af2bc65f3fc); /* assertPost */ 

coverage_0x645ceaf0(0xdeb61ccfd5baea1e117fe490f200164d7bcb5b9aa96f6fa62e07751de54f90bb); /* line */ 
        coverage_0x645ceaf0(0x134d26a9cc2097efc9fb0966f1577da0b4bfe376838398037b4ee6e3854889a0); /* assertPre */ 
coverage_0x645ceaf0(0xb83a41ecf4bd6f702c6ce98e739fbf0b6ed25f9f27981da1101117ba44ef3a3e); /* statement */ 
require(isG2(tmpX, tmpY), "tmp not in G2");coverage_0x645ceaf0(0x119bb5998156bfb3356858f23a7d48f9c20b9641f38efaae9cd25f595eb108ad); /* assertPost */ 


coverage_0x645ceaf0(0xc37762a23f092407a49eaa4a848c6603113575e4be3c07286df5bb915c67d1dc); /* line */ 
        coverage_0x645ceaf0(0x5d9c733fe3cb345922cead6a9ef78528c1f2db850ae6f9c533d582c73c9ccc45); /* statement */ 
uint[12] memory inputToPairing;
coverage_0x645ceaf0(0x0da441f7fa948a820de7bb5a63652aa8ad2f78d52103d856b401933974f9dabc); /* line */ 
        coverage_0x645ceaf0(0x0f3f97909383050b111c75df563d3e75f2546aef805fbbd91974b85dd11de662); /* statement */ 
inputToPairing[0] = mulShare[0];
coverage_0x645ceaf0(0x716b7028a083f769634a0d54e2a936ca7db4c32b8748fccdb8fef5d850096044); /* line */ 
        coverage_0x645ceaf0(0xf9437a36931d007d39a42b7cf24f1c63c8f1e511035393937b7c303011c3c451); /* statement */ 
inputToPairing[1] = mulShare[1];
coverage_0x645ceaf0(0x4e09cbae8a471f76d73647cc45b32cabf58cda767994ba813e803df1cd60c9d6); /* line */ 
        coverage_0x645ceaf0(0x39b3ea8691a3f22e59d1bc8e8193a0776771a885325efdf0ecb96375a6a7b5ad); /* statement */ 
inputToPairing[2] = G2B;
coverage_0x645ceaf0(0x456757a6c6fcf712aeaaa7290c1acbfb039756a02e861ff0becaf644c8e58b10); /* line */ 
        coverage_0x645ceaf0(0xb57c18bac58a23b65b7604ab8c97112d6408358dabc7f2e29d221c88266c0063); /* statement */ 
inputToPairing[3] = G2A;
coverage_0x645ceaf0(0xbe39fa2a9eaf4b62734e3b8d8b2a3e968a212bb606a2f80e041f72542775ea98); /* line */ 
        coverage_0x645ceaf0(0x2d9fc5e3e3d631e1ce8ee3531906cb179faf2b151e589103ec2e3dc82a2c5840); /* statement */ 
inputToPairing[4] = G2D;
coverage_0x645ceaf0(0x73b80e0e451af716789c0e69b5b457b60ab7319bddedff3da33ec5e3fa6ca549); /* line */ 
        coverage_0x645ceaf0(0xa0084ce869fdae30ed0fc3fd19bc7d7489f08d20764678fe7fb455f95ebc781b); /* statement */ 
inputToPairing[5] = G2C;
coverage_0x645ceaf0(0x9f66f2cedd2d4c2bc7b64d742683fb73ec9140de6f1543a06b2551d9c1c79b60); /* line */ 
        coverage_0x645ceaf0(0x4108347690259f39fe8d4fae0f9b550355b22702e7635d03be78b50d6c1528dd); /* statement */ 
inputToPairing[6] = G1A;
coverage_0x645ceaf0(0x5384452656828598119a69492dd3aa386bc222231f800d73f398c281e244e3cf); /* line */ 
        coverage_0x645ceaf0(0x26f470865da81a0c58bd7b926133b19cc14b5734fa51db5fd2ea0ff068d6fcdf); /* statement */ 
inputToPairing[7] = G1B;
coverage_0x645ceaf0(0x068110ee640730963e6e478eed04ca896c81a9905562f1bad0a56034b2f2e2cd); /* line */ 
        coverage_0x645ceaf0(0x9eb72c1149e4b262b30bb27b6625a484d01410a1639e0a63418b25e2e54da1ee); /* statement */ 
inputToPairing[8] = tmpX.y;
coverage_0x645ceaf0(0xadb8ccbb9b82ef31314adbf864aec002b01020293b1bb17d49341c341427a16e); /* line */ 
        coverage_0x645ceaf0(0xdbf3a72bd0b81a07b95931243ea1a22ef861c0c39e967b667811db073b7ef50b); /* statement */ 
inputToPairing[9] = tmpX.x;
coverage_0x645ceaf0(0x7d0f9482533be8d2d6eceae28dd0c626638785889a059f8eaa91b4e98d1e22e8); /* line */ 
        coverage_0x645ceaf0(0x12f43db3ba07613ded530dab3190c5727de4a7ce6dac45e023318ee86869df35); /* statement */ 
inputToPairing[10] = tmpY.y;
coverage_0x645ceaf0(0x2f679eb18669b78e389e6da09aeab73e60e6227dc143a9e509b1b070f30082e4); /* line */ 
        coverage_0x645ceaf0(0x35ab6350537f5b1a490861fb98d59208b3d2293673ad0f9bc4bbdd8db4ac4b3d); /* statement */ 
inputToPairing[11] = tmpY.x;
coverage_0x645ceaf0(0x27f09cc4853558db10749f70d1409295073ccc6669ce2caea2e0c0a95e4df678); /* line */ 
        coverage_0x645ceaf0(0x4354c6ea3770a9bd67000be4b1e151a9eb4ba39989a18d3b40772402b9ce9f3e); /* statement */ 
uint[1] memory out;
coverage_0x645ceaf0(0x15036f2cd543445c66fd70e68c3b4359508ee788397b3d17ac96ec9f5ce3860d); /* line */ 
        assembly {
            success := staticcall(not(0), 8, inputToPairing, mul(12, 0x20), out, 0x20)
        }
coverage_0x645ceaf0(0xbb7faa5bb8f706bdf8dc11cc898e0db81315461baa3356ef9fe75692d18f5991); /* line */ 
        coverage_0x645ceaf0(0x809d7dec17e7d7f7ee9e9d632afc0c7c3113639b0f11e76316f90ee51a81e0ae); /* assertPre */ 
coverage_0x645ceaf0(0x17c4781ccc0e8bf50e6401c78f9bed5aa10fa190c6169b3a010e1f93c1a06682); /* statement */ 
require(success, "Pairing check failed");coverage_0x645ceaf0(0x454d43ea241eb5ce51d27f27d1259ed81c7925afa7d8735df08ef51f623c2b74); /* assertPost */ 

coverage_0x645ceaf0(0x06bce11d35e342ed913cd450533fdbc066d69eebae8fc8b7ebc0d28a846b9ac6); /* line */ 
        coverage_0x645ceaf0(0x0b4579f72fd8c328fc41fad542bf13bf516c94c59ab699c9e154a118fbb4c01d); /* statement */ 
return out[0] != 0;
    }

    function bytesToPublicKey(bytes memory someBytes) internal pure returns(uint x, uint y) {coverage_0x645ceaf0(0x1894829098f465f9dafd8f4ce169ee65acb72bd6f6e52504bd4928223d8c911b); /* function */ 

coverage_0x645ceaf0(0x25594f485b77499546c164881bc9e393d6fe6e5bc008c691c1ebbaad5c17703c); /* line */ 
        coverage_0x645ceaf0(0x3fa950aa23b94e96f0c1d2ee96e1180a627772f0138070447c7a8b162e60d9f5); /* statement */ 
bytes32 pkX;
coverage_0x645ceaf0(0x890af7542d79651c5b0e582d4694d135e4f3a87459b8e1f55a70b69e9c4470a9); /* line */ 
        coverage_0x645ceaf0(0x6f3258d93a28e558fd93eee4385134db13a9e65446aa2938a642d1f43ac49d0c); /* statement */ 
bytes32 pkY;
coverage_0x645ceaf0(0x1666502116b71bf7970fd6cc7774029250574f50c3c6961e34e678376a0866d6); /* line */ 
        assembly {
            pkX := mload(add(someBytes, 32))
            pkY := mload(add(someBytes, 64))
        }

coverage_0x645ceaf0(0x21ecf1984db293918f8f42f4ee69c0e5ec7d16333910a7a4e5a5441881da535d); /* line */ 
        coverage_0x645ceaf0(0x87d9a85cdadcb2e83d55e71c542522cd8019f0b746bcb3770c5259dc4fc42efc); /* statement */ 
x = uint(pkX);
coverage_0x645ceaf0(0xd49e470fd3519d1a8c6a52e443e59d3166c258f3867e48780d82ba44a52afc78); /* line */ 
        coverage_0x645ceaf0(0x16b52b0f1589033b9df8abfe86aa5fd4b0516b401088b1ddc7860b11908fca05); /* statement */ 
y = uint(pkY);
    }

    function bytesToG2(bytes memory someBytes) internal pure returns(Fp2 memory x, Fp2 memory y) {coverage_0x645ceaf0(0x7017cf32b4acb37648b3794e6fb4a7bbaab593e87df8a3e7abe28d376a02d1dc); /* function */ 

coverage_0x645ceaf0(0x08c49155edd2d870af4d5432f1fd286636727a581940027c4f3b601cd80a908c); /* line */ 
        coverage_0x645ceaf0(0x45d222ba32c66047678184442cfdd8e1743af3e0c51eb0d798c0b25627ccc31a); /* statement */ 
bytes32 xa;
coverage_0x645ceaf0(0xaab1991807d0730348bb11fe7a749523a4ece5d8dfcffd2299c52021342055a5); /* line */ 
        coverage_0x645ceaf0(0xdedb24831d9fc21a54e922d9853fbada929cea5c6ae37dca8efe3ae394783a5f); /* statement */ 
bytes32 xb;
coverage_0x645ceaf0(0x91af717392f76baeba955f10b487bfe19447b2cff29e286affc7b63eaa586706); /* line */ 
        coverage_0x645ceaf0(0xcc803bc58139fe0470122938d08601156196db2c396dbbad2d8450b42f3a8075); /* statement */ 
bytes32 ya;
coverage_0x645ceaf0(0xefeeb949c34bfd67c1ab1eb169ff79501e1c6ecb4c04e4e2fb0c634594b3ef28); /* line */ 
        coverage_0x645ceaf0(0x1ccb13099e8b652b7847ea950e49faacbfb6396db4901fa7e59b6d2e97b5cde7); /* statement */ 
bytes32 yb;
coverage_0x645ceaf0(0x5d85329ddd75e459de0c0d0de5c0e3316aea396804afdbf430ef9d9d80dd0f45); /* line */ 
        assembly {
            xa := mload(add(someBytes, 32))
            xb := mload(add(someBytes, 64))
            ya := mload(add(someBytes, 96))
            yb := mload(add(someBytes, 128))
        }

coverage_0x645ceaf0(0x9b2915a90c89a837b603d282ed707fcff4867251dde18e6299dfa14d8eef076c); /* line */ 
        coverage_0x645ceaf0(0x3eef435dc2cca2118f44321857d48da7ca8eb9e3eeb37279f333a01f3bd367c5); /* statement */ 
x = Fp2({x: uint(xa), y: uint(xb)});
coverage_0x645ceaf0(0xbe25f8578f73bb47bf80a1899d504dcd1aa53af142f500a26591427e16d54ea1); /* line */ 
        coverage_0x645ceaf0(0xbb0e68d7ebb3b6f9ed4965f26ec771247c45b246660ea4a07915f22d3e518091); /* statement */ 
y = Fp2({x: uint(ya), y: uint(yb)});
    }
}