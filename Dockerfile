FROM node:10.16

RUN mkdir /usr/src/manager
WORKDIR /usr/src/manager

RUN apt-get update && apt-get install build-essential

ENV PRIVATE_KEY_1="0x0"
ENV PRIVATE_KEY_2="0x0"
ENV PRIVATE_KEY_3="0x0"
ENV PRIVATE_KEY_4="0x0"
ENV PRIVATE_KEY_5="0x0"
ENV PRIVATE_KEY_6="0x0"

COPY package.json ./
COPY hardhat.config.ts ./
COPY yarn.lock ./
RUN yarn install

ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY . .
