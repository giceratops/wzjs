import path from 'path';
import { WzCanvas } from "./data/WzCanvas";
import { WzConvex } from './data/WzConvex';
import { WzData, WzDataType, WzVectorData } from "./data/WzData";
import { WzDirectory } from "./data/WzDirectory";
import { WzImg } from "./data/WzImg";
import { WzProperty } from "./data/WzProperty";
import { WzSound } from './data/WzSound';
import { RandomLittleEndianAccessFile } from "./util/RandomLittleEndianAccessFile";
import { BYTE_MIN_VALUE, rotateLeft } from "./util/WzUtils";
import { WzDecoder } from "./WzDecoder";
import { WzHeader } from "./WzHeader";

export class WzFile extends RandomLittleEndianAccessFile {

    private _root: WzDirectory;
    private _header: WzHeader;
    private _decoder: WzDecoder;

    public constructor(filePath: string, decoder: WzDecoder) {
        super(filePath, 'r');
        this._decoder = decoder;
        this._header = new WzHeader(this);
        this._root = new WzDirectory(path.basename(filePath), this._header.indexStart, 0, this);
    }

    public get root(): WzDirectory { return this._root; }

    public get header(): WzHeader { return this._header; }

    public get decoder(): WzDecoder { return this._decoder; }

    public get<T extends WzData<any>>(path: string): T {
        return this.root.get(path);
    }

    public children(): ReadonlyMap<string, WzData<any>> {
        return this.root.children()
    }

    public readEncodedBytes(length: number): Buffer {
        // FEATURE clean-up
        const buf = Buffer.allocUnsafe(length);

        let x = 0, r = 0;
        while (r < length) {
            let blockSize = super.readInt();
            r += 4;
            if (blockSize > length - r || blockSize < 0) {
                throw new RangeError(`Block size for reading buffer is wrong: ${blockSize}`);
            }

            for (let i = 0; i < blockSize; i++) {
                buf[x] = super.readByte() ^ this.decoder.get(i);
                x++;
                r++;
            }
        }
        return buf.slice(0, x);
    }

    public readEncodedString(): string {
        let length = this.readByte();
        const unicode = length > 0;

        if (length == (unicode ? 127 : -128)) {
            length = this.readInt();
        } else if (length < 0) {
            length *= -1;
        }

        if (length <= 0) {
            return "";
        } else if (unicode) {
            length *= 2;
        }
        const buffer = this.readFully(length);
        return unicode ? this.toUnicode(buffer) : this.toAscii(buffer);
    }

    private toUnicode(buffer: Buffer): string {
        for (var i = 0; i < buffer.length; i++) {
            buffer[i] = (buffer[i] ^ this.decoder.get(i));
        }
        let xorByte = 0xAAAA;
        const ret = Buffer.alloc(buffer.length / 2);
        for (let i = 0; i < (buffer.length / 2); i++) {
            const toXor = ((buffer[i] << 8) | buffer[i + 1]);
            ret[i] = (toXor ^ xorByte);
            xorByte++;
        }
        return ret.toString();
    }

    private toAscii(buffer: Buffer): string {
        let xorByte = 0xAA;
        for (var i = 0; i < buffer.length; i++) {
            buffer[i] = (buffer[i] ^ xorByte ^ this.decoder.get(i));
            xorByte++;
        }
        return buffer.toString();
    }

    public readCompressedInt(): number {
        let i = this.readByte();
        if (i == BYTE_MIN_VALUE) {
            i = this.readInt();
        }
        return i;
    }

    public readCompressedFloat(): number {
        let i = this.readByte();
        if (i == BYTE_MIN_VALUE) {
            i = this.readFloat();
        }
        return i;
    }

    public override seek(offset: number): WzFile {
        super.seek(offset);
        return this;
    }

    public readEncodedStringAt(offset: number): string {
        return this.seek(offset).readEncodedString();
    }

    public readEncodedStringAtAndReset(offset: number): string {
        const tmp = this.filePointer;
        try {
            return this.readEncodedStringAt(offset);
        } finally {
            this.seek(tmp);
        }
    }

    public readStringBlock(offset: number): string {
        const type = super.readByte();
        switch (type) {
            case 0x00:
            case 0x73:
                return this.readEncodedString();
            case 0x01:
            case 0x1B:
                return this.readEncodedStringAtAndReset(offset + super.readInt());
            default:
                throw new RangeError(`Invalid type ${type}`);
        }
    }

    public readOffset(): number {
        let offset = super.filePointer;
        offset -= this.header.fileStart;
        offset ^= 0xFFFFFFFF;
        offset *= this.header.hash;
        offset -= 0x581C3F6D;
        offset = rotateLeft(offset, offset);
        offset ^= this.readInt();
        offset += this.header.fileStart * 2;
        return offset;
    }

    public readExtendedWzData(img: WzImg, label: string): WzData<any> {
        const dataType = this.readStringBlock(img.dataStart);
        const dataStart = this.filePointer;
        switch (dataType) {
            case "Property":
                return new WzProperty(label, dataStart);
            case "Canvas":
                return new WzCanvas(label, dataStart);
            case "Shape2D#Vector2D":
                return new WzData(WzDataType.VECTOR, label, { x: this.readCompressedInt(), y: this.readCompressedInt() } as WzVectorData);
            case "Shape2D#Convex2D":
                return new WzConvex(label, dataStart);
            case "Sound_DX8":
                return new WzSound(label, dataStart);
            case "UOL":
                this.readByte();
                return new WzData(WzDataType.UOL, label, this.readStringBlock(img.dataStart));
            default:
                throw new RangeError(`Unknown dataType String: ${dataType}`);
        };
    }
}