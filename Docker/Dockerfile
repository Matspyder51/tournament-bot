ARG NODE_VERSION=14
ARG TYPESCRIPT_VERSION=4.1.2

FROM node:${NODE_VERSION}-slim

RUN mkdir -p /app
WORKDIR /app

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock

RUN yarn add -dev typescript@${TYPESCRIPT_VERSION}
RUN yarn install

COPY ./src ./src

RUN yarn build
CMD yarn start