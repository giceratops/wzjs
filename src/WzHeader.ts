import { encHash, encVersion } from "./util/WzUtils";
import { WzFile } from "./WzFile";

export class WzHeader {

    private _encVersion: number;
    private _fileStart: number;
    private _fileSize: bigint;
    private _ident: string;
    private _copyright: string;

    private _realVersion: number = 0;
    private _hash: number = 0;

    public constructor(reader?: WzFile) {
        if (reader) {
            this.ident = reader.seek(0).readString(4);
            this.fileSize = reader.readLong();
            this.fileStart = reader.readInt();
            this.copyright = reader.readNullTerminatedString();
            this.encVersion = reader.seek(this.fileStart).readShort();
            this.nextVersion();
        }
    }

    public get encVersion() { return this._encVersion; }
    public set encVersion(version) { this._encVersion = version; }

    public get fileStart() { return this._fileStart;}
    public set fileStart(fileStart) { this._fileStart = fileStart; }
    
    public get fileSize() { return this._fileSize; }
    public set fileSize(fileSize) { this._fileSize = fileSize; }

    public get ident() { return this._ident; }
    public set ident(ident) { this._ident = ident; }

    public get copyright() { return this._copyright; }
    public set copyright(copyright) { this._copyright = copyright; }

    public get realVersion() { return this._realVersion; }
    private set realVersion(version) { this._realVersion = version; }

    public get hash() { return this._hash; }
    private set hash(hash) { this._hash = hash; }

    public get indexStart() { return this.fileStart + 2 /* Bytes Short; */ }

    public nextVersion(): boolean {
        while (this.realVersion < 32767) {
            this.realVersion++;
            if (this.encVersion == encVersion(this.realVersion)) {
                this.hash = encHash(this.realVersion);
                return true;
            }
        }
        return false;
    }

}