import * as dotenv from "dotenv";
dotenv.config();

export const privateKeys = [
    process.env.INSECURE_PRIVATE_KEY_1,
    process.env.INSECURE_PRIVATE_KEY_2,
    process.env.INSECURE_PRIVATE_KEY_3,
    process.env.INSECURE_PRIVATE_KEY_4,
    process.env.INSECURE_PRIVATE_KEY_5,
    process.env.INSECURE_PRIVATE_KEY_6
];