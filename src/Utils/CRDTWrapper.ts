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
