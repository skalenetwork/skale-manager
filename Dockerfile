FROM node:22-slim

WORKDIR /usr/src/manager

RUN apt-get update && \
    apt-get install --no-install-recommends -y git build-essential python3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock hardhat.config.ts tsconfig.json ./
RUN yarn install --frozen-lockfile

ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY . .

RUN npx hardhat compile
