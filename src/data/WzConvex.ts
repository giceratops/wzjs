import { WzFile } from '../WzFile';
import { WzDataType } from './WzData';
import { WzDataExtended } from './WzDataExtended';

// TODO define proper type
// eslint-disable-next-line @typescript-eslint/ban-types
export type WzConvexData = {
}

export class WzConvex extends WzDataExtended<WzConvexData> {

    public constructor(label: string, dataStart: number) {
        super(WzDataType.CONVEX, label, dataStart);
    }

    // TODO read data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected override parse(reader: WzFile): WzConvex {
        return this;
    }
}