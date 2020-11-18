import minimist from "minimist";

const gasMultiplierParameter = "gas_multiplier";

export const argv = minimist(process.argv.slice(2), {string: [gasMultiplierParameter]});

export const gasMultiplier: number =
    argv[gasMultiplierParameter] === undefined ? 1 : Number(argv[gasMultiplierParameter]);
