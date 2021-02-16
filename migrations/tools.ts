import { Interface } from "ethers/lib/utils";

export function getAbi(contractInterface: Interface) {
    const abi = JSON.parse(contractInterface.format("json") as string);

    abi.forEach((obj: {type: string}) => {
        if (obj.type === "function") {
            const func = obj as {name: string, type: string, inputs: object[], outputs: object[]};
            func.inputs.concat(func.outputs).forEach((output: object) => {
                Object.assign(output, Object.assign({name: ""}, output));
            })
        }
    });

    return abi;
}
