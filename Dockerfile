FROM node:latest

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

RUN npm run build

ENV DBNAME "testdb"
ENV COUCHDB_URL "http://localhost:5984/"

CMD [ "npm", "start" ]
