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

/**
 * A database adapter between Concordant service API and database specific API.
 */
export default interface DataSource {
  /**
   * Is connection still active.
   * Return a promise to a boolean.
   * Reject promise if impossible to contact database.
   */
  isConnected(): Promise<boolean>;

  /**
   * Get a given object from the database.
   * @param docName unique identifier of the targeted document.
   * Return a promise to a string object.
   * Reject promise if impossible to get object.
   */
  getObject(docName: string): Promise<string>;

  /**
   * Get all objects from the database.
   * Return promise a promise to an array of string objects.
   * Reject promise if impossible to get objects.
   */
  getObjects(): Promise<Promise<string>[]>;

  /**
   * Update a given object with the given [value].
   * @param docName unique identifier of the targeted object.
   * @param document value to be put in the database.
   * Return a promise to the new stored value.
   * Reject promise if impossible to update object.
   */
  updateObject(docName: string, document: string): Promise<string>;

  /**
   * Close the database.
   * Return an empty promise.
   * Reject promise if impossible to close the database.
   */
  close(): Promise<void>;
}