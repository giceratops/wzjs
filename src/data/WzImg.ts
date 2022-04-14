import { WzFile } from '../WzFile';
import { WzDataType } from './WzData';
import { WzDataExtended } from './WzDataExtended';

export class WzImg extends WzDataExtended<void> {
 
    private _checksum: number;

    public constructor(label: string, dataStart: number, checksum: number) {
        super(WzDataType.IMG, label, dataStart);
        this._checksum = checksum;
    }

    protected override parse(reader: WzFile): WzImg {
        if (reader.readByte() == 0x73
            && reader.readEncodedString().toLowerCase() == 'property'
            && reader.readShort() == 0) {
            this.parseChildren(reader);
        }
        return this;
    }
}