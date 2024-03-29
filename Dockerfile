FROM node:16.18-slim
WORKDIR /home/node/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

RUN npm install
COPY . .

ENV NODE_PATH=/.build
