# C-Service

[![License](https://img.shields.io/badge/license-MIT-green)](https://opensource.org/licenses/MIT)
[![pipeline status](https://gitlab.inria.fr/concordant/software/c-service/badges/master/pipeline.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)
[![coverage report](https://gitlab.inria.fr/concordant/software/c-service/badges/master/coverage.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)

The first version of C-Service: a distributed database service
for CRDTs of the [C-CRDTlib](https://github.com/concordant/c-crdtlib).

The C-Service is meant to run on edge devices (terminal or PoP)
and (will) support transactions and replication between services.
It (will) run as a ServiceWorker in web browsers
or as a standalone application.

The C-Service exposes a REST API which should not be accessed directly,
as it may not be stable; use the [C-Client library](https://github.com/concordant/c-client) instead.

## Getting started

### Requirements

For the next steps, you will need the following software:

- Make sure you have the latest stable version of [Node.js](https://nodejs.org/en/download/);
- C-Service runs on top of [CouchDB](https://docs.couchdb.org/en/stable/install/index.html).

In addition, you will need to enable CORS in CouchDB.
You can use the [dedicated NPM package from PouchDB](https://github.com/pouchdb/add-cors-to-couchdb):

```shell
npx add-cors-to-couchdb [http://mycouchDBserver.org] \
    [-u myusername] [-p mypassword]
(server defaults to localhost)
```

or the [CouchDB user panel](http://127.0.0.1:5984/_utils/).

### Start C-Service

Ensure CouchDB is running before starting C-Service.
If it is running on another host, set the `COUCHDB_URL` accordingly.
You will also need to provide CouchDB credentials:

```bash
export COUCHDB_URL=my-couchdb-server.org
export COUCHDB_USER=my-user COUCHDB_PASSWORD=my-passwd
```

Then run the service:

```bash
npx @concordant/c-service
```

This launches an Express server listening on TCP port 4000.

## Setup C-Service as a Systemd service

First ensure CouchDB is setup as a systemd service named `couchdb.service`
(or adapt the name in `c-service.service` file).

Put the c-service folder in `/opt/` or adapt the `c-service.service` file.

Put the provided file `c-service.service` in `/etc/systemd/system/`.

Create the file `/etc/systemd/system/c-service.conf`
containing CouchDB admin credentials:

```shell
COUCHDB_USER=<couchdb_id>
COUCHDB_PASSWORD=<couchdb_password>
```

Then start the service:

```shell
systemctl start c-service
```

## Test C-Service using curl

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
