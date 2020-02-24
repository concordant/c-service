# concordant-server
Server code for the Collab2 demo.

Intall dependencies with:
```bash
npm install
```

Ru server with:
```bash
DBNAME="input db name here" npm start
```
Need to start a CouchDB server beforehand. Can customize the database url with the environment variable COUCHDB_URL. You might need to change the binding address in CouchDB admin panel to allow peers to connect to the database.

 Ru tests with:
 ```bash
npm test
```
Check permissions of setup.sh and teardown.sh scripts.

# Requirements
Node: v10.15+
NPM: v6.13+

(Project might work with older Node and NPM versions)
