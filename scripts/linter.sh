if [ ${TRAVIS_JOB_NUMBER: -2} = '.1' ]; then
pip3 install -r scripts/requirements.txt
yarn lint || travis_terminate 1
slither --version
slither . || true
yarn slither || travis_terminate 5
yarn tslint || travis_terminate 2
fi