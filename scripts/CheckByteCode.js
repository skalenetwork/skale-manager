var fs = require('fs') ;

async function main() {
    const LIMIT = 24*1024 ;

    function sizes (name) {
        var abi = artifacts.require(name) ;
        var deployedSize = (abi.deployedBytecode.length / 2) - 1 ;
        return {name, deployedSize} ;
    }

    function fmt(obj) {
        return `${ obj.deployedSize }\t${ obj.name }\t\t(${ Math.abs(obj.deployedSize - LIMIT)} `
            + (obj.deployedBytecode > LIMIT ? "more" : "less") + " than limit)";
    }

    var l = fs.readdirSync("../build/contracts") ;
    l.forEach(function (f) {
        var name = f.replace(/.json/, '') ;
        var sz = sizes(name) ;
        if (sz.deployedSize >= LIMIT) {
            console.log(fmt(sz)) ;
        }
    });
    l.map(f => sizes(f.replace(/.json/, '')))
        .filter(contract => contract.deployedSize > 0)
        .sort((a, b) => b.deployedSize - a.deployedSize)
        .forEach(contract => console.log(fmt(contract)));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });