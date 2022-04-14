import fs, { Mode, OpenMode, PathLike } from 'fs';

export class RandomLittleEndianAccessFile {

    private _fd: number;
    private _pos: number;
    private _stats: fs.Stats;

    public constructor(path: PathLike, flags: OpenMode, mode?: Mode | null) {
        this._fd = fs.openSync(path, flags, mode);
        this._stats = fs.statSync(path);
        this._pos = 0;
    }

    get length(): number { return this._stats.size; }

    get filePointer(): number { return this._pos; }

    public close() {
        fs.closeSync(this._fd);
    }

    public seek(pos: number): RandomLittleEndianAccessFile {
        if (pos < 0) throw new Error("Negative seek offset");

        this._pos = pos;
        return this;
    }

    public skip(skip: number): RandomLittleEndianAccessFile {
        return this.seek(this._pos + skip);
    }

    public readFully(length: number): Buffer {
        const buf = Buffer.allocUnsafe(length);
        const read = fs.readSync(this._fd, buf, 0, length, this._pos);
        if (read != length) {
            throw new Error(`Expected to read ${length} bytes but read ${read} instead. EOF?`);
        }
        this._pos += length;
        return buf;
    }

    public read(): number {
        return this.readFully(1)
            .readUInt8();
    }

    public readByte(): number {
        return this.readFully(1)
            .readInt8();
    }

    public readShort(): number {
        return this.readFully(2)
            .readInt16LE();
    }

    public readInt(): number {
        return this.readFully(4)
            .readInt32LE();
    }

    public readFloat(): number {
        return this.readFully(4)
            .readFloatLE();

    }

    public readLong(): bigint {
        return this.readFully(8)
            .readBigInt64LE();
    }

    public readDouble(): number {
        return this.readFully(8)
            .readDoubleLE();
    }

    public readString(length: number): string {
        return this.readFully(length)
            .toString();
    }

    public readNullTerminatedString(): string {
        const ret = Array<number>();
        let b: number;
        while ((b = this.read()) != 0) {
            ret.push(b);
        }

        return String.fromCharCode(...ret);
    }
}