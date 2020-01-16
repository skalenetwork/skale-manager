FROM node:10.16

RUN mkdir /usr/src/manager
WORKDIR /usr/src/manager

RUN apt-get update && apt-get install build-essential

COPY package.json ./
COPY truffle-config.js ./
COPY yarn.lock ./
RUN yarn install

COPY . .
