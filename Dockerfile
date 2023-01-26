FROM node:16.18-slim
WORKDIR /home/node/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
COPY [".env", "./"]
RUN npm install
COPY . .

ENV NODE_PATH=/.build
CMD [ "npm", "run", "start" ]

EXPOSE 4000
