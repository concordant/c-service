# C-Service

[![License](https://img.shields.io/badge/license-MIT-green)](https://opensource.org/licenses/MIT)
[![pipeline status](https://gitlab.inria.fr/concordant/software/c-service/badges/master/pipeline.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)
[![coverage report](https://gitlab.inria.fr/concordant/software/c-service/badges/master/coverage.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)

The first version of C-Service: a distributed database service
for CRDTs of the [C-CRDTlib](https://github.com/concordant/c-crdtlib).

The C-Service is meant to run on edge devices (terminal or PoP)
and (will) support transactions and replication between services.

It runs as a ServiceWorker in web browsers,
using PouchDB to synchronize with a remote CouchDB server.
It can also be launched as a standalone application, typically server-side,
to be used by browsers that do not support Service Workers.

The C-Service exposes a REST API which should not be accessed directly,
as it may not be stable; use the [c-client library](https://gitlab.inria.fr/concordant/software/c-client/) instead.

The main repository is in [the Inria gitlab](https://gitlab.inria.fr/concordant/software/c-service/) (this is where you can post tickets. There is an identical clone in [GitHub](https://github.com/concordant/c-service) (tickets here might be ignored).

## Getting started

### Requirements

For the next steps, you will need the following software:

- Make sure you have the latest stable version of [Node.js](https://nodejs.org/en/download/);
- C-Service synchronizes with a
  [CouchDB](https://docs.couchdb.org/en/stable/install/index.html) backend.
  Once installed,
  use the [CouchDB user panel (Fauxton)](http://127.0.0.1:5984/_utils/)
  to setup a database and a user.

In addition, you will need to enable CORS in CouchDB, using Fauxton
or the [dedicated NPM package from PouchDB](https://github.com/pouchdb/add-cors-to-couchdb):

```shell
npx add-cors-to-couchdb [http://mycouchDBserver.org] \
    [-u myusername] [-p mypassword]
(server defaults to localhost)
```

### Use the C-Service as a Service Worker

A Service Worker implementation is bundled with the C-Service package,
in `dist/c-service-worker.js`.

To use it, just copy (or link) it to an appropriate location
and register it as a ServiceWorker in your application.
For more information, see our example applications.

This Service Worker is configured to use our demo database,
so feel free to re-build it to use your own:
adjust the configuration in `src/config.json` and run

```shell
npm install
```

In a future release,
the C-Client will be able to provide these settings at runtime.

### Start C-Service standalone

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

This launches an Express server listening on TCP port 4000 and a WebSocket server on port 8999.

## Setup C-Service as a Systemd service

First ensure CouchDB is setup as a systemd service named `couchdb.service`
(or adapt the name in `c-service.service` file).

Put the c-service folder in `/opt/` or adapt the `c-service.service` file.

Put the provided file `c-service.service` in `/etc/systemd/system/`.

Create the file `/etc/systemd/system/c-service.conf`
containing CouchDB user credentials:

```shell
COUCHDB_USER=<couchdb_id>
COUCHDB_PASSWORD=<couchdb_password>
```

Then start the service:

```shell
systemctl start c-service
```

## Test C-Service using curl

The standalone C-Service exposes a REST API on `/api`,
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
