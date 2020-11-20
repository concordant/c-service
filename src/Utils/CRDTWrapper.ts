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
import { crdtlib } from "c-crdtlib";

export default class CRDTWrapper<T> {
  public static wrap<T>(crdt: any): CRDTWrapper<T> {
    return new CRDTWrapper(crdt.toJson());
  }

  public static unwrap<T>(wrapper: CRDTWrapper<T>): any {
    const crdtType = JSON.parse(wrapper.crdtJson)["_type"];
    switch (crdtType) {
      case "PNCounter":
        return crdtlib.crdt.PNCounter.Companion.fromJson(wrapper.crdtJson);
      case "MVRegister":
        return crdtlib.crdt.MVRegister.Companion.fromJson(wrapper.crdtJson);
      case "LWWRegister":
        return crdtlib.crdt.LWWRegister.Companion.fromJson(wrapper.crdtJson);
      case "Ratchet":
        return crdtlib.crdt.Ratchet.Companion.fromJson(wrapper.crdtJson);
      case "RGA":
        return crdtlib.crdt.RGA.Companion.fromJson(wrapper.crdtJson);
      case "LWWMap":
        return crdtlib.crdt.LWWMap.Companion.fromJson(wrapper.crdtJson);
      case "MVMap":
        return crdtlib.crdt.MVMap.Companion.fromJson(wrapper.crdtJson);
      case "Map":
        return crdtlib.crdt.Map.Companion.fromJson(wrapper.crdtJson);
      default:
        break;
    }
    throw new Error("Unknown CRDT type");
  }

  constructor(public crdtJson: string) {
    this.crdtJson = crdtJson;
  }
}
