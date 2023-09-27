/* eslint-env node */
module.exports = {
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "ignorePatterns": [
        "coverage/**",
        "typechain-types/**"
    ],
    "env": {
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "plugins": ["@typescript-eslint"],
    "root": true,
    "rules": {
        "@typescript-eslint/no-shadow": "error",
        "lines-around-comment": [
            "error",
            {"allowBlockStart": true}
        ],
        "no-console": "off",
        // Replaced with @typescript-eslint/no-shadow
        "no-shadow": "off",
        "no-warning-comments": "warn",
        "object-curly-spacing": "error",
        "one-var": [
            "error",
            "never"
        ],
        "padded-blocks": [
            "error",
            "never"
        ]
    }
};
