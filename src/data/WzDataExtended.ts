/* eslint-disable no-case-declarations */
import { WzFile } from '../WzFile';
import { WzData, WzDataType } from './WzData';
import { WzImg } from './WzImg';

export abstract class WzDataExtended<V> extends WzData<V> {

    protected _children: Map<string, WzData<unknown>>;

    private _dataStart: number;
    private _read: boolean;

    protected constructor(type: WzDataType, label: string, dataStart: number) {
        super(type, label);
        this._dataStart = dataStart;
        this._children = new Map();
    }

    protected abstract parse(reader: WzFile): WzData<V>;

    public override get value(): V {
        this.parseNode();
        return super.value;
    }
    public override set value(value: V) { super.value = value; }

    public get dataStart(): number { return this._dataStart; }
    public set dataStart(dataStart: number) { this._dataStart = dataStart; }

    private get read(): boolean { return this._read; }
    private set read(read: boolean) { this._read = read; }

    protected parseNode(): void {
        if (this.read) return;

        this.parse(this.file.seek(this.dataStart));
        this.read = true;
    }

    protected parseChildren(reader: WzFile): void {
        const img = this.getImg();
        const imgOffset = img.dataStart;
        const entryCount = reader.readCompressedInt();
        for (let i = 0; i < entryCount; i++) {
            const label = reader.readStringBlock(imgOffset);
            const type = reader.readByte();
            let child: WzData<unknown>;
            switch (type) {
                case 0:
                    child = new WzData(WzDataType.INTEGER, label);
                    break;
                case 2:
                case 11:
                    child = new WzData(WzDataType.SHORT, label, reader.readShort());
                    break;
                case 3:
                case 19:
                    child = new WzData(WzDataType.INTEGER, label, reader.readCompressedInt());
                    break;
                case 4:
                    child = new WzData(WzDataType.FLOAT, label, reader.readCompressedFloat());
                    break;
                case 20:
                    child = new WzData(WzDataType.LONG, label, reader.readLong());
                    break;
                case 5:
                    child = new WzData(WzDataType.DOUBLE, label, reader.readDouble());
                    break;
                case 8:
                    child = new WzData(WzDataType.STRING, label, reader.readStringBlock(imgOffset));
                    break;
                case 9:  // extended
                    const currentFP = reader.filePointer;
                    const blockSize = reader.readInt() + 4; //Integer.BYTES;
                    const extendedChild = reader.readExtendedWzData(img, label);
                    reader.seek(currentFP + blockSize);
                    child = extendedChild;
                    break;
                default:
                    throw new Error(`Unknown property type at ${this}: ${type} - ${label}`);
            }
            this.addChild(child);
        }
    }

    protected addChild(newChild: WzData<unknown>): void {
        const oldChild = this._children.get(newChild.label);
        if (oldChild) {
            oldChild.parent = null;
        }

        newChild.parent = this;
        this._children.set(newChild.label, newChild);
    }

    private getImg(): WzImg {
        let node = this as WzData<unknown>;
        do {
            if (node.type == WzDataType.IMG) {
                return node as WzImg;
            }
            node = node.parent;
        } while (node != null);
        return null;
    }

    public override children(): ReadonlyMap<string, WzData<unknown>> {
        this.parseNode();
        return this._children;
    }

    // FEATURE provide `depth` for childern?
    public override toJSON(): unknown {
        const m = {};
        // if (this.fullPath.split('/').length <= 2) {
        this.children().forEach((value, key) => {
            if (!(value instanceof WzDataExtended)) {
                m[key] = value.toJSON();
            } else {
                m[key] = '...'
            }
        });
        // }

        return {
            ...super.toJSON(),
            'children': m
        }
    }
}