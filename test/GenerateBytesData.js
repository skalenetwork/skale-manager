function generateBytesForNode(port, ip, account, name) {
    let bytes = "0x01";
    let portHex = port.toString(16);
    while (portHex.length < 4) {
        portHex = "0" + portHex;
    }
    //console.log(portHex);
    let ips = new Array(4);
    let index = 0;
    let num = 0;
    for (let i = 0; i < ip.length; i++) {
        if (ip[i] == '.') {
            ips[index] = num.toString(16);
            index++;
            num = 0;
            if (ips[index - 1].length == 1) {
                ips[index - 1] = "0" + ips[index - 1];
            }
        } else {
            num = num * 10 + ip.charCodeAt(i) - 48;
        }
    }
    ips[index] = num.toString(16);
    if (ips[index].length == 1) {
        ips[index] = "0" + ips[index];
    }
    //console.log(account);
	if (!account || !account.length) {return;}
    let acc = '';
    if (account) {
        for (let i = 0; i < 128; i++) {
            acc += account[i % 40 + 2];
        }
    }
    //console.log(acc);
    let nonce = Math.floor(Math.random() * 65536);
    let nonceHex = nonce.toString(16);
    while (nonceHex.length < 4) {
        nonceHex = "0" + nonceHex;
    }
    //console.log(nonceHex);
    //console.log(bytes + portHex + nonceHex + ips[0] + ips[1] + ips[2] + ips[3] + acc);
    //console.log(acc.length);
    return bytes + portHex + nonceHex + ips[0] + ips[1] + ips[2] + ips[3] + ips[0] + ips[1] + ips[2] + ips[3] + acc + Buffer.from(name, 'utf8').toString('hex');
}
//0x 01 2161 935b 2c7e18d8 2c7e18d8 d1bc96aad4ab81ba84c18e115664eaab3e7f842cd1bc96aad4ab81ba84c18e11 5664eaab3e7f842cd1bc96aad4ab81ba84c18e115664eaab3e7f842cd1bc96aa 4e6f6465 39333338

function generateBytesForSchain(lifetime, typeOfSchain, name) {
	let bytes = "0x10";
	let lifetimeHex = lifetime.toString(16);
	while (lifetimeHex.length < 64) {
		lifetimeHex = "0" + lifetimeHex;
	}
	let typeOfSchainHex = typeOfSchain.toString(16);
	if (typeOfSchainHex.length < 2) {
		typeOfSchainHex = "0" + typeOfSchainHex;
	}
	let nonce = Math.floor(Math.random() * 65536);
	let nonceHex = nonce.toString(16);
	while (nonceHex.length < 4) {
		nonceHex = "0" + nonceHex;
	}
	let data = bytes + lifetimeHex + typeOfSchainHex + nonceHex + Buffer.from(name, 'utf8').toString('hex');
	//console.log(bytes, bytes.length);
	//console.log(lifetimeHex, lifetimeHex.length);
    //console.log(nonceHex, nonceHex.length);
	//console.log(typeOfSchainHex, typeOfSchainHex.length)
	//console.log(data.length);
	return data;
}

module.exports.generateBytesForNode = generateBytesForNode;
module.exports.generateBytesForSchain = generateBytesForSchain;
