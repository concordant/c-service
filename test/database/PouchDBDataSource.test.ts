/**
 * MIT License
 *
 * Copyright (c) 2022, Concordant and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { crdtlib } from "@concordant/c-crdtlib";
import PouchDBDataSource, {
  PouchDBParams,
} from "../../src/database/PouchDBDataSource";
import { promiseDelay } from "../../src/utils";
import {
  couchdbUrl,
  couchdbUser,
  couchdbPassword,
  dbName,
} from "../testParams";

describe("Establish connection", () => {
  it("Init local in-memory database", (done) => {
    const params: PouchDBParams = {
      dbName,
    };
    const dataSource = new PouchDBDataSource(params, false);
    dataSource
      .isConnected()
      .then((result) => (result ? done() : fail()))
      .catch((error) => fail(error));
  });

  it("Init local CouchDB database", (done) => {
    const params: PouchDBParams = {
      url: couchdbUrl,
      username: couchdbUser,
      password: couchdbPassword,
      dbName,
    };
    const dataSource = new PouchDBDataSource(params, false);
    dataSource
      .isConnected()
      .then((result) => (result ? done() : fail()))
      .catch((error) => fail(error));
  });

  it("Fail to authenticate CouchDB", (done) => {
    const params: PouchDBParams = {
      url: couchdbUrl,
      dbName,
    };
    const dataSource = new PouchDBDataSource(params, false);
    dataSource
      .isConnected()
      .then(() => fail())
      .catch(() => done());
  });
});

describe("In-memory read and write", () => {
  const params: PouchDBParams = {
    dbName,
  };
  const dataSource = new PouchDBDataSource(params, false);
  const environment1 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.ClientUId("client1")
  );
  const environment2 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.ClientUId("client2")
  );

  it("Get inexisting object return empty object", (done) => {
    const objName = '{"name":"myobject1","type":"PNCounter"}';
    dataSource
      .isConnected()
      .then(() => dataSource.getObject(objName))
      .then((obj) => {
        const crdt = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
          obj.replace(/\\'/g, "'")
        );
        expect(crdt.get()).toBe(0);
        done();
      })
      .catch((error) => fail(error));
  });

  it("Create object then get it", (done) => {
    const objName = '{"name":"myobject2","type":"PNCounter"}';
    dataSource
      .isConnected()
      .then(() => {
        const crdt = crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
          "PNCounter",
          environment1
        );
        crdt.increment(10);
        dataSource.updateObject(objName, crdt.toJson());
      })
      .then(() => promiseDelay(200))
      .then(() => dataSource.getObject(objName))
      .then((obj) => {
        const crdt = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
          obj.replace(/\\'/g, "'")
        );
        expect(crdt.get()).toBe(10);
        done();
      })
      .catch((error) => fail(error));
  });

  it("Update object then get it", (done) => {
    const objName = '{"name":"myobject3","type":"PNCounter"}';
    dataSource
      .isConnected()
      .then(() => {
        const crdt = crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
          "PNCounter",
          environment1
        );
        crdt.increment(10);
        dataSource.updateObject(objName, crdt.toJson());
      })
      .then(() => {
        const crdt = crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
          "PNCounter",
          environment2
        );
        crdt.increment(11);
        dataSource.updateObject(objName, crdt.toJson());
      })
      .then(() => promiseDelay(200))
      .then(() => dataSource.getObject(objName))
      .then((obj) => {
        const crdt = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
          obj.replace(/\\'/g, "'")
        );
        expect(crdt.get()).toBe(21);
        done();
      })
      .catch((error) => fail(error));
  });
});

describe("CouchDB read and write", () => {
  const params: PouchDBParams = {
    url: couchdbUrl,
    username: couchdbUser,
    password: couchdbPassword,
    dbName,
  };
  const dataSource = new PouchDBDataSource(params, false);
  const environment1 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.ClientUId("client1")
  );
  const environment2 = new crdtlib.utils.SimpleEnvironment(
    new crdtlib.utils.ClientUId("client2")
  );

  it("Get inexisting object return empty object", (done) => {
    const objName = '{"name":"myobject1","type":"PNCounter"}';
    dataSource
      .isConnected()
      .then(() => dataSource.getObject(objName))
      .then((obj) => {
        const crdt = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
          obj.replace(/\\'/g, "'")
        );
        expect(crdt.get()).toBe(0);
        done();
      })
      .catch((error) => fail(error));
  });

  it("Create object then get it", (done) => {
    const objName = '{"name":"myobject2","type":"PNCounter"}';
    dataSource
      .isConnected()
      .then(() => {
        const crdt = crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
          "PNCounter",
          environment1
        );
        crdt.increment(10);
        dataSource.updateObject(objName, crdt.toJson());
      })
      .then(() => promiseDelay(200))
      .then(() => dataSource.getObject(objName))
      .then((obj) => {
        const crdt = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
          obj.replace(/\\'/g, "'")
        );
        expect(crdt.get()).toBe(10);
        done();
      })
      .catch((error) => fail(error));
  });

  it("Update object then get it", (done) => {
    const objName = '{"name":"myobject3","type":"PNCounter"}';
    dataSource
      .isConnected()
      .then(() => {
        const crdt = crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
          "PNCounter",
          environment1
        );
        crdt.increment(10);
        dataSource.updateObject(objName, crdt.toJson());
      })
      .then(() => {
        const crdt = crdtlib.crdt.DeltaCRDTFactory.Companion.createDeltaCRDT(
          "PNCounter",
          environment2
        );
        crdt.increment(11);
        dataSource.updateObject(objName, crdt.toJson());
      })
      .then(() => promiseDelay(200))
      .then(() => dataSource.getObject(objName))
      .then((obj) => {
        const crdt = crdtlib.crdt.DeltaCRDT.Companion.fromJson(
          obj.replace(/\\'/g, "'")
        );
        expect(crdt.get()).toBe(21);
        done();
      })
      .catch((error) => fail(error));
  });
});

describe("Subscription", () => {
  const params: PouchDBParams = {
    url: couchdbUrl,
    username: couchdbUser,
    password: couchdbPassword,
    dbName,
  };
  const dataSource = new PouchDBDataSource(params, false);

  it("Subscribe/Unsubscribe", (done) => {
    dataSource
      .subscribe("mycollection", "myid")
      .then(() => {
        const set = new Set();
        set.add("myid");
        expect(dataSource.getSubscribers("mycollection")).toMatchObject(set);
      })
      .then(() => dataSource.unsubscribe("mycollection", "myid"))
      .then(() => {
        expect(dataSource.getSubscribers("mycollection")).toMatchObject(
          new Set()
        );
        done();
      });
  });
});
