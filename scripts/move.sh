#!/bin/bash

cd test

all=(*.ts delegation/*.ts utils/*.ts)
group1=(
   SkaleManager.ts 
)
group2=(
    Schains.ts
    Monitors.ts
    SchainsInternal.ts
    ECDH.ts
    Decryption.ts
    ContractManager.ts
)
group3=()
group4=(
    SkaleDKG.ts
    SkaleDkgFakeComplaint.ts
)
for file in "${all[@]}"
do
    listed=false
    for listedFile in "${group1[@]}" "${group2[@]}" "${group4[@]}"
    do
        if [[ $file == $listedFile ]]
        then
            listed=true
            break
        fi
    done
    if [ $listed = false ]
    then
        group3+=( $file )
    fi
done

removingFiles=()
if [ "$TESTFOLDERS" = 1 ]
then
    removingFiles+=(${group2[@]})
    removingFiles+=(${group3[@]})
    removingFiles+=(${group4[@]})
elif [ "$TESTFOLDERS" = 2 ]
then
    removingFiles+=(${group1[@]})
    removingFiles+=(${group3[@]})
    removingFiles+=(${group4[@]})
elif [ "$TESTFOLDERS" = 3 ]
then
    removingFiles+=(${group1[@]})
    removingFiles+=(${group2[@]})
    removingFiles+=(${group4[@]})
elif [ "$TESTFOLDERS" = 4 ]
then
    removingFiles+=(${group1[@]})
    removingFiles+=(${group2[@]})
    removingFiles+=(${group3[@]})
else
    echo "Testing group is not set"
    exit 1
fi

for file in "${removingFiles[@]}"
do
    echo "Remove $file"
    rm $file
done
