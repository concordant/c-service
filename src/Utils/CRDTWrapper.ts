// @ts-ignore
import CRDT from "delta-crdts";
// @ts-ignore
import CRDTCodec from "delta-crdts-msgpack-codec";

export default class CRDTWrapper<T> {
    public static wrap(object: CRDT, type: string) {
        return new CRDTWrapper(CRDTCodec.encode(object.state()), type);
    }

    // TODO: Need to improve this. Some browsers and Node handle buffers differently. this solution works, but is inefficient.
    public static unwrap<T>(object: CRDTWrapper<T>, clientId: string): CRDT<T> {
        const unwrapped = CRDT(object.type)(clientId);
        unwrapped.apply(CRDTCodec.decode(Buffer.from(Object.values(object.buffer))));
        return {unwrapped, type: object.type};
    }

    public static defaultWrappedCRDTFor<T>(crdtName: string, clientId: string): CRDTWrapper<T> {
        return CRDTWrapper.wrap(CRDT(crdtName)(clientId), crdtName);
    }

    constructor(public buffer: Buffer, public type: string) {
        this.buffer = buffer;
    }
}
