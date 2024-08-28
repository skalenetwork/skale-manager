/* eslint-env node */

// cspell:words venv

module.exports = {
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "ignorePatterns": [
        "coverage/**",
        "typechain-types/**",
        "venv/**"
    ],
    "env": {
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "plugins": ["@typescript-eslint"],
    "root": true,
    "rules": {
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-unused-vars": "error",
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
