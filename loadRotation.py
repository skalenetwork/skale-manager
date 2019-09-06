import json
import random
import time
from web3 import Web3


def calculate_probability():
	price = c.price().call()
	standard = 5*10**6
	p = (standard / price) * 50
	return p

web3 = Web3(Web3.HTTPProvider("http://localhost:8545"))
web3.eth.defaultAccount = web3.eth.accounts[0]

print(web3.net.version)
with open('/home/vadim/code/skale-manager/build/contracts/NodesData.json') as f:
	abi = json.load(f)
	
contract = web3.eth.contract(address=abi['networks'][f'{web3.net.version}']['address'], abi=abi['abi'])
c = contract.functions
tx_hash = c.addNode(web3.eth.accounts[1], "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455").transact()
web3.eth.waitForTransactionReceipt(tx_hash)
print(f'Working nodes: {c.getNumberOfNodes().call()}')



# actions = [c.addNode, c.removeNode, c.addWorkingNode, c.removeWorkingNode]
# ri = random.randint
# last_updated = time.time()
# p = 50.0
# while True:
# 	try:
# 		p = calculate_probability()
# 		if ri(0,1):
# 			rndm = ri(1,100)
# 			action = actions[1] if rndm < p else actions[0]
# 			tx_hash = action(1).transact()
# 			if rndm < p:
# 				act = 'removenode\t+'
# 			else:
# 				act = 'addnode\t\t-'
# 		else:
# 			rndm = ri(1,100)
# 			action = actions[2] if rndm < p else actions[3]
# 			tx_hash = action(1).transact()
# 			if rndm < p:
# 				act = 'addworking\t+'
# 			else:
# 				act = 'removeworking\t-'
# 	except Exception as e:
# 		# print(str(e))
# 		continue
# 	web3.eth.waitForTransactionReceipt(tx_hash)

# 	print(f'{c.price().call()};{p}\t{act}')
# 	with open("test.csv", "a") as f: 
# 		f.write(f'{c.price().call()};{p};{c.workingNodes().call()};{c.totalNodes().call()}\n')
# 	# time.sleep(1)
# 	# if last_updated + 1 < time.time():
# 	# 	print(c.price().call(), int(p), c.workingNodes().call(), c.totalNodes().call())
# 	# 	last_updated = time.time()
	

# # addnode price -
# # removenode price +
# # addworking price +
# # removeworking price -