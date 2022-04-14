import { WzFile } from '../WzFile';
import { WzDataType } from './WzData';
import { WzDataExtended } from './WzDataExtended';

// TODO define proper type
// eslint-disable-next-line @typescript-eslint/ban-types
export type WzSoundData = {
}

export class WzSound extends WzDataExtended<WzSoundData> {

    public constructor(label: string, dataStart: number) {
        super(WzDataType.SOUND, label, dataStart);
    }

    // TODO read data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected override parse(reader: WzFile): WzSound {
        return this;
    }
}