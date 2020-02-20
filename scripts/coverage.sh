# for file in test/$TESTFOLDERS/*
# do
# file=${file:7}
# if [ ! -f "test/$file" ]; then
#     file="delegation/$file"
# fi
# npx buidler coverage --testfiles test/$file --solcoverjs .solcover.js
# bash <(curl -s https://codecov.io/bash) -cF solidity
# done
str='101.1'
echo ${str: -2}
