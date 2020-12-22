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

import IDB from "./IDB";

export default interface IOfflineSupport extends IDB {
  /**
   * Disconnects from the remote database
   * User can still read and modify objects that were cached locally
   *
   * @param waitFlush - try and wait for flushing outstanding changes
   * Reject promise if impossible to connect or operations were rejected
   */
  goOffline(waitFlush?: boolean): Promise<void>;

  /**
   * Tries to reestablish a connection with the remote database
   *
   * @param waitFlush - waits for changes flush to server
   * Reject promise if impossible to connect or operations were rejected
   */
  goOnline(waitFlush?: boolean): Promise<void>;

  isOnline(): boolean;
}
