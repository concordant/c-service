/**
 * MIT License
 *
 * Copyright (c) 2020, Concordant and contributors
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
import CRDT from "delta-crdts";
import CRDTCodec from "delta-crdts-msgpack-codec";

describe("Basic usage", () => {
  it("Conflict resolution test", () => {
    const type = "rga";
    const Type = CRDT(type);

    // create 2 replicas
    const replicas = [Type("id1"), Type("id2")];

    // create concurrent deltas
    const deltas: any = [[], []];

    replicas[0].push("a");
    replicas[0].push("b");

    replicas[1].push("c");
    replicas[1].push("d");

    const joinTwo = replicas[0].join(replicas[0].state(), replicas[1].state());
    replicas[0].apply(joinTwo);
    replicas[1].apply(joinTwo);
    expect(replicas[0].value()).toEqual(replicas[1].value());
  });

  it("ORMap of ORMaps of registers", () => {
    const ORMap = CRDT("ormap");
    const MVreg = CRDT("mvreg");
    const rs = ORMap("rows");
    const reg = MVreg("reg");
    reg.write("A");

    rs.applySub("r1", "ormap", "applySub", "A", "mvreg", "write", "A");
    const delta = rs.state();
    const otherReplica = ORMap("other");
    otherReplica.apply(CRDTCodec.decode(CRDTCodec.encode(delta)));
    expect(rs.value()).toEqual(otherReplica.value());
  });
});
