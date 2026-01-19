module.exports = {
    skipFiles: ['thirdparty/', 'interfaces/', 'test/'],
    configureYulOptimizer: true,
    // 2. Explicitly enable all standard optimization steps
    solcOptimizerDetails: {
        yul: true,
        // Reduces slightly coverage time - not enough to justify losing coverage detail
        //inliner: true,

        // Common Subexpression Elimination (reduces coverage time by ~50% on heavy math calculations)
        cse: true,  //
    },
};
