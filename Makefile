all: start

DBNAME = "c-notepad"
COUCHDB_URL = "http://localhost:5984/"
COUCHDB_USER = "admin"
COUCHDB_PASSWORD = "crdtsrulez"

npm-install: 
	npm install

npm-start: npm-install
	DBNAME=$(DBNAME) npm start

ilyas-start: npm-install
	DBNAME=$(DBNAME) COUCHDB_URL=$(COUCHDB_URL) COUCHDB_USER=$(COUCHDB_USER) COUCHDB_PASSWORD=$(COUCHDB_PASSWORD) npm start