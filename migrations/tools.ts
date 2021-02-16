import { Interface } from "ethers/lib/utils";

export function getAbi(contractInterface: Interface) {
    const abi = JSON.parse(contractInterface.format("json") as string);

    abi.forEach((obj: {type: string}) => {
        if (obj.type === "function") {
            const outputs = (obj as {name: string, type: string, outputs: object[]}).outputs;
            outputs.forEach((output: object) => {
                Object.assign(output, Object.assign({name: ""}, output));
            })
        }
    });

    return abi;
}
