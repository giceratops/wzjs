import { WzFile } from '../WzFile';
import { WzDataType } from './WzData';
import { WzDataExtended } from './WzDataExtended';

export class WzProperty extends WzDataExtended<void> {

    public constructor(label: string, dataStart: number) {
        super(WzDataType.PROPERTY, label, dataStart);
    }

    protected override parse(reader: WzFile): WzProperty {
        reader.readShort();
        super.parseChildren(reader);
        return this;
    }
}
