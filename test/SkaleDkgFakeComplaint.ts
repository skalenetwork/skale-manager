import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         DelegationControllerInstance,
         KeyStorageInstance,
         NodesInstance,
         NodeRotationInstance,
         SchainsInternalInstance,
         SchainsInstance,
         SkaleDKGInstance,
         SkaleTokenInstance,
         SlashingTableInstance,
         ValidatorServiceInstance,
         SkaleManagerInstance,
         ConstantsHolderInstance, ECDHInstance, ECDHContract} from "../types/truffle-contracts";

import { gasMultiplier } from "./tools/command_line";
import { skipTime, currentTime } from "./tools/time";

import BigNumber from "bignumber.js";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployKeyStorage } from "./tools/deploy/keyStorage";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleDKG } from "./tools/deploy/skaleDKG";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deploySlashingTable } from "./tools/deploy/slashingTable";
import { deployNodeRotation } from "./tools/deploy/nodeRotation";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployECDH } from "./tools/deploy/ecdh";

const ECDH: ECDHContract = artifacts.require("./ECDH");

chai.should();
chai.use(chaiAsPromised);

contract("SkaleDKG", ([owner, validator1, validator2]) => {
    let contractManager: ContractManagerInstance;
    let keyStorage: KeyStorageInstance
    let schainsInternal: SchainsInternalInstance;
    let schains: SchainsInstance;
    let skaleDKG: SkaleDKGInstance;
    let skaleToken: SkaleTokenInstance;
    let validatorService: ValidatorServiceInstance;
    let slashingTable: SlashingTableInstance;
    let delegationController: DelegationControllerInstance;
    let nodes: NodesInstance;
    let nodeRotation: NodeRotationInstance;
    let skaleManager: SkaleManagerInstance;
    let constantsHolder: ConstantsHolderInstance;

    const failedDkgPenalty = 5;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        skaleDKG = await deploySkaleDKG(contractManager);
        keyStorage = await deployKeyStorage(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        validatorService = await deployValidatorService(contractManager);
        slashingTable = await deploySlashingTable(contractManager);
        delegationController = await deployDelegationController(contractManager);
        nodeRotation = await deployNodeRotation(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);

        await slashingTable.setPenalty("FailedDKG", failedDkgPenalty);
    });

    describe("when 2 nodes are created", async () => {
        const validatorsAccount = [
            validator1,
            validator2,
        ];
        const validatorsPrivateKey = [
            "0xa15c19da241e5b1db20d8dd8ca4b5eeaee01c709b49ec57aa78c2133d3c1b3c9",
            "0xe7af72d241d4dd77bc080ce9234d742f6b22e35b3a660e8c197517b909f63ca8",
        ];
        const validatorsPublicKey = [
            ["0x8f163316925bf2e12a30832dee812f6ff60bf872171a84d9091672dd3848be9f",
             "0xc0b7bd257fbb038019c41f055e81736d8116b83e9ac59a1407aa6ea804ec88a8"],
            ["0x307654b2716eb09f01f33115173867611d403424586357226515ae6a92774b10",
             "0xd168ab741e8f7650116d0677fddc1aea8dc86a00747e7224d2bf36e0ea3dd62c"]
        ];

        const encryptedSecretKeyContributions = [
            [
                {
                    share: "0x74997044fc0dbf8d6ad2c3db6d6f78e650fdcffd82d02b7bcd37d4c1e817f320",
                    publicKey: [
                        "0x5b6c340aa86f9f53a3dd19c3fc4e2c1be048741f35c41763d063a30d32e94837",
                        "0x794e6ca938e325bb800f6c5685993af21b13d6dd2e3cefa28ed136f3e713096"
                    ]
                },
                {
                    share: "0x946de8c332bf822b6bf15b6c7f6b859a5247a46fb20495c6a65b0baabfddf09c",
                    publicKey: [
                        "0x8fb6aba303d3254d5e147a99e2d049e71823e8ce0c7b874efed65c6cf59541b2",
                        "0x2a369d48e36f0486628229f7a42d2a8b92ee8f2ec3477e82fcf6044e57a57005"
                    ]
                },
                {
                    share: "0xb4996277b8e20b324bb45ac31593ddd7ea693841a6283e0de663a2a25210dc63",
                    publicKey: [
                        "0x55074e2b548133b240c717673b87301b118efbb474c72264bab4c7135aaf964e",
                        "0x65e5cf0e3e20ccd9e8b41eb3fa1e2fb3aaa3e688871799092b2c146aaa9d910b"
                    ]
                },
                {
                    share: "0x99f5a75616814b6b637397ab2365eefd83dff8ed1281f267508eebbf58b1fdcc",
                    publicKey: [
                        "0x9cdc126ab08d0d99be19e8205b360a7de0f5528eef5a313bf89dce90dcd8226",
                        "0xf35052c93b992c41586c8fa84f0d15a9b07a0bf150b36ba831895e589fe4bb58"
                    ]
                }
            ],
            [
                {
                    share: "0xf06f04c5e4b809a4d44b717859fcbb65617638447c98cf7fb4a4d83e3e9dc940",
                    publicKey: [
                        "0xe5d3623fe57d1061df44bc86d24afea5035f0cfe7d3618c04eaf93aad83c0524",
                        "0x4459af9a1945cdc75311f388291c71ed424972225bfe51fefd65f1d16947efa9"
                    ]
                },
                {
                    share: "0xd35666da0bf83406863a80bd7f9d38768e67f1f83062419b7c14736a0a98291a",
                    publicKey: [
                        "0x7212a1a34a4d9fd123e5ee17f4e29ecd0ae77efe043feff106d5e96c19fcae8f",
                        "0x296eff026a8491ed17ea2ceac08faa4e923b42b683279c2f0c39a1671ada1057"
                    ]
                },
                {
                    share: "0xc33ef8baf18cf3f09f656cdb6d5012f1489862df7afbe9a4291838eb889ccf93",
                    publicKey: [
                        "0x982d5b6dcbb63463b45552ea6769bd7c320cf5e3be542dad6c2afca073754650",
                        "0xa3d97ce152037112a68fe1caa165787760c847e8d62fd0884ba4ef306a91cb36"
                    ]
                },
                {
                    share: "0x49cf197d8cdf5ddcbf10abac8fe603139842789f8eca9f967eb4a2b253ad7c08",
                    publicKey: [
                        "0x2a8db369ff7068df6f97831f4278d4c0d8c51c9fd2a1a424df1adbe44021371c",
                        "0x16eec1a222bfa1735ea569b2547c5f1929face9c3db75c046aceb34b09f2c6de"
                    ]
                }
            ],
            [
                {
                    share: "0x563766ad84daf3ae9a4872ac1152076068cb4ef63eb9ce701e48bf4bf3a192c7",
                    publicKey: [
                        "0xbd0cf6b8421861cbd011074816b0d3212a4f7395a42a1b22fd4379901aad9570",
                        "0xb7b4b418b948bcc706ba5e1f86b47a6a6fd7bd6ecd1c4102b5e9d0388372df98"
                    ]
                },
                {
                    share: "0x85c170752b2c12211dc010bfb6d7ed2d84a8457d595a1d8dee74304fe71f7242",
                    publicKey: [
                        "0x71997650930dc42ee67d7bcfa78ee85ef961b1d3a00b06efbb4711875c5b8e3c",
                        "0xfa8deb68dfa50f4795a3122b6b0b14bf1a2206f170fd7f2b3aa9aaa18ff12555"
                    ]
                },
                {
                    share: "0x61e805815687fa253181aa9e4a3d96c27563a19612cca54ee0716bb47a327f6a",
                    publicKey: [
                        "0xae8a644e6a16849df625051e07a02893b290ffc9d3349aba4c4a167fc08ddc5c",
                        "0xa1fe62edf1de1c93ec55b91989191217a383cfed5315ab4724f7bc307e4111d"
                    ]
                },
                {
                    share: "0x194bae6cabf40f0ac935d157229f5cbc65766746efa9adc4ec0d22049d4ed8c0",
                    publicKey: [
                        "0xb17f1d87cafcb1c25b6d0d7c9b7bd9876a89dfaae095c89b3e6e8a64b42db840",
                        "0xf18997fa13407d337bdb76a4b977c9c0eebfad48471973f35a49a7fbbb6057c7"
                    ]
                }
            ],
            [
                {
                    share: "0xc4c9b7d2c103e2e6ae6eabad2f8cc4689b609ed9a383fbef4631283b69dcb6d8",
                    publicKey: [
                        "0x83d4786b778b7205bd4552164032fc450af8a113605447e37f1377220be94757",
                        "0x9d684b47e011436a75a3461bc358cd7cddb903c5ca5e6e9e6bf3fb968262615e"
                    ]
                },
                {
                    share: "0x81741c178c9109af1b8877b45e3e85b62a7c85c21435805a1ddb08fab3a98569",
                    publicKey: [
                        "0x8e187ff2e9d6110c15e0ec0cf2729c73fc1015d58fb3e8df8d3bef736c68cb1c",
                        "0xa8f04b03ce29735c88f006b22a6311c403f2cc4f0227614796da034b9bf887b3"
                    ]
                },
                {
                    share: "0xe1a7e43508a3d827cc614ad891e704652d07fff8813f98098d1764e0815afa79",
                    publicKey: [
                        "0x90470f72b785d0b908830d34939a81257c396bc3031c8fd9de66f8e614a9ea0e",
                        "0x35d4b630d0196df057c8fd9441f3d71a6f29e73aabf3c205936ac66473dd437"
                    ]
                },
                {
                    share: "0xabc88f11ab7183250d64bd11dcd5d06f9959bff61f88dd4670f01e8e7ca8a2db",
                    publicKey: [
                        "0x2d9547bbce4df3c5f822b8c353a5e36916f28325918f6db7336bce285d1da45f",
                        "0x3444c74b8d193e782d8ff9947a203277189f559d4e03b10fc30d7c468d0f55e5"
                    ]
                }
            ]
        ];

        const badEncryptedSecretKeyContributions = [
            [
                {
                    share: "0x98cc632f55b5482f2b04c75975f76057fd5601e387fc11c8f40b2281f91b02b1",
                    publicKey: [
                        "0x18b9f4a75a693d20b50239b00830fc4ba2e9637e820262ed8a7369c2a9e63ec5",
                        "0xb86b7e6467c814fa56a03f6cc527916080efadfa6d0b6665a7d86c4a1af00767"
                    ]
                },
                {
                    share: "0x36bc49e428daaaed93a2f968ae6e51082b06209a40329f124aa45f82400ebad2",
                    publicKey: [
                        "0xf2e8ac9d22a3d0014267668b115a797dc5d6a7dc8430185a043dc6e3f727b093",
                        "0x927eb760662fab05e9afb65b5eaab8f28c0f4208b3747eb13dd959b4e4593667"
                    ]
                },
                {
                    share: "0xc59ae50ba71e0a849301bbb9da959f9551e6f02893d36fcbb93a001cbf074a53",
                    publicKey: [
                        "0x90edba0f76d6b345dafa3853ffa12cc9eb9b3a32cfd83e50abb6001bef76592e",
                        "0xb28f590c4b6eea5d109b39f0565156a1f892c07530b2047ed9adc7c33db0a2f5"
                    ]
                },
                {
                    share: "0x8d0f22837bd26abdd9183251f03ec78a5aededd8d6a1f52f464aa4cb8c14cfa4",
                    publicKey: [
                        "0xe921e5699ae18ef6a3b7372909a3cb759d2d123ef9382339c5fdd56adcaa3629",
                        "0x38b20c244d940b1fac10cb1600976d73103746abf260b84d986a72c844dfdb73"
                    ]
                }
            ],
            [
                {
                    share: "0xc6e7f8cbecd53f6345c5210c63ef18df3d8729fd18fb7ebc983ae58e052aa666",
                    publicKey: [
                        "0x18fb040005aca62fd7687a1b00158c37c84e4977572fc48d777000851690a214",
                        "0xdb377b399eea293f74781ee50777421a3b035320744815bb929f55fdcfc1afdb"
                    ]
                },
                {
                    share: "0xf6a2b2442502a0995f4ae9bd1f3f40c68fa1c2db7f4600b5094bc7673ed5cae5",
                    publicKey: [
                        "0x4b226d0d042b7895a8290b86c9ffdef3188a82969072c2379a4cf098178d6f9f",
                        "0xdd74c5230d6e6f1a10e75d7e128ba922a3d86b81adacd3490fd6c50d5fda931e"
                    ]
                },
                {
                    share: "0xc7c407dceaefc47702474264ac1c32538674089fba9a5f18cfbef13747549108",
                    publicKey: [
                        "0x11aac6fc451090da8187291d491ddf7268ba0ccad24e1822f9dad0560acb668a",
                        "0x8ca0b694ac11a66da3555a732840b0e4d0db0789c55b3f7221afe95790ef346b"
                    ]
                },
                {
                    share: "0x2048168e881bc149cf5acd890e69db98d6a103e18050fb6bf1ed0b8dbf286a97",
                    publicKey: [
                        "0x3104bda4ff3c583c933003a12ce2e961c16a56f2b08b8c5f542fe666470c5c49",
                        "0xdc3eb23bc95014c3afad0b942bc5ac4ca5b1006a157b88657cc0e74b276a5bbb"
                    ]
                }
            ],
            [
                {
                    share: "0x8ec19a76f9dab88930db5ef04e4e42cfbdb6b164ccb46f8a6b913a811f2957e9",
                    publicKey: [
                        "0xefd4935ab5199089d08aefb79e017c15b2ec1c2d1b5ce765bfa6c674bb0996ed",
                        "0x58a09ff5a2fbc9d373e7c42c87df3b0ef24fc2094d8419da2b651d0dbb786fd1"
                    ]
                },
                {
                    share: "0x22ebfe9540e5d94a58d29b27d2ea52b36996072ce8e352c45c1abd4a413f4548",
                    publicKey: [
                        "0x9a5f97abd3af002b31ffa2e2f22c619635adcd6a373849f6e6bbf3902a6ab53",
                        "0xe8b4ab57f85e46bf7e6392f05c853a2534c08bdfbe0350a48d33cdc8a8dedc33"
                    ]
                },
                {
                    share: "0xb5cca2713381b16507d88271547ae2aee55229d6cbbf04935bccac7da36fae40",
                    publicKey: [
                        "0x40b3af6ee7837e61906bb4c92c971da9c42eea8b40f62b0e8a64de8acaede30f",
                        "0x4dbdacd4eaafd8a26dce990025536445d979bfeb2921e5f448a8e37dd9b37535"
                    ]
                },
                {
                    share: "0xf7a0de59d292c66071c4867cdd18f41af1e55ce94e2791794c4be074261c9431",
                    publicKey: [
                        "0x448302065f28b1f6c62133ebbc8c00a3dadbdeba16ea69d02588aff3d41c6fc2",
                        "0x12206829d33837f9f6d564df434a76b1e8e93f2de82bfd9d93d0b3a0daf362"
                    ]
                }
            ],
            [
                {
                    share: "0xdd585135753d84cca7ad29d1feb49c6130804bd7ee290fcf57817c0bbbd67d32",
                    publicKey: [
                        "0xec0d22cc8a707b4cc9d5cacf2974759ba008c97617d0dffe3b78766836d51826",
                        "0x1aa6c9392a3f7c49bae5c94d309210f44e9fd10502fd958e4b1df8df57d17df2"
                    ]
                },
                {
                    share: "0x7a25f61a2405598e5d7af9c3838152a62ce335968efbbef485a78318f48bd463",
                    publicKey: [
                        "0x334a69e209c51132eb9e7f4bb227e3ddb1ff53b0e7da8ff1f0eb5478f955b2bc",
                        "0xcf101862383b44e7be48ce61723dd7e6f1a2712fa9e8767def2f7121a2ae44f0"
                    ]
                },
                {
                    share: "0xf088926585f9c02c640a72e96a6787a5b16aa8a1feaecb1be08d9ae32cf4e534",
                    publicKey: [
                        "0xc7352332da0643381bd93852ca89ba74519b12e987bdd71da94c4de11f3bd573",
                        "0x1fdf8fbc65e943f5c3d60bef5753df77f5b8ea2f20ca356a3c93a883ac72a7d9"
                    ]
                },
                {
                    share: "0x90a2aa5f42ffa9a91dacef8d2951109ce9e8a121f3835e7581b5bc89c5e63035",
                    publicKey: [
                        "0x4fe2dbe5f8436797418e5ef50b268f5c71100f9c23df3b20337238fa6c5ff9a",
                        "0x11571aadffbeb4dac4341550363fe0a8cdb3a0e5200dfded431570cf52173370"
                    ]
                }
            ]
        ];

        const verificationVectors = [
            [
                {
                    x: {
                        a: "0x1e6e075338ec8cf604af22511625d5f9b184b462844fd0ccf301a198f5cb12a2",
                        b: "0x1b85c72c39aa376df512ba5217376ec90c2492945a86139a136b35ff616f921e"
                    },
                    y: {
                        a: "0x174265c0fc2ce359084b239ad9b703441998df7fee298741e52c2175a4a4adb2",
                        b: "0xa1cd10cadd730b54ff21aed30be2dbdb315afe48b3d01c36a5301b0587c9350"
                    }
                },
                {
                    x: {
                        a: "0x29b361184395f6fc0116eb3a6f7d7ebde8f30c6606d78d389fe1eea772057f59",
                        b: "0xf51d5bfbfba84a92eab561f5c27ae31aef5f9231f64a416b4193a3026bd42c9"
                    },
                    y: {
                        a: "0x2192c321f3856ccf0d75c1d705b06fce6839feffd8a08ca50999a6ac480039a5",
                        b: "0x20e656db446c12ad9ea7430d62d54491aae1b72bbf545a89ac1b8f64ef44fb65"
                    }
                },
                {
                    x: {
                        a: "0x272f9995e067c924c4972f0987dcf18a8ce8c53364306cf5dca58eaf0875ac6c",
                        b: "0x635b7c445eb73dd5631b8a9b43db49e64e53a12f99977a6c42c575056c95122"
                    },
                    y: {
                        a: "0x94c75cc853d4850b8ef04cef73de0fa2910c247d7575a326395e53dee2f857a",
                        b: "0x1577eac1bd673048afd017c4775c9f961bb3a2bb3181e2774ad8d57c770cc63d"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2a2fe9290dac9173bf403b7eb84dfe2e1779692c69a249f880e71df2308d6b02",
                        b: "0xc6b3fc6d4f54d5a8f47d8df1000563e7978e6e8ad79969db5d7fe5fe9b768ab"
                    },
                    y: {
                        a: "0x1231f93c5c14c530478e19a56e4bf0fca86ce081f79ff170d2c365bbe3e13c61",
                        b: "0x6f3728f4bdb694ef68225224e1c1c60eaf095a9da784e433aecce28b01004d0"
                    }
                },
                {
                    x: {
                        a: "0xb6392a2de9a8e405474a862889cc203b85cf10ce38369ce9b02ead40c284b6f",
                        b: "0x108f7e0d02067afe6db52a6e51928abc3854794b73cb0949028f06ee9bc9b712"
                    },
                    y: {
                        a: "0x859827216ecfdedd71809b4a54c04870d977be3fcad999013546eefb988b5c7",
                        b: "0x121f228703cd90e0c3726b7b5a87338f9237f91c17ab2e80751c454821bb43d9"
                    }
                },
                {
                    x: {
                        a: "0x11feed899ef9145736d7a2d1a2cdb99a5fe529b6112e42ca6cd892f1c90efa8d",
                        b: "0x2b286caa9a04b668b28ec93a8831a076e89c5b892c0c731f04a2f2a5c9e89cb7"
                    },
                    y: {
                        a: "0x209566e066a390b2f213b3dadd17d3c3e11cd6323651490d3774b41284e104d0",
                        b: "0x199627b30b2f8b3906712c5d19c98b68ed8fcb25804522cd4dc31aeb897a9a74"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2977d5b736016a91571f86fef1f2148a7362466f55bf217aaf8cf445416769c1",
                        b: "0x22de89fe5bc828b3e840b7894c8c659a63f8243a4cd448a6473a96140e6d17d7"
                    },
                    y: {
                        a: "0x267050c045cb75f294e73bfb3abc06482d163bf4bfe02e8eee35a35a8a03965",
                        b: "0x23e476d3e97b7939d56254baa86f930f915e769411690dba2766def855acf3ed"
                    }
                },
                {
                    x: {
                        a: "0xc6a0282256bf71e9ce380bf658aa60cf1d8f00d16c5d62d63d1a76589deffae",
                        b: "0x27f106d03b70016cdfe68141e2cca2760d1281490ac1f9ca8ccac7de9a91b0a5"
                    },
                    y: {
                        a: "0x26b5a8f977373b383fd4be270a92191869ecd03789616520303a9903840846c",
                        b: "0x15a561b160c3330aea31ccba8d71c77049714fe294ceb7c70600e53becbdf6ea"
                    }
                },
                {
                    x: {
                        a: "0xc1a2c7b04c774e630876d2ddfe00b16ab83f138ebc1b2d8940760ae395d63dd",
                        b: "0xcdb7f9b915cc5e899cf9b1378d7a17cb03add2286c0c721ac0dcc0f722203db"
                    },
                    y: {
                        a: "0xa758107babe35640e20d1a02d6eb0f07f6daec2a1b66f7d1b4af43686fae551",
                        b: "0x193a5f27d1a98a340f61a6966f00360a49af565817691b0356908a3b8b66e2a6"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x28b25a69fde6566272ea92f41d6e466260376bc5f38d92f606536810d9c26546",
                        b: "0x13e561299bb7ec35a76ae7f18d16446dd34a35fc2c42adff4823db4bda3e3c3d"
                    },
                    y: {
                        a: "0x1ab82d04b3c58cb942bf31a63b39903c4f28ba565fc8f2b2dd1f649e2204fd3f",
                        b: "0x1fc8a151380f59a44b6139561608f1f53ef24d3272c895243d609cdba3d95f3e"
                    }
                },
                {
                    x: {
                        a: "0x318315358286c97dc122e81b7eb6a49843d2127b0450d8eeffdd43150020bf1",
                        b: "0x1b90e5143511db72b023c3e6179ec822ae162e9deaa3f4b631c67d564deda696"
                    },
                    y: {
                        a: "0x22c94cf52a06eeb1e1dbf191a99cbf0c30890ec79f17b8703337e2effe1139c",
                        b: "0x27c9137635c07fa316cdd4c21fc1a4072353ac8b75fbb9ef5e1f7612bd5e6631"
                    }
                },
                {
                    x: {
                        a: "0x147c80f22bd325b3b103747d96602928b19bfc070ebd5d84bb1581539a6dce1a",
                        b: "0x2dd5ddbf3f8565b8c95d3ea70f328f73f1e536e4f1e0cc59f24b35b9bdede74c"
                    },
                    y: {
                        a: "0xa2148b6dcf01f00420101d8798cb6a2bcd9dc7629054f79a8f0271efaac2c01",
                        b: "0x9a3750811006d59670fbee24789f63f2c695aff7daf3eb159585ff8b9b6e583"
                    }
                }
            ]
        ];

        const secretNumbers = [
            [
                "15851861953967639449963834514389442009886764699441147827602435656125414899749",
                "99937639136239497604316618522588429284632659360037510883696543076355720216476",
                "16427385810518614878780613042695523546320337130984047458087690386464351333989",
                "62624680623127682029448749096407211718229857136997791302616496622136927468859"
            ],
            [
                "114081761415890835849856029876439223023498576233017449693828409002649571557809",
                "89527971820216803066161904514418197839182483539015438028957368301947058446053",
                "109900435341673499695802853562576366539882975245412904003270299504263061226247",
                "87035802346150256959954921838089338554139438678200281482565340882955317837440"
            ],
            [
                "95385063906629353324759087675762412288285322242894865555691694718118680541221",
                "15371892495452349591571876553612985236762376939219890386117967875759475388194",
                "98606488869146578356047332359863225003990433046672041097219494056477967255105",
                "109983168375840474347309469001278580090134955697010326556657975859454391302403"
            ],
            [
                "86679107239183479535035708093457752497085925931995915740769495134029368951159",
                "51699469137684660295960091596065420295614049503826223999442494818486197781954",
                "83115555519451263565390589364149353815547056495981014636859464762594230007606",
                "106413311622922420646252868550654486692243221445495748118167664988247880017078"
            ]
        ];

        const multipliedShares = [
            [
                {
                    x: {
                        a: "0xbf2103631c4a93e616f6f6005b03a23e5831857f413aa8c7127d56b8eddb1c9",
                        b: "0x2912a0b394d44af6ab0de85d6949cf1e643fa217eb707daa1d51e62e988960b3"
                    },
                    y: {
                        a: "0x79bc3d4f28073bb27c1769a2a127068126e1345e358c853c2067ed8121fd433",
                        b: "0x11764713ecfaecd787e1c381d4e7ac296d6a641cf95a011636de3765a0025ef3"
                    }
                },
                {
                    x: {
                        a: "0x1f7871592a535a27ec908177a60e0518bfaca5c0bef41ece6e16fe438b9d8303",
                        b: "0x24f0dcf36d163b29085a017d2d2b0ffde167dfb6e991e986561912be2ef3fc43"
                    },
                    y: {
                        a: "0x30527fa6b64d9982a53726b82da0956a7b866f868c7625a6a6524ee4f24d7ef9",
                        b: "0x11ded86d1aa763907b148ee1024a0c1b366ce52e1bd5a3d9ceac6b02cf4475ed"
                    }
                },
                {
                    x: {
                        a: "0x292b02d6ab8e9e5299ebc0a3b75f0282eda9998da3536d349379d0aadc75c8ee",
                        b: "0x20a59df64fca9b1a16affe05021e16a9ed9ab39eb9d300e088968b80ee3485de"
                    },
                    y: {
                        a: "0x284c427749ec240586fb011c9a69c3ad050f80374441d10b11148de6c038d3a5",
                        b: "0x2f9e9f1f6c761be4ccb708994a5e1c25fbde39f935a813000a872ee17666c5e1"
                    }
                },
                {
                    x: {
                        a: "0xab6ae562c54b70cb0adb101643e1e5c17bdec9fbe986d3b8e8ef1195e349771",
                        b: "0x1300caad8434663e3b448318f95c8a1df450cb95d156a945d6843808c6363d95"
                    },
                    y: {
                        a: "0x1cfebf34c3659d17b6858573254ed44b5822dfbd7c7a0a6a89dcd89c829d290f",
                        b: "0x883a1a91dd685a0c557e4ff79d25488f2e664dca9b013564a9b8b154e0d45dd"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0xde2b328c93b0bd260c16e8839043fc9f63f452df683c9c2f0bddedbc0dbc56e",
                        b: "0x2a35e41bdf50d53104f79470fcbe4c4bd51534df63b4e282b30741df985c9d21"
                    },
                    y: {
                        a: "0xe08e15a7078981369f0f15c907f2f2d319721bfd64660a66ee483968cc4f0c4",
                        b: "0x289bb2f2139b9e32c56b418711837237ee995825b53801b6c1c0a0664f5f8c4f"
                    }
                },
                {
                    x: {
                        a: "0x2703b335d9421ec3a3c7e0be175ca1e4fe9142dcb763d2eb506591e9dd528146",
                        b: "0x1baddf811f1b167b350d0daedfba80766aaccd9355c79a6d23f13aa7915e105b"
                    },
                    y: {
                        a: "0x1174c5419f79becaad20c63e8528f01ca84af029aed14ce9f4d356114cb61227",
                        b: "0x6921e6cc47ded72f67a7be54852583d93536feccade271e85ed6dfa9a99104a"
                    }
                },
                {
                    x: {
                        a: "0x1953e6fae2297a7d06ee94859a1d35fcb67a92ab0c3fbde2e1e651bd1a3e05b2",
                        b: "0x1080ff16d0cf7ebd02229ec1cbbd5b08d3ae63ac7d63b5d5c313e0614814e494"
                    },
                    y: {
                        a: "0x26231bfd5acd651f1419864e50faa379b7c044380c3eb98f6156fea583ecb0d8",
                        b: "0xb657243870bf4f9704a14360d51f3ad68fcb25d879cf0db2f6d04558ab685dd"
                    }
                },
                {
                    x: {
                        a: "0x121ee1aa25c9852265669c5d12d4d3828403c410ef0012a6ae9b651c50643207",
                        b: "0x8a0eb55be7e9e22397a4c0ef182ac04f17dca894be8d312aa69ce4a563de804"
                    },
                    y: {
                        a: "0x253277f21105d860ab13f9486a98e5b512363f5c6f0520e85b9d8c237446bfbe",
                        b: "0x22776f28a88905b86a29247baf6cbcc6fc46cc8cd7429fa0e31818964f07cfa3"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2889602cfa527d02433512a26f536fe37d9afc407d12031f1a6dfdfc6c378846",
                        b: "0xf9cadbd606dc9b17b097c13206fa314363c3e801b4e02093bcd867ff42ad549"
                    },
                    y: {
                        a: "0x892159a6bfe2e9a74910841c446386ce298c10c092ec7cd27d67880061088b7",
                        b: "0x10424a478277e98f7ecd9fb584e6a9a3587e60b09fafe97f1f6a47c7ec107041"
                    }
                },
                {
                    x: {
                        a: "0x25f15ed6cafa9f4dd1fe3fd5364c8124e16ab64dcdda6e212119a36c6f57bd0a",
                        b: "0x23c96384d2660b56264ce5b0dd9cf10afe3c1b55e628a2dfa5f91054e2c2b797"
                    },
                    y: {
                        a: "0x1d9ca99f029bd79ac5c4e37a4db9e3d2664868a8013049c1d27dfc5deca38b2b",
                        b: "0x1254cf7935eb00fb27f83ada3dcafc7806bf909e2deea51fcb4fb79f79b1680d"
                    }
                },
                {
                    x: {
                        a: "0x20bb4b9362c69eac60d7369c202f87b3b971f74b36b70840e18dd8bce44a3740",
                        b: "0x2e267a91eaf7930f464bae2bf920450825568bc709e44305a3573d573e831e06"
                    },
                    y: {
                        a: "0x21e91f233efe3b6429b1cb9b7b097f38a31ce6bc428f29e946b2e776b371f257",
                        b: "0x729e1621334029f3604ec479458ccdf3d4515a393d867d714dbff2f58a07ca7"
                    }
                },
                {
                    x: {
                        a: "0x20d463b32b3a55991f5a9ab3d87f5bef790ed0ee9a8bed15e83f7fe2893257ce",
                        b: "0x1e8ee30ecc2422210fb00cdfe8b94c3c2cc6e882d96a1b93f4145d6d00fb4d67"
                    },
                    y: {
                        a: "0xd6db73a37f1b71b95b9ba743fc1a72113f7c3e7fb035b74f96092b5d35ca4bb",
                        b: "0xb35ed49bc52f348cdb034317373cce8cf577189c60b074abf9f7cad1a1f3ce8"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2e891e0d909d1cb19047c11aea9dae892a4cb8d8e1cceb26c1c7d614fda6b593",
                        b: "0x1a29b683771ff8e8e7bedfb97b1236ca490650f1cb377c5c112cf8e8a27da673"
                    },
                    y: {
                        a: "0x22bb44fddeb55ff5fe162e1631dd98b95156c3849e1fb2d02a4f486c5e2bf7a3",
                        b: "0x456b87e06828870370892000fc11397361a4206cb4f7f272eef9081c47694b5"
                    }
                },
                {
                    x: {
                        a: "0x21ad6381b2c27d9185b5b34228804fd1e5abf853405d4370a6258504ff863f37",
                        b: "0x1a2ae796f0069ca58bb501407b10cd029075215d309e42781734734451e1d21f"
                    },
                    y: {
                        a: "0x1487826a733d84b5e986ecbbd90836e3ac7f28216b8b09f09b39dc3c9303c6b9",
                        b: "0x17260340b922cede15f46b8d8d0ce1fba23735948fc00faf52b52e4547127a61"
                    }
                },
                {
                    x: {
                        a: "0x168963072359e13932d24f9c1cc12d5643156fcaf1cacd2f4d57334fa821cb3c",
                        b: "0x293b184692228e076e84d0079cacce1ac30c19f4967fb1f1756ab313123d5a8"
                    },
                    y: {
                        a: "0x29815ed81d56383c02b1fb67da8d8f226f5e1f52a23097fda70538e98e177d84",
                        b: "0x144ba678a8ef63462682437a248b44cd3935e74e65f2dbf5131a519180249fca"
                    }
                },
                {
                    x: {
                        a: "0x1a1a773187da322795747d63edd7d304b3396b872fad9f1b926332d90eb11abc",
                        b: "0x1805539c3631729532068ed81e28e19eb3a4371fefe2dc3b67d10ebe0caae1cd"
                    },
                    y: {
                        a: "0xcb921413a9f2a02c86e9c639792beda91d8389ddecc09da522beff69ad41f50",
                        b: "0x1d59be6877d9ca05928c4a905e16610c8d36170ba5d9ccd78a30d35f3d9c9bf4"
                    }
                }
            ]
        ];

        const badMultipliedShares = [
            [
                {
                    x: {
                        a: "0x9ca436feeed025ef5c4905a801c3fc4c5d7b444049c510b5cdd7799cbdcf443",
                        b: "0xac17d51383dc1286051cd5a5200b7252473641bb1b7dd479272acb043810d5a"
                    },
                    y: {
                        a: "0x28abe38f353692bee22eaa2382fdf4fb205cda29acd251d82ed790eea50b1e26",
                        b: "0x251fe847a6d363dd057c76729e0f3fc15c1be538eba145e1cbe4dd60189f3c34"
                    }
                },
                {
                    x: {
                        a: "0x4c7236af30fe4c92881b77cd68343277b51a27b13f2dc83afba681b52ed10db",
                        b: "0x2ac59ead1fe757200d9d46a5abc7419bec7c34d1e63db57a9be052eae7504b13"
                    },
                    y: {
                        a: "0x2ccc6cab1fb6657c5ddf853225bb8d442ef52c04c8d0bce2b62dcd1616171592",
                        b: "0x296227e36080e8af27b92c0833cad50d47405797c3c769e766d6db17da7ddae7"
                    }
                },
                {
                    x: {
                        a: "0x18e9702d6ebdf18ca917290dc44ff7fa0490cb1fc1e0fa25c551476e25dfc4b0",
                        b: "0x2212be8998f4c13685d9a8b6e0efd8cc1fdf9cfbab27d3745fdf2639da53110f"
                    },
                    y: {
                        a: "0x1967d3030900437f71ec4f7d8e9198c93e93e65442594a3ece35d14a36e94e22",
                        b: "0x20ea57e45c1244e44d69360b005da00b2107255862243e81df56afbf61f69605"
                    }
                },
                {
                    x: {
                        a: "0x11da403534b8ade498907d24e779a366aaf554b0495bc9466fab7f3d4ad74334",
                        b: "0x1e2e9ef53eabf6852cefeb58ac710a62fbddd743f9dedc52545c206235a5875d"
                    },
                    y: {
                        a: "0x10315dca2d49b1a5649345728b207ba758766dd527e5afb9a8b16e7a48ac037",
                        b: "0x2f0f31abda927f486ff2d5fc0a00fbc5c1b62d1bba4b791ab7c4198d64b1c9c0"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2706cd84261ebb59f7dd420f3147089302dcb90aa66bcb414089f2cd4eba6c51",
                        b: "0x171f0ae14c2bc5e03bc63ff4cace8f536efbd0f17bd55501c0c711e311260924"
                    },
                    y: {
                        a: "0xe6ae589557630321e880486ea351bba3c3f2c453ed292b786f5a6cac4742214",
                        b: "0x537b99ebd42319b30a8c7945f6e446d582e118388b2ae6c3a90e57650c5bfa2"
                    }
                },
                {
                    x: {
                        a: "0x21644f340d90cfc3449c9cfb5be878bcfb449cadc2c306393a8c8c26e9afb8a1",
                        b: "0x4d3b09dfd22729700bf4816187d711f523260181f582b68b5ea583dfd57ebc2"
                    },
                    y: {
                        a: "0x477ec5c61ae9b300bf46f184d203bad03a930259469ae3152813afe147427e3",
                        b: "0x36e6e43b1c78b29dd41f9e7c634e51543fb8c540cb5b72b2a3fe597b80e68f0"
                    }
                },
                {
                    x: {
                        a: "0x733d4bce93aa70758c02d49b166dfb634d407d092d2cd99d06ac8bb07602d71",
                        b: "0x23aee6a29b6b916fbc0b0e57d276dfa7b8ec76b605362f94113851a858bed97"
                    },
                    y: {
                        a: "0x14151cd5f923aa32178d794b6a2935c6066a8ec8984d454539a8e17ac9405e2",
                        b: "0x1e90f7ed92733d166acf496bb22791323bb7cef90d033dd6b3fedd93e8c812c6"
                    }
                },
                {
                    x: {
                        a: "0x3a9405e5a37f5659ebb40c89c87919f30e1a9532e67d85185d7a826f44108f6",
                        b: "0x3dfb0cd7e7e80424e5c6a3c7019eb9c5d950524475fe77d3e0b269ac0043124"
                    },
                    y: {
                        a: "0xed491ac59c4596fd62e6ec66fe2ee064e88ab183768e138b9275d9379262dbc",
                        b: "0x274de02a12b16a1c9b61f517b75b14ce7102bfeac2d309dfd36e12c221add117"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2dd24f274d68896303284f616159ca3e0d9fed14ed539f62e625e76767c75b32",
                        b: "0x1a47a9d84ad8d1f6f10165afd19573df2ebdae2cc2c2d0c3bfec30c3d3c4001"
                    },
                    y: {
                        a: "0x4ee9edf5197344e0ba24d36d70be9652a005d80bf6ed3873b4cfd7c54a92400",
                        b: "0x1b5534585c4b02f9ca1765e7b6234d924e95f1847a9d19aec3d254c8936b6a7b"
                    }
                },
                {
                    x: {
                        a: "0x186e1541b41cd371f60066e6190b98b24058f2fd170245e494fdb9c00ccefb32",
                        b: "0x128343ebae8cac92ad2d703a2e5b0d1f79367e86614dcf4e674984a823ecc85f"
                    },
                    y: {
                        a: "0x18701602a18045a9cb6dc9c5cd864c203909c3a7c5a0f71610ec44d82f7166fc",
                        b: "0xe3e669d9be25e5859e6bfa8c74711ff83bc18d9ad36af8df3a7a0b3c104ba8f"
                    }
                },
                {
                    x: {
                        a: "0x2492be4794482da8b550ea2eb1f22f87010c53eb8164af647f4e109ccdbbd543",
                        b: "0x6535cdf9cbfba39f98f2a6d763aee7d5c5ec0a7274db2514fd1882a292c26c7"
                    },
                    y: {
                        a: "0x30028a0ae7bc9af6deeea1a08f4514a1476f7bbd18e23fcaf479d14b22806f9e",
                        b: "0x298341c7b43f51faa79e511969db8a4f46115c22de10c3e4caf749a3b37a313"
                    }
                },
                {
                    x: {
                        a: "0x2b0d090bac223bcfc4c7aaaf771513420639e845127ae4702ce44c126bb443e7",
                        b: "0x1302700f0abd4082350ddaba69856b03aa37b567b33fcc18bd4d0d91196f5b5f"
                    },
                    y: {
                        a: "0x2a70a1fc90e5c8d7d1977ef36f9b0d0397a92ea97fd7878a71fa8c73a916a3b8",
                        b: "0x592a35d5a26152f09f0fad20732427511e497138ab1f98efeb146cd21dfb5e5"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x275b882669ac1f8d36985b005c1e4627481ac4ca853f6fa2aace51b65d8e75d4",
                        b: "0x25b43270a11cd85e0e050daaa6837058c33b9e4caaa1d39f8d668f0bf2e58a61"
                    },
                    y: {
                        a: "0x672165cfbd0aa676c987fd4bfe78d708f732fe08978fa48142fbe5cfda88fa5",
                        b: "0xf811acc5bfa997e6c1bbdd5b38ab4e67dee26256b0aa84006cda3f77b05e63"
                    }
                },
                {
                    x: {
                        a: "0x1e4667ce4f88d488b1ca25955b82e905059857e2e44963c5c5a3685f38f00bf9",
                        b: "0x10d0afe2e11fc23355253c6a8cad2fb1e22aeb4066f7aa4885e8addad953303e"
                    },
                    y: {
                        a: "0x206c5e5ce1d4c0066c780a26c475d77c120fbe032f1dda367ad86b0900053c4c",
                        b: "0x1b4680ea16c1f61851653ae82bfd47d551bc4b8972a0ce9fd2962b0785cb2389"
                    }
                },
                {
                    x: {
                        a: "0x20995fd8e0d3eaf9868bdd8b6e9f35490f48d72b3fbfacb8adeb552e0d1c8f25",
                        b: "0x216bdfaee16ce3631e467c065a0c5c15b6b0c61d58b3cce139e699e7f8fd7164"
                    },
                    y: {
                        a: "0x2c5a065dde403434a839cdd1d73f5d61496307681608329cb10d17b63b99305c",
                        b: "0x172ca5a050a1a7414ed844c442a099eb5c4cb6d559662770654b269ae84481f5"
                    }
                },
                {
                    x: {
                        a: "0x1e27960670f1f51567b660dd4c3084c03f964f28d0d09b668aa89dd3618ff67f",
                        b: "0x208338ff486a3cc3d3c402438111ffb9756364e10861ef1847c5f83abd57bd96"
                    },
                    y: {
                        a: "0x28da69f538b9a9decf573f60cd11195797e7e386a0dbb535f007561358635386",
                        b: "0xe69db2b8a56a026f035368bf43ed47cd3edc5d0681a13ea1c75f5910155a420"
                    }
                }
            ]
        ];

        const indexes = [0, 1, 2, 3];
        let schainName = "";
        const delegatedAmount = 1e7;

        beforeEach(async () => {
            await validatorService.registerValidator("Validator1", "D2 is even", 0, 0, {from: validator1});
            const validator1Id = await validatorService.getValidatorId(validator1);
            await validatorService.registerValidator("Validator2", "D2 is even more even", 0, 0, {from: validator2});
            const validator2Id = await validatorService.getValidatorId(validator2);
            await skaleToken.mint(validator1, delegatedAmount, "0x", "0x");
            await skaleToken.mint(validator2, delegatedAmount, "0x", "0x");
            await validatorService.enableValidator(validator1Id, {from: owner});
            await validatorService.enableValidator(validator2Id, {from: owner});
            await delegationController.delegate(validator1Id, delegatedAmount, 3, "D2 is even", {from: validator1});
            await delegationController.delegate(validator2Id, delegatedAmount, 3, "D2 is even more even",
                {from: validator2});
            await delegationController.acceptPendingDelegation(0, {from: validator1});
            await delegationController.acceptPendingDelegation(1, {from: validator2});

            skipTime(web3, 60 * 60 * 24 * 31);

            const nodesCount = 4;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[index % 2],
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[index % 2],
                        name: "d2" + hexIndex
                    });
            }
        });

        describe("when 4-node schain is created", async () => {
            beforeEach(async () => {
                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    validator1,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]));

                let nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
                schainName = "d2";
                let index = 3;
                while (!((new BigNumber(nodesInGroup[0])).toFixed() === "0" && (new BigNumber(nodesInGroup[1])).toFixed() === "1" && (new BigNumber(nodesInGroup[2])).toFixed() === "2")) {
                    await schains.deleteSchainByRoot(schainName);
                    schainName = "d" + index;
                    index++;
                    await schains.addSchain(
                        validator1,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, schainName]));
                    nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3(schainName));
                }
            });

            describe("when correct broadcasts sent", async () => {
                const nodesCount = 4;
                it("should proceed reponse", async () => {
                    for (let i = 0; i < nodesCount; ++i) {
                        await skaleDKG.broadcast(
                            web3.utils.soliditySha3(schainName),
                            i,
                            verificationVectors[i],
                            encryptedSecretKeyContributions[i],
                            {from: validatorsAccount[i % 2]},
                        );
                    }

                    for (let i = 0; i < nodesCount; ++i) {
                        if (i !== 1) {
                            const result = await skaleDKG.alright(
                                web3.utils.soliditySha3(schainName),
                                i,
                                {from: validatorsAccount[i % 2]},
                            );
                        }
                    }

                    const complaintResult = await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        2,
                        {from: validatorsAccount[1]},
                    );

                    const responseResult = await skaleDKG.response(
                        web3.utils.soliditySha3(schainName),
                        2,
                        secretNumbers[2][1],
                        multipliedShares[2][1],
                        verificationVectors[2],
                        encryptedSecretKeyContributions[2],
                        {from: validatorsAccount[0]},
                    );
                    assert.equal(responseResult.logs[0].event, "BadGuy");
                    assert.equal(responseResult.logs[0].args.nodeIndex.toString(), "1");
                });
            });
        });
    });
});
