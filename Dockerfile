FROM node:18

RUN mkdir /usr/src/manager
WORKDIR /usr/src/manager

RUN apt-get update && apt-get install build-essential

COPY package.json ./
COPY hardhat.config.ts ./
COPY yarn.lock ./
RUN yarn install

ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY . .
