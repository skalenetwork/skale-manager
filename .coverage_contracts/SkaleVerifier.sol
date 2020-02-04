/*
    SkaleVerifier.sol - SKALE Manager
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

import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";


contract SkaleVerifier is Permissions {
function coverage_0x20c6cd42(bytes32 c__0x20c6cd42) public pure {}



    uint constant P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint constant G2A = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint constant G2B = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint constant G2C = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint constant G2D = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    uint constant TWISTBX = 19485874751759354771024239261021720505790618469301721065564631296452457478373;
    uint constant TWISTBY = 266929791119991161246907387137283842545076965332900288569378510910307636690;

    struct Fp2 {
        uint x;
        uint y;
    }

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {coverage_0x20c6cd42(0x118c284c3566fc8b7126867b20973c4dd222fb1cc8ceacd71e73bf9bbcf437dd); /* function */ 


    }

    function verifySchainSignature(
        uint signA,
        uint signB,
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB,
        string calldata schainName
    )
        external
        view
        returns (bool)
    {coverage_0x20c6cd42(0x143c059c599f8cfbfb6e0623838e3f3d23a17fd89ad3a20b7a30ecd354319701); /* function */ 

coverage_0x20c6cd42(0xa34cb08d0812c71e39380d608948bd3f767777da1c0fa858b006f69940ebd47f); /* line */ 
        coverage_0x20c6cd42(0x0ea5b799ac1a234be6bb5977654b04199892498187e66b7b5fffe49c1494f698); /* statement */ 
if (!checkHashToGroupWithHelper(
            hash,
            counter,
            hashA,
            hashB
            )
        )
        {coverage_0x20c6cd42(0x482cae97094beb767113a5afe5809540b62b393937a67a5a891d15a0777b1693); /* branch */ 

coverage_0x20c6cd42(0x22fbdd586e730ff20032d21c2b2a3bf76dae6734d685404b9f60112944930073); /* line */ 
            coverage_0x20c6cd42(0xfbcf85346ae42649a911f87bb92e3c39ffc8f62a52cba87d15858f2e52e42738); /* statement */ 
return false;
        }else { coverage_0x20c6cd42(0x0035591cbbf9bfaec80ea99c605fdaa8d807f2ffb88d6f6423d4ee00c126dee0); /* branch */ 
}

coverage_0x20c6cd42(0x2af6fe301bf9f5aad2f6c4338c527f5519bd3591b5f93709b1a2146cc0490457); /* line */ 
        coverage_0x20c6cd42(0x7c93d7b50223a110d68a8b3c2a8f36ed77336b75376255947ed5586085051dc2); /* statement */ 
address schainsDataAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsData")));
coverage_0x20c6cd42(0x4c1873d8341c38b45067b10911ee0fb9ef37304f96f2ad7f60fc2cc2c045db7a); /* line */ 
        coverage_0x20c6cd42(0x42068fe7ed6de9ea8b975d4c2056e41232a7efd742315dd0a2945a0cb6dadfdd); /* statement */ 
(uint pkA, uint pkB, uint pkC, uint pkD) = IGroupsData(schainsDataAddress).getGroupsPublicKey(
            keccak256(abi.encodePacked(schainName))
        );
coverage_0x20c6cd42(0xb2c150d0b83b479fb1ffc225f3be7804c80577aa5c7b0290d6c580c051fd0f8a); /* line */ 
        coverage_0x20c6cd42(0xdd3a054b6a53ed811b60c767cbf10da2b3f227b431244e562ed5ddaad3f75d9d); /* statement */ 
return verify(
            signA,
            signB,
            hash,
            counter,
            hashA,
            hashB,
            pkA,
            pkB,
            pkC,
            pkD
        );
    }

    function verify(
        uint signA,
        uint signB,
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB,
        uint pkA,
        uint pkB,
        uint pkC,
        uint pkD) public view returns (bool)
    {coverage_0x20c6cd42(0x4da6c0dceaaff43c7125488954ddbe3fa7f49f9c92f2d98b5b67568e6058517e); /* function */ 

coverage_0x20c6cd42(0xbb5eb9bab693260d7a8442e73f872bb21b1f2813dc2eda9bf7cd39856bb36365); /* line */ 
        coverage_0x20c6cd42(0x3df9d53916102a6245617b41cd6ebc537823c317ab135e5aa5afe4f6aec1acdb); /* statement */ 
if (!checkHashToGroupWithHelper(
            hash,
            counter,
            hashA,
            hashB
            )
        )
        {coverage_0x20c6cd42(0xf61c1e616f744ec418b4bb14f90cdbc20fe5a6c436f80f5fe8f6933521b74b71); /* branch */ 

coverage_0x20c6cd42(0x62108339cb3ba922e3002f893f9070e38cf5a2db5a2d5be1d96326002a8fb811); /* line */ 
            coverage_0x20c6cd42(0x0aa45f220e54fb90165c909688ed453e78aec1a44d1c1c45fcbad875da2222fe); /* statement */ 
return false;
        }else { coverage_0x20c6cd42(0xc476da5dce0d149bf6e504d9812e68adba3a4a233858909468b8835f01e855d3); /* branch */ 
}

coverage_0x20c6cd42(0x9ca09c4babcf6c229c6256357b2f699e1bb57f82f5955d0e7646866dd138fd6e); /* line */ 
        coverage_0x20c6cd42(0x4ad31606b9748baf0a331a96351be107c8282755677925a041652a511ea50fa2); /* statement */ 
uint newSignB;
coverage_0x20c6cd42(0x812e133056b65502ce4a4820009ea101fd958934625ebdb7aaedb0efe958e556); /* line */ 
        coverage_0x20c6cd42(0x8abbd5b691a0986102379064dd433aacc0c584ee6de939c0fb31ce9fdbb54131); /* statement */ 
if (!(signA == 0 && signB == 0)) {coverage_0x20c6cd42(0x5f1ed13f80921bc51d9314d003991d132385244a5941f7889f26c8227e650d76); /* branch */ 

coverage_0x20c6cd42(0x84ceb75bd86549e182b35606fd4bf1435a1b0f8daf453f92415d3825ff6537b3); /* line */ 
            coverage_0x20c6cd42(0xcc35f86fb5cb7b3a8a6f78d21aada01cd2a556e3353cb3d2497bf5dbe95d209d); /* statement */ 
newSignB = P - (signB % P);
        } else {coverage_0x20c6cd42(0xbb8ec62efe54dcf74a5b0491006ba640260ed0f7482eb512b2f4f833b95069ce); /* branch */ 

coverage_0x20c6cd42(0xe2940c16a441e4b1c1cc37a4de5a4c52b396186dae9cbdc9815adc46a5ce9bc8); /* line */ 
            coverage_0x20c6cd42(0x64f83f305a762940893a611ac799bf01858b53f306a37fb0e8cb7e94d6782d0e); /* statement */ 
newSignB = signB;
        }

coverage_0x20c6cd42(0x39ce27de5843857fb211521a647e7f3aa16484eabd32aef70ae8a69cfa725763); /* line */ 
        coverage_0x20c6cd42(0xe9f813d81572082daf682460d94eadd4f0dac3e401e270f19844b958e19d658d); /* assertPre */ 
coverage_0x20c6cd42(0x922e88be7d94d95408f8fe4cef9317a4f073a46d69d243e7c1363fed346d6b65); /* statement */ 
require(isG1(signA, newSignB), "Sign not in G1");coverage_0x20c6cd42(0xe41a4fa400e1bdd1dc957bc5b9c9eca0354b1a253b9dcc17852b57367f1fb477); /* assertPost */ 

coverage_0x20c6cd42(0x6f0ce373c42566565b5c09d36944f2758ce43b1410f940b62d9750adf88a1606); /* line */ 
        coverage_0x20c6cd42(0x3446b1769d7373c74c9ae3a161bb37744ec2a6a22945559fc56c7d87b1f0b9ff); /* assertPre */ 
coverage_0x20c6cd42(0x0048ea53c1132953f5c88ac63346086c94af7f098cfbde7acb4d8882b87e51a5); /* statement */ 
require(isG1(hashA, hashB), "Hash not in G1");coverage_0x20c6cd42(0xc02e860c869c5489cd868dd38663aa0fe40942c83d02320df7424febd0cd6ca0); /* assertPost */ 


coverage_0x20c6cd42(0x4d9f984499030f01bde85fa77bc2ccf526322357655026d828fbea9e0c912888); /* line */ 
        coverage_0x20c6cd42(0x887e1d9a1ea05159b1bb9989255752d8bb1552863d8b0c2e2ea8d987b045f0b2); /* assertPre */ 
coverage_0x20c6cd42(0x175bfa2014c11690b1a8769d2335125c8ec01cee2ac57f0dcd9caa524fe8066c); /* statement */ 
require(isG2(Fp2({x: G2A, y: G2B}), Fp2({x: G2C, y: G2D})), "G2.one not in G2");coverage_0x20c6cd42(0xedd3018fe35f25d96b740d7ab57b69fed778793f4afc26e51e6fbd28730ab2f7); /* assertPost */ 

coverage_0x20c6cd42(0xe913726b4416ec7ebdba8cba7581d874021814d8ec3cba46877bf374bb292f79); /* line */ 
        coverage_0x20c6cd42(0x2fb4f10117d0d818022b8f104f1e7ac12d640c5e2895c427efd032ccd1fe4c0d); /* assertPre */ 
coverage_0x20c6cd42(0xfc6a6f130c76f2c807433aab6f99c26522202440ce9b566b1911ebc5e5e986a0); /* statement */ 
require(isG2(Fp2({x: pkA, y: pkB}), Fp2({x: pkC, y: pkD})), "Public Key not in G2");coverage_0x20c6cd42(0xae67d284fa26436d41b8db302f17efafc76d14ec6b6a901a706b4ad2bfd1f91b); /* assertPost */ 


coverage_0x20c6cd42(0x98fefaa6f92fb9f2aa20e1aa51dec95286777e12b35d936cb26704c6678f3a22); /* line */ 
        coverage_0x20c6cd42(0x1b7c87feb0f198efdd978ccfabd53c7fa963cfeededde8d165683759c0dbdcd8); /* statement */ 
bool success;
coverage_0x20c6cd42(0x56ecafab7f6ee5bdce30aba48baf04192c71bf09c59e095d990fc3fc2e7d457f); /* line */ 
        coverage_0x20c6cd42(0x9b944a22766f2089228a3b8314d7c281c0cd766e70ae036dfa1a3e606a5dc1c4); /* statement */ 
uint[12] memory inputToPairing;
coverage_0x20c6cd42(0xfbda5e78e1f21586a7cbf6eb5df1a2af3fd830dc8ea722086df91be65b367573); /* line */ 
        coverage_0x20c6cd42(0x9517bf64be4332c5ee484320450b242c5fa6213d4403e86929b7d32882ab7d6a); /* statement */ 
inputToPairing[0] = signA;
coverage_0x20c6cd42(0x7a2511327386c16712fcacd4102f5524e79dcf463e9a7aee2a61306c2e9717fa); /* line */ 
        coverage_0x20c6cd42(0x22e25e2bce46fc9754cb420d379a9f65bbf4047ec3d90219e3353827667635ec); /* statement */ 
inputToPairing[1] = newSignB;
coverage_0x20c6cd42(0xf29236cdf288682bebf09d1266f4f774f3dc09148f82ef64bff046216f5d3b8e); /* line */ 
        coverage_0x20c6cd42(0x4781d9c34e6a67b1de87dc7281dc3e2abf06f0bdc39e50bf3e581d9e8230842f); /* statement */ 
inputToPairing[2] = G2B;
coverage_0x20c6cd42(0xbf947cebb14b5406fc5250f65b9ad64127c7f978514b6e1eff38b0356e69cd50); /* line */ 
        coverage_0x20c6cd42(0x18570a08a73af731830585f48a2bdcffd9ecaac4b60fccd1025b66a54a2aea2d); /* statement */ 
inputToPairing[3] = G2A;
coverage_0x20c6cd42(0xc36303669be66e79ba5cad02f63ad5feffbfae755695c33ee1836cb4992ba5f3); /* line */ 
        coverage_0x20c6cd42(0x840b14d3f466e702d934892b5026eeca223dae98687bff3e60427200e15d1e01); /* statement */ 
inputToPairing[4] = G2D;
coverage_0x20c6cd42(0x033546e41c5ff6d18031756f51bfa828dfad983d5d0234711aed95c70705e706); /* line */ 
        coverage_0x20c6cd42(0x7474084f955a9f83436619b7627114add19c8523a95e055d8b57069e47bcaf09); /* statement */ 
inputToPairing[5] = G2C;
coverage_0x20c6cd42(0xcd7705c521899254c78bbc7a9f3bcc0d56b0f62be5541750de81bf76a3c05cf4); /* line */ 
        coverage_0x20c6cd42(0xb5ff053faa12e0d3a8d326d0a691a7ddb569dff63814968b8f1fc853e1b91c4e); /* statement */ 
inputToPairing[6] = hashA;
coverage_0x20c6cd42(0x46a9a9cd2a8b52c896261363eff13f1c37ed5a040af96d41d00af4ce4d4c2175); /* line */ 
        coverage_0x20c6cd42(0x0c7dbbda06ac298cd923bf698ee76d9c716d4c217674203892ea678031e172c9); /* statement */ 
inputToPairing[7] = hashB;
coverage_0x20c6cd42(0x16227358649d6d6fb92a7dc6c98aa789a93cebd40ffa986241e100bebfe70e13); /* line */ 
        coverage_0x20c6cd42(0x4723f81f7af0103cc82e89a3d588ecb95b7e691c86d67e748fede381978b96e6); /* statement */ 
inputToPairing[8] = pkB;
coverage_0x20c6cd42(0xef0bb15a34d60c902cdc97848db335ff4a4235f13f438d5b08daa7932eb34c93); /* line */ 
        coverage_0x20c6cd42(0xa74d4dc9bf9c884d772db2542399606079164a63db64a16a095a668bb8f46881); /* statement */ 
inputToPairing[9] = pkA;
coverage_0x20c6cd42(0xf156078f8d204124b482172a5c919b7505639ce9b12fa5112cd0fd51824c81c9); /* line */ 
        coverage_0x20c6cd42(0x037f4dc0e8dd4591cdcdbe5de95104cd8b6afa588b24fc535b4f2196dd8d6f7a); /* statement */ 
inputToPairing[10] = pkD;
coverage_0x20c6cd42(0xc5428e07e662e27b1ef85efd38abff3a1aa2416b2fa08067c663e63e78948bf4); /* line */ 
        coverage_0x20c6cd42(0x6997330212309f0a996680024975b6ab18d16c75f781343444b9da5ea8c283bc); /* statement */ 
inputToPairing[11] = pkC;
coverage_0x20c6cd42(0xf69482edb97392f08d31e0e13200b97815c7cde3b0795c7c7527f3e029c3afc9); /* line */ 
        coverage_0x20c6cd42(0x5e143df715fb96929d09d491b8a46c694906411cf8869080ff7e6297b4a89c76); /* statement */ 
uint[1] memory out;
coverage_0x20c6cd42(0x7a8efdaac5f40e8d325a923475a94234f57959977ea9ab6f8779694c76f1e93b); /* line */ 
        assembly {
            success := staticcall(not(0), 8, inputToPairing, mul(12, 0x20), out, 0x20)
        }
coverage_0x20c6cd42(0xe069dfce46c3f0109bf13f7eb60cb7247446083ddccc72d9e49a7f7c3991fbcd); /* line */ 
        coverage_0x20c6cd42(0x9edb73d6eae13f2f0708fbb85b03b07372b041b5234863af1a087997386f0ace); /* assertPre */ 
coverage_0x20c6cd42(0xa83a1990dbaaafde52b7cb03f4d648d5b9acfec3fcb5db52758854fa17798d8a); /* statement */ 
require(success, "Pairing check failed");coverage_0x20c6cd42(0xea1f7390d7facc7e3ca5f4c75544c0a34fdd82ef53e124acc847d54960b78e38); /* assertPost */ 

coverage_0x20c6cd42(0x02fab8fa6144512aa0dd5950c7def4ca0db3890c963303fa5439efbedab617e0); /* line */ 
        coverage_0x20c6cd42(0x9b0798f8a0fd290a30f5d33b084a71094a4fe34b7dcd47afa348eef9b56020cf); /* statement */ 
return out[0] != 0;
    }

    function checkHashToGroupWithHelper(
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB
    )
        internal
        pure
        returns (bool)
    {coverage_0x20c6cd42(0x04ac6f0155cfc09d4e5d5615d4242887200b69c9bd027ec8f74b023b27f359a7); /* function */ 

coverage_0x20c6cd42(0xd8244ab4fca6fa5d4e275e964011b2b6ac0cb9bf9a32a5585056c36a826752ca); /* line */ 
        coverage_0x20c6cd42(0xbdb3c01fcfe06b0b66c8798ebd159949cd86a9a0745c11174130a46dcaba50bf); /* statement */ 
uint xCoord = uint(hash) % P;
coverage_0x20c6cd42(0x03c6e470080299d76da106f646995b596c62968d8e6c242f4b4cd508ccd30b22); /* line */ 
        coverage_0x20c6cd42(0x7945b4a95f5ef363385d0648300e0fce26d9af6b9bd827635ef8285d2ce06cd1); /* statement */ 
xCoord = (xCoord + counter) % P;

coverage_0x20c6cd42(0x8468301fbf139f5dbb47082f05234ab779506c9707716ad1a9be4af28f26ef9f); /* line */ 
        coverage_0x20c6cd42(0x652b4e38e43decf31bb97b374356d0a78b367c412dc19f9ff15ca000c59b335f); /* statement */ 
uint ySquared = addmod(mulmod(mulmod(xCoord, xCoord, P), xCoord, P), 3, P);
coverage_0x20c6cd42(0x95c336f0d55572abe823da8a07ad791d9fb9056be5873ed6e556d1618ff307be); /* line */ 
        coverage_0x20c6cd42(0x14521b7b0e64df65d5b90786138a5beeb4d7125467130659346442b5fa49c4e2); /* statement */ 
if (hashB < P / 2 || mulmod(hashB, hashB, P) != ySquared || xCoord != hashA) {coverage_0x20c6cd42(0x902ed15db837247099d31b704b70de5a85dcda87ece0ffde265125781d75a8ab); /* branch */ 

coverage_0x20c6cd42(0x93d790d9320e50142b3b34e8409f27a54067cb5917f4861e3f678dab8b44e3f6); /* line */ 
            coverage_0x20c6cd42(0xba994b05da92710df5efd31065db11cc093550f4824cc040eacdf5a2de14355c); /* statement */ 
return false;
        }else { coverage_0x20c6cd42(0x58a78b1fbc2249bb0903e4566906125a8a376548c53af29479955679279eeccd); /* branch */ 
}

coverage_0x20c6cd42(0xd0c0eace80f2027ed3c33f9015d9530034c72d057665d4053e3c34f399482040); /* line */ 
        coverage_0x20c6cd42(0x8428a0aa55cc81aac5514d41032abab45927607627528bc2ad400ae177953f31); /* statement */ 
return true;
    }

    // Fp2 operations

    function addFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {coverage_0x20c6cd42(0x3e2c46f286cfbce1490de862bd382aecb230968c71d8c7fc37710ca0d293ed9e); /* function */ 

coverage_0x20c6cd42(0xbba6f4aca173d2b90e90366462ad0f88983705ae664d37d90167e31635997980); /* line */ 
        coverage_0x20c6cd42(0x3f356305ab23bd375a8b83c00a337a5bba7d576dae50f0103a474f1b335a732e); /* statement */ 
return Fp2({ x: addmod(a.x, b.x, P), y: addmod(a.y, b.y, P) });
    }

    function scalarMulFp2(uint scalar, Fp2 memory a) internal pure returns (Fp2 memory) {coverage_0x20c6cd42(0x5d0439c6d6eb5f0968c7edf3768650d5197d7fca27c00f5ba10f69104ef13bbc); /* function */ 

coverage_0x20c6cd42(0x68f77d300c918f9c56a07c54325929dcaa158db2a45af0f75e870ecd1df855d8); /* line */ 
        coverage_0x20c6cd42(0x0412fec114fa81e705229fce0a68ae11b6257f7f2ff7f12435b38f4e15d8be12); /* statement */ 
return Fp2({ x: mulmod(scalar, a.x, P), y: mulmod(scalar, a.y, P) });
    }

    function minusFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {coverage_0x20c6cd42(0x877ebe72fe024235884d63924c0c0a06952d38f5068158b763f178c0eb0c8608); /* function */ 

coverage_0x20c6cd42(0xc666322bab91e9503dab14579a7dba0bc339777c3c6335b422937a9d56cadebf); /* line */ 
        coverage_0x20c6cd42(0x3d7ceb4d8a91cd91ae83bb3f6395a7b0a44c0fa161d56e9f33e13fa1260823aa); /* statement */ 
uint first;
coverage_0x20c6cd42(0xab51583eba9bf11da99884d26ba993ca8c4be585b9c8071348ae8357367cc923); /* line */ 
        coverage_0x20c6cd42(0xcc9c21f891950cc09054055c29d41942b993e55f4928a00eaf0d926acc8f7984); /* statement */ 
uint second;
coverage_0x20c6cd42(0x2f3a0f6106deab62fb7d9b62b21c70586406249c05ce72b5458b5f7557fb19b2); /* line */ 
        coverage_0x20c6cd42(0x17206fc0ddf9ea409b7147f076494649285bca71d578886880528a8592e4527e); /* statement */ 
if (a.x >= b.x) {coverage_0x20c6cd42(0xda1c9aa0a1d39f0a29e9b0c4d556b66f5fa7541270d6df2f88327b49f6f6fb4e); /* branch */ 

coverage_0x20c6cd42(0xf6161e71f157adb852ce46154968d7c4dd0e2942760f4e4a365e9ddd9697d223); /* line */ 
            coverage_0x20c6cd42(0xacd337b5f42f9150cb17c82cceef546a1be0350edf1e27c7f5bea5d105112d3f); /* statement */ 
first = addmod(a.x, P - b.x, P);
        } else {coverage_0x20c6cd42(0x4e409e8a97fe9103cf5fe7021ffb41bd98399e8d65255ed42ebc054eed717951); /* branch */ 

coverage_0x20c6cd42(0xc245ebf2b3a10fbbe891cbbf42b3e090530111b3abfac16f5dfd210ea33d00b3); /* line */ 
            coverage_0x20c6cd42(0xb0e142d5814360877feaa60643cb768950c1e973c864d10d881ec200fb537f28); /* statement */ 
first = P - addmod(b.x, P - a.x, P);
        }
coverage_0x20c6cd42(0x4210c7d42974b0c14a044d18fb57d5e4f0380f16871e3bb74ce67460f1a52d16); /* line */ 
        coverage_0x20c6cd42(0xb73045125f31cb803e04e5e27b86c5755148455833e69493bdc30f1a4608fbfd); /* statement */ 
if (a.y >= b.y) {coverage_0x20c6cd42(0xb0529dc5ddb1a664561204ebe94d9e32cf3689e50e38090fe3b9cd57e0c93940); /* branch */ 

coverage_0x20c6cd42(0x570232e604fe987b93cfcc8116ec9ccad70388f614c5d2210034010364d056e6); /* line */ 
            coverage_0x20c6cd42(0xce45655e317a89c4bd26092df6680d6b6299f6ee821adf4eaf823331e9d2a989); /* statement */ 
second = addmod(a.y, P - b.y, P);
        } else {coverage_0x20c6cd42(0xdc9b9da2f086207e0c94311ee8a1bac8856186668a94546d5591f3973d5af449); /* branch */ 

coverage_0x20c6cd42(0xc6a2fa189f606bcd0e8426aa3f6954b82541b7e677b0593232b0203cfd3c5ef2); /* line */ 
            coverage_0x20c6cd42(0x04437cea6bcc8598a8b4112bb317585578ddac120303c3a74cf4340a2018a221); /* statement */ 
second = P - addmod(b.y, P - a.y, P);
        }
coverage_0x20c6cd42(0xac85d587bb435d90697e13f8d8c0270e0a5f3fb4b47ebb19dcb29ba6ad33b5ca); /* line */ 
        coverage_0x20c6cd42(0x08fd1053a8c16ef43b8f76f427519e3763e0dbb881282b2012ffaf0c691e8cfd); /* statement */ 
return Fp2({ x: first, y: second });
    }

    function mulFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {coverage_0x20c6cd42(0x45e556942e4657602cc0bef744c8decbfb98f2210ef2a373773670d73b6ce32a); /* function */ 

coverage_0x20c6cd42(0x0a5be28c6e6936f3254d2c0d865ee74f59dc96f2d89c089c09fb02869eb67df5); /* line */ 
        coverage_0x20c6cd42(0xd282ebebfe4d29bb600c650175fc8f747b95da0cd71b2a9f9ee884b441b2319c); /* statement */ 
uint aA = mulmod(a.x, b.x, P);
coverage_0x20c6cd42(0x61d436d731ddbb8c6ddc66d9ce067b6d8cb2eb1ab7c7e55866c35933f7da02d0); /* line */ 
        coverage_0x20c6cd42(0x9adef4065c2d178786a02a347433947f7ef4ff4932efbf3194c791a2f1912a2d); /* statement */ 
uint bB = mulmod(a.y, b.y, P);
coverage_0x20c6cd42(0x50478266a2cfba5bb543f6de0fe57d0be64985a80601e2dfee9b2910977be30a); /* line */ 
        coverage_0x20c6cd42(0x4b2d467613f14cafce37075c36b6460de9b868f3faeb4d856bb3cb29fbf5f15d); /* statement */ 
return Fp2({
            x: addmod(aA, mulmod(P - 1, bB, P), P),
            y: addmod(mulmod(addmod(a.x, a.y, P), addmod(b.x, b.y, P), P), P - addmod(aA, bB, P), P)
        });
    }

    function squaredFp2(Fp2 memory a) internal pure returns (Fp2 memory) {coverage_0x20c6cd42(0x0c2c18ace38ac7aafba155b7823a9e619e82e3888cdfdbb63e80aa63ff646f1b); /* function */ 

coverage_0x20c6cd42(0x8dd81f4e62544fbe1a1fe1a25dc2ac2d210f2d19d3081dd13cfe120612566d74); /* line */ 
        coverage_0x20c6cd42(0xfe77cabda073b998b8c9f5e36bb1c3bfec34b6e33e5c78721765c4ab88ef4abf); /* statement */ 
uint ab = mulmod(a.x, a.y, P);
coverage_0x20c6cd42(0x16dc2fafc29a2ccf51e64087fd546be717b7122c5dc8f8d325d3016d40b266d4); /* line */ 
        coverage_0x20c6cd42(0x2d1d4badc7a2d40b533a7bb219f25d38b4e3109cdf9006bba9d7d84d93bdf29d); /* statement */ 
uint mult = mulmod(addmod(a.x, a.y, P), addmod(a.x, mulmod(P - 1, a.y, P), P), P);
coverage_0x20c6cd42(0xae50f59d3a154463f96cbbda80bc4b47a07fd5e8fc4c1b8cfcc14c89bee67464); /* line */ 
        coverage_0x20c6cd42(0x197ecd541e89a99e9503957eab8d494d84ceb130b6898ab78a77aee611b13345); /* statement */ 
return Fp2({ x: mult, y: addmod(ab, ab, P) });
    }

    function inverseFp2(Fp2 memory a) internal view returns (Fp2 memory x) {coverage_0x20c6cd42(0x9866cf725f161aba1a4351958c74f61e69fc24d26c308a3ff8a52761dc71ca45); /* function */ 

coverage_0x20c6cd42(0x25d0cdf8760d3e71c03f26c2f74590c5c5e12b89f0b9dd32d336b97ecec543df); /* line */ 
        coverage_0x20c6cd42(0x57f52a7fc0e6f7f1abc426093b6413196d442a7159a161feff61f1dad3131e1f); /* statement */ 
uint t0 = mulmod(a.x, a.x, P);
coverage_0x20c6cd42(0x75722fb4a66ce5165801a928675f9a4664de4269486d0a0f01385500faeb1349); /* line */ 
        coverage_0x20c6cd42(0xf7c5d6b1e3950e3fe5832d5e28987dd325ca44391bd0a37d64ecea2d9aa6c13b); /* statement */ 
uint t1 = mulmod(a.y, a.y, P);
coverage_0x20c6cd42(0x2633620db5c4f4c50ce2e7ddecd3f9152b5471e9bf0280914b8f3f8533873217); /* line */ 
        coverage_0x20c6cd42(0x4ea2c9e0a59919b5d6e9f87c141364df587bfb970bf333e4b892c659df31c8f6); /* statement */ 
uint t2 = mulmod(P - 1, t1, P);
coverage_0x20c6cd42(0xe9ef4090e6538e233c18b5aaf4acc4f82f00e7b2d5f60279a548755cd1395852); /* line */ 
        coverage_0x20c6cd42(0xd7e11384a0dad4b2a57750e8ce35c1557754cefde40c9bfc09b8367511bcaa3b); /* statement */ 
if (t0 >= t2) {coverage_0x20c6cd42(0x6546c77a1494bc371ffa651f503d83ab935e7646071beeddc5e92c6ea61773f7); /* branch */ 

coverage_0x20c6cd42(0x6e33538e95d8980bcffebb869fe4e14cc825adee8d381b6d2ffb0ebd419badf7); /* line */ 
            coverage_0x20c6cd42(0xd3402318e5e48aa0df59e733e94f2694cb166dfbe54d2e5f7122f7e11f1dff65); /* statement */ 
t2 = addmod(t0, P - t2, P);
        } else {coverage_0x20c6cd42(0xd47481660f6183eb354ada490b152bc884c50c1df5be39e6ddaac611c02ce8da); /* branch */ 

coverage_0x20c6cd42(0xcbe211a02cab32023e4f54587cbe98950dfe89b13fe543f0c5f7f883085e65c9); /* line */ 
            coverage_0x20c6cd42(0x174f6a0ef6675df2bca28f144764dae614a84fe86cb1464fb2d634233aaa3a53); /* statement */ 
t2 = P - addmod(t2, P - t0, P);
        }
coverage_0x20c6cd42(0x27aed675dfa687b40a42139775943ba0b5d79002ca89a4c0259c021e9e35df95); /* line */ 
        coverage_0x20c6cd42(0x9242c2e414705e42f87faa66240df9f747044ae06432386a5274415951dc9101); /* statement */ 
uint t3 = bigModExp(t2, P - 2);
coverage_0x20c6cd42(0x7547fe151925430ef905e428a4e94f70a4f603e096ffc18e9de87c5141e52cb7); /* line */ 
        coverage_0x20c6cd42(0x0c81ac7e2a8ce389217183b853d89091809e88ca636f4d69ab20c114f2ed74fe); /* statement */ 
x.x = mulmod(a.x, t3, P);
coverage_0x20c6cd42(0x720af863147b316c267e056b21d504544cda4342932c62954158841335dadc68); /* line */ 
        coverage_0x20c6cd42(0x35754a3d3f522aece1ccf6dee0fe3957fddea214bef904fc0f0a60ee7cd62865); /* statement */ 
x.y = P - mulmod(a.y, t3, P);
    }

    // End of Fp2 operations

    function isG1(uint x, uint y) internal pure returns (bool) {coverage_0x20c6cd42(0x03c87dadbafe636d27b81bbf7aae63491db3ee450400fa3c4591dfda5efc6908); /* function */ 

coverage_0x20c6cd42(0xc1b5eb9c3fa98d6919039e669f5d15414a4be5cf1598744ebbd0aa74038d188a); /* line */ 
        coverage_0x20c6cd42(0xf06c160fd1947286a579b2b0f67052a2b533519657c2aade8a113e53c639f60a); /* statement */ 
return mulmod(y, y, P) == addmod(mulmod(mulmod(x, x, P), x, P), 3, P);
    }

    function isG2(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {coverage_0x20c6cd42(0x41706f283ef1c169e026c25fa35b3cb506a234aaf0648aadbe2abd75f7de425d); /* function */ 

coverage_0x20c6cd42(0x6e054204ee7482980f3765ce18b334cb19762022aec7df01ac0ae6cd7c909b62); /* line */ 
        coverage_0x20c6cd42(0xab8d3f2b11ffb04fcbf0638243e908ec59a141f7211a6d92217866436a2e66eb); /* statement */ 
if (isG2Zero(x, y)) {coverage_0x20c6cd42(0xfe57c71f5a3c9a51c2aedb39ca60023b8589ea641fa12f00ab515760ecc66687); /* branch */ 

coverage_0x20c6cd42(0x2cd04bee06a1bb13a286784ad673f13eb7178c2333743179432c2511daf920db); /* line */ 
            coverage_0x20c6cd42(0xd576a6a96534948f4611cd2a3e3de033fc939a01fa8f700a1d36b59a1c63b096); /* statement */ 
return true;
        }else { coverage_0x20c6cd42(0x8c17d5fe1d819d6f518369c45f2699465215aa15d10da361e41bb419487c77d6); /* branch */ 
}
coverage_0x20c6cd42(0xb6a1887757226163b13a74daed0d6d21c4547c20333d0c5d706b667159ca3fe0); /* line */ 
        coverage_0x20c6cd42(0xc2b2e44122b061871b6aa6c6da703826e6c4f19125ced7fef78164c668850f21); /* statement */ 
Fp2 memory squaredY = squaredFp2(y);
coverage_0x20c6cd42(0xd11f0a3e1231df97d422422bfc02e41411a5eac805ab402d98d8b7e230928c05); /* line */ 
        coverage_0x20c6cd42(0x7ca149bda894625742316991259a1be33fa7c8e5162ae7d4ad9d62880c4294c5); /* statement */ 
Fp2 memory res = minusFp2(minusFp2(squaredY, mulFp2(squaredFp2(x), x)), Fp2({x: TWISTBX, y: TWISTBY}));
coverage_0x20c6cd42(0x85f0ece7e0f0bf832ec9648ea754f51b31b6b3bf520ad6b32f1de1427d956d4f); /* line */ 
        coverage_0x20c6cd42(0x46e9691e38ce9b18d9877f44ee8204484cce333f6c81396fd9e4abb6b8f22e3a); /* statement */ 
return res.x == 0 && res.y == 0;
    }

    function isG2Zero(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {coverage_0x20c6cd42(0x73b22f9c23ef66b96283b52ba0cff471733715c67c798771bc86ec03d9439433); /* function */ 

coverage_0x20c6cd42(0x198f07c2120692a224e73c1563c9818ee796f9dec415cf88c573cf34ec3df98f); /* line */ 
        coverage_0x20c6cd42(0x280c70ce653471a33173b3901e851105f7f08e241d37c305220b0a53ef37853e); /* statement */ 
return x.x == 0 && x.y == 0 && y.x == 1 && y.y == 0;
    }

    function bigModExp(uint base, uint power) internal view returns (uint) {coverage_0x20c6cd42(0xffef0c5096da2d5b328dc6859c8447edfac298f0a21167a24e171df7ca999651); /* function */ 

coverage_0x20c6cd42(0x8a5ed9b0dd28c9a2543f5b41d2d3f577dee45af841b63f46a70330c0a3a7c74b); /* line */ 
        coverage_0x20c6cd42(0x15584f6dc8f76b424fbff23e469004700bde26314c1896b9c3e805adff075231); /* statement */ 
uint[6] memory inputToBigModExp;
coverage_0x20c6cd42(0xdf5284c0e9fee390b33c9f52f7da812c9dca5cc35959a24cba8b65f704e60529); /* line */ 
        coverage_0x20c6cd42(0xa1df995bfd4a83aef2eed3c44d9132f5a8cf0de505d350747be780461ea4fae0); /* statement */ 
inputToBigModExp[0] = 32;
coverage_0x20c6cd42(0x0a62728f19eef98a11888a2808e4aa163e0ab801cea386156814d1db8343d3e0); /* line */ 
        coverage_0x20c6cd42(0x611b1336f4f52a5bcbb93b55fb7a60aed2f89ccc3de2f9a683ed9602dcc518b3); /* statement */ 
inputToBigModExp[1] = 32;
coverage_0x20c6cd42(0xe1d40b961c259d826b592d20691146ce3c6548b90fc0876c2167365c90de6e27); /* line */ 
        coverage_0x20c6cd42(0x1916aa599962740c63eecb72ca2cdabcfadbbeddf074302df1e0b5a5ddd27acc); /* statement */ 
inputToBigModExp[2] = 32;
coverage_0x20c6cd42(0xe2b1e5655df1897e393cff4fe4b51757cb98c5bcfdc9ebef78bd3d7f03e33784); /* line */ 
        coverage_0x20c6cd42(0x127552f30785e7dd2d3473b6019b414174de5c6615d241f09118d401feec78b8); /* statement */ 
inputToBigModExp[3] = base;
coverage_0x20c6cd42(0x1437510028220292bbdce67d442ce1234be7020c57fa5a58bd94d1ea93489e65); /* line */ 
        coverage_0x20c6cd42(0x96bd206b4379d3aea00e5716d7a243f0c0088be9f53384448c0d3473f0aa933e); /* statement */ 
inputToBigModExp[4] = power;
coverage_0x20c6cd42(0xfeb2e4f144dfa76155f435096cac0b35d2d4b5380b909092002939203873e273); /* line */ 
        coverage_0x20c6cd42(0x963f23be6ad9bab998d1e186c3145e2f17423abade78c7e92e662bbadc175231); /* statement */ 
inputToBigModExp[5] = P;
coverage_0x20c6cd42(0xf62ffad48ab4816cd6e684e32ff2eb5a4000421aaa4900158ea74d506c4542e8); /* line */ 
        coverage_0x20c6cd42(0x7d9b4ad89c9409ae8f63d9df4691a11ef5bdce4bc2e82d0e1d667c7cbe299dd6); /* statement */ 
uint[1] memory out;
coverage_0x20c6cd42(0x67b69e8d9d29b8b1e2fed1e2fb3186df6b48630eb0639580fc38aa80fad62123); /* line */ 
        coverage_0x20c6cd42(0x6e157341a02a4c7172eb92717f0b9cd8ab2dffb5f9d893f6ab797c2003a6bd43); /* statement */ 
bool success;
coverage_0x20c6cd42(0x7398d772ca2562ea58df6acf3d8250f265589fd3c4a04644b8bae61b0bff3967); /* line */ 
        assembly {
            success := staticcall(not(0), 5, inputToBigModExp, mul(6, 0x20), out, 0x20)
        }
coverage_0x20c6cd42(0x1836a5c51a8a76d861ee8789713b67adecc1ad886168b4665b16f72a8b0d7519); /* line */ 
        coverage_0x20c6cd42(0x62e5eb9ba65d163c375b1a19cf6e32f8fb890d6b31193211dc69f340d9054c59); /* assertPre */ 
coverage_0x20c6cd42(0xc42275bb6f237d75acb956a8c9f7569d80cd986a20d08e547fa5001d081739ad); /* statement */ 
require(success, "BigModExp failed");coverage_0x20c6cd42(0x6066cb76ab63a8a3cd583d449346e38f85a37a5aaab5cfc08e43cdf8b4e9688b); /* assertPost */ 

coverage_0x20c6cd42(0xf891dad7809357bda8854f15e80fb72b00d14a0637708159fbd1fd1b6031efd5); /* line */ 
        coverage_0x20c6cd42(0x75663ce065d5b9b0502a72a4ef1453be03cd737267217b8becb75cf9ef864570); /* statement */ 
return out[0];
    }
}
