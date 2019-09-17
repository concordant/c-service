// @ts-ignore
import CRDT from "delta-crdts";
// @ts-ignore
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
