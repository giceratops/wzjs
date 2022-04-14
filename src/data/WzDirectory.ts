import { WzFile } from '../WzFile';
import { WzDataType } from './WzData';
import { WzDataExtended } from './WzDataExtended';
import { WzImg } from './WzImg';

export class WzDirectory extends WzDataExtended<void> {

    private _file: WzFile;
    private _checksum: number;

    public constructor(label: string, dataStart = 0, checksum = 0, file?: WzFile) {
        super(WzDataType.DIRECTORY, label, dataStart);
        this._checksum = checksum;
        this._file = file;
    }

    public override get file(): WzFile {
        return this._file ? this._file : super.file
    }

    protected override parse(reader: WzFile): WzDirectory {
        const entryCount = reader.readCompressedInt();
        for (let i = 0; i < entryCount; i++) {
            let type = reader.readByte();
            let blockSize: number;
            let checksum_: number;
            let offset_: number;
            let rememberPos: number;
            let fname: string;
            let stringOffset: number;

            switch (type) {
                case 0x01:
                    reader.readInt();
                    reader.readShort();
                    reader.readOffset();
                    continue;
                case 0x02: 
                    stringOffset = reader.readInt();
                    rememberPos = reader.filePointer;
                    reader.seek(reader.header.fileStart + stringOffset);
                    type = reader.readByte();
                    fname = reader.readEncodedString();
                    break;
                case 0x03:
                case 0x04:
                    fname = reader.readEncodedString();
                    rememberPos = reader.filePointer;
                    break;
                default:
                    throw new Error(`Unknown type=${type}`);
            }

            switch (type) {
                case 0x03:
                case 0x04:
                    reader.seek(rememberPos);
                    blockSize = reader.readCompressedInt();
                    checksum_ = reader.readCompressedInt();
                    offset_ = reader.readOffset();
                    if (type == 0x04) {
                        this.addChild(new WzImg(fname, offset_, checksum_));
                    } else {
                        this.addChild(new WzDirectory(fname, offset_, checksum_));
                    }
                    break;
                default:
                    throw new Error(`Unknown type2=${type}`);
            }
        }
        return this;
    }
}