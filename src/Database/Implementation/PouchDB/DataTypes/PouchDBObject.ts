import PouchDB from "pouchdb";
import {Document} from "../../../DataTypes/Interfaces/Types";
import {CONTEXT_COMPARE, IContext} from "../../../Interfaces/Types";
import PouchDBImpl from "../PouchDB";
import ExistingDocument = PouchDB.Core.ExistingDocument;
import AllDocsMeta = PouchDB.Core.AllDocsMeta;

export default class PouchDBObject<T> implements Document<T> {
    public id: string;
    private newDocument?: ExistingDocument<T>;

    constructor(
        private document: ExistingDocument<T> & AllDocsMeta,
        private connection: PouchDBImpl,
        public conflicts: string[] = []) {
        this.id = document._id;
        this.conflicts = document._conflicts || this.conflicts;
    }

    /**
     * Commit the current modifications on the object
     */
    public save(): Promise<PouchDBObject<T>> {
        return this.connection.save(this);
    }

    /**
     * Checks if the object has local uncommitted changes
     */
    public isDirty() {
        return this.newDocument !== undefined && this.newDocument !== null;
    }

    // public originalValue(): T {
    //     return this.document;
    // }

    public current(): T {
        return this.newDocument ? this.newDocument : this.document;
    }

    public update(value: T): PouchDBObject<T> {
        this.updateNoSideEffects(value);
        if (this.connection.isAutoSave()) {
            this.save()
                .catch((error) => Promise.reject(error));
        }
        return this;
    }

    public updateNoSideEffects(value: T): PouchDBObject<T> {
        //  Caution: need to keep revision from fetched object
        this.newDocument = {
            ...value,
            _id: this.document._id,
            _rev: this.document._rev,
        };
        return this;
    }

    public compareVersion(other: IContext) {
        if (!(other instanceof PouchDBObject)) {
            return CONTEXT_COMPARE.NON_COMPARABLE;
        }
        const revision = this.document._rev;
        const otherRevision = other.document._rev;

        // if (!revision || !otherRevision) {
        //     return CONTEXT_COMPARE.CONCURRENT;
        // } else {
        if (revision === otherRevision) {
            if (this.newDocument || other.newDocument) {
                return CONTEXT_COMPARE.CONCURRENT;
            }
            return CONTEXT_COMPARE.EQUAL;
        }
        const res = revision.split("-")[0].localeCompare(otherRevision.split("-")[0]);
        if (res < 0) {
            return CONTEXT_COMPARE.LESS_THAN;
        } else if (res > 0) {
            return CONTEXT_COMPARE.GREATER_THAN;
        }
        return CONTEXT_COMPARE.CONCURRENT;
        // }
    }
}
