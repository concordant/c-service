# C-Service

[![License](https://img.shields.io/badge/license-MIT-green)](https://opensource.org/licenses/MIT)
[![pipeline status](https://gitlab.inria.fr/concordant/software/c-service/badges/master/pipeline.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)
[![coverage report](https://gitlab.inria.fr/concordant/software/c-service/badges/master/coverage.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)

The first version of C-Service API.

See also the [wiki](https://gitlab.inria.fr/concordant/software/c-service/-/wikis/)
for documentation.

## Getting started

### Requirements

For the next steps, you will need the following software:

- Make sure you have the latest stable version of [Node.js](https://nodejs.org/en/download/);
- C-Service runs on top of [CouchDB](https://docs.couchdb.org/en/stable/install/index.html)

In addition, you will need to enable CORS in CouchDB.
You can use the [dedicated NPM package from PouchDB](https://github.com/pouchdb/add-cors-to-couchdb):

```shell
npx add-cors-to-couchdb [http://mycouchDBserver.org] \
    [-u myusername] [-p mypassword]
(server defaults to localhost)
```

or the [CouchDB user panel](http://127.0.0.1:5984/_utils/).

### Install Project dependencies and build

The C-Service depends on the C-CRDTlib,
which is delivered as an NPM package in a private [Gitlab Packages registry](https://gitlab.inria.fr/concordant/software/c-crdtlib/-/packages).

Before running the installer, please make sure that NPM is set up
as described in the [c-crdtlib guide](https://gitlab.inria.fr/concordant/software/c-crdtlib).

Go to project root directory and run:

```bash
npm install
```

### Start C-Service

Ensure CouchDB is running before starting C-Service.
If it is running on another host, set the `COUCHDB_URL` accordingly.
You will also need to provide CouchDB credentials:

```bash
export COUCHDB_URL=my-couchdb-server.org
export COUCHDB_USER=my-user COUCHDB_PASSWORD=my-passwd
```

Then run the service (using dev server):

```bash
npm start
```

This launches an Express server listening on TCP port 4000.

You can also run tests using:

```bash
export DBNAME=my-test-dbname
npm test
```

### Test C-Service using curl

The C-Service exposes a REST API on `/api`,
whose description can be found in file `swagger.yml`.

Once your C-Service is running you can query its REST API with curl.
You can view your changes in the [CouchDB user pannel](http://127.0.0.1:5984/_utils/).

Create the `myapp` database:

```bash
curl --request POST                               \
     --header "Content-Type: application/json"    \
     --data '{"appName":"myapp"}'                 \
     http://127.0.0.1:4000/api/create-app
```

Insert/update a PNCounter named `myobject` in `myapp` database:

```bash
curl --request POST                               \
     --header "Content-Type: application/json"    \
     --data '{"appName":"myapp","id":"{\"name\":\"myobject\",\"type\":\"PNCounter\"}","document":"{\"type\":\"PNCounter\",\"metadata\":{\"increment\":[{\"name\":\"clientid\"},{\"first\":60,\"second\":{\"uid\":{\"name\":\"clientid\"},\"cnt\":-21474836}}],\"decrement\":[]},\"value\":60}"}'  \
     http://127.0.0.1:4000/api/update-object
```

Get the PNCounter named `myobject` in `myapp` database:

```bash
curl --request POST                               \
     --header "Content-Type: application/json"    \
     --data '{"appName":"myapp","id":"{\"name\":\"myobject\",\"type\":\"PNCounter\"}"}'                       \
     http://127.0.0.1:4000/api/get-object
```

Get all objects of `myapp` database:

```bash
curl --request POST                               \
     --header "Content-Type: application/json"    \
     --data '{"appName":"myapp"}'                 \
     http://127.0.0.1:4000/api/get-objects
```

Delete `myapp` database:

```bash
curl --request POST                               \
     --header "Content-Type: application/json"    \
     --data '{"appName":"myapp"}'                 \
     http://127.0.0.1:4000/api/delete-app
```
