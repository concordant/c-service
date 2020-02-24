FROM node:latest

WORKDIR /usr/src/app

RUN     apt-get update; \
        apt-get -y install libavahi-compat-libdnssd-dev
COPY package.json ./
RUN npm install
COPY . .

RUN npm run build

ENV DBNAME "testdb"
ENV COUCHDB_URL "http://localhost:5984/"

CMD [ "npm", "start" ]