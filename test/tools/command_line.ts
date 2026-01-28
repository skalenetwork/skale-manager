import {parseArgs} from "node:util";

const gasMultiplierParameter = "gas_multiplier";

const {values} = parseArgs({
    args: process.argv.slice(2),
    options: {
        [gasMultiplierParameter]: {
            type: "string",
        },
    },
    strict: false, // allows other flags to exist without throwing an error
});

export const gasMultiplier: number =
  values[gasMultiplierParameter] === undefined
    ? 1
    : Number(values[gasMultiplierParameter]);
