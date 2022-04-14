import { WzFile } from '../WzFile';

export enum WzDataType {
    NULL = 'NULL',
    IMG = 'IMG',
    SHORT = 'SHORT',
    INTEGER = 'INTEGER',
    FLOAT = 'FLOAT',
    DOUBLE = 'DOUBLE',
    LONG = 'LONG',
    STRING = 'STRING',
    DIRECTORY = 'DIRECTORY',
    PROPERTY = 'PROPERTY',
    CANVAS = 'CANVAS',
    VECTOR = 'VECTOR',
    CONVEX = 'CONVEX',
    SOUND = 'SOUND',
    UOL = 'UOL'
}

export type WzNull = WzData<void>;
export type WzInt = WzData<number>;
export type WzLong = WzData<bigint>;
export type WzUOL = WzData<string>;
export type WzString = WzData<string>;
export type WzFloat = WzData<number>;
export type WzDouble = WzData<number>;
export type WzShort = WzData<number>;

export type WzVector = WzData<WzVectorData>;
export type WzVectorData = {
    x: number;
    y: number;
}

export class WzData<V> {

    private static EMPTY_MAP = new Map();


    private _type: WzDataType;
    private _parent: WzData<unknown>;
    private _label: string;
    private _value: V;

    public constructor(type: WzDataType, label: string, value?: V) {
        this._type = type;
        this._label = label;
        this._value = value;
    }

    public get type() { return this._type; }
    public set type(type) { this._type = type; }

    public get parent() { return this._parent; }
    public set parent(parent) { this._parent = parent; }

    public get label() { return this._label; }
    public set label(label) { this._label = label; }

    public get value() {
        if (this.type == WzDataType.UOL) {
            return this.parent.get(this._value as unknown as string).value;
        }
        return this._value;
    }
    public set value(value) { this._value = value; }

    public get file(): WzFile { return this.parent.file; }

    public get fullPath(): string {
        if (this.parent != null) {
            return `${this.parent.fullPath}/${this.label}`;
        } else {
            return this.label;
        }
    }

    public children(): ReadonlyMap<string, WzData<unknown>> {
        return WzData.EMPTY_MAP;
    }

    public get<T extends WzData<unknown>>(path: string): T {
        if (!path) return (this as unknown) as T;

        const i = path.indexOf('/');
        const [pathL, pathR] = i < 0 ?
            [path, null] :
            [path.substring(0, i), path.substring(i + 1)];

        let left: WzData<unknown> = null;
        switch (pathL) {
            case '.':
                left = this;
                break;
            case '..':
                left = this.parent;
                break;
            default:
                left = this.children().get(pathL);
        }

        if (left == null) {
            return null;
        }
        return left.get(pathR);
    }

    public toJSON(): any {
        return {
            'label': this._label,
            'type': this._type,
            'value': this._value,
            'fullPath': this.fullPath,
        };
    }
}