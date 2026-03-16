# cspell:words .yarnrc.yml

FROM node:24-slim

WORKDIR /usr/src/manager

RUN apt-get update && \
    apt-get install --no-install-recommends -y git build-essential python3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY .yarn/releases ./.yarn/releases
COPY package.json yarn.lock hardhat.config.ts tsconfig.json .yarnrc.yml ./

RUN yarn install --immutable

ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY . .

RUN yarn compile
