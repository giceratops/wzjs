import Jimp from 'jimp';
import zlib from 'zlib';
import { WzFile } from '../WzFile';
import { WzDataType } from './WzData';
import { WzDataExtended } from './WzDataExtended';

export type WzCanvasData = {
    width: number;
    height: number;
    format: number;
    scale: number;
    prop: number;
    getImage: () => Promise<Jimp>;
}

export class WzCanvas extends WzDataExtended<WzCanvasData> {

    public constructor(label: string, dataStart: number) {
        super(WzDataType.CANVAS, label, dataStart);
    }

    protected override parse(reader: WzFile): WzCanvas {
        if (reader.readShort() == 0x0100) {
            reader.readShort();
            super.parseChildren(reader);
        }

        const width = reader.readCompressedInt();
        const height = reader.readCompressedInt();
        const format = reader.readCompressedInt();
        const scale = reader.readByte();
        const prop = reader.readInt();

        const fp = reader.filePointer;
        super.value = {
            width, height, format, scale, prop,
            getImage: (): Promise<Jimp> => this.parseImage.call(this, reader.seek(fp))
        }
        return this;
    }

    private async parseImage(reader: WzFile): Promise<Jimp> {
        const raw = this.readRawBytes(reader);
        const inflated = await this.inflate(raw);

        // TODO set buffer size
        const img = new Jimp(this.value.width, this.value.height);

        // TODO other formats
        let decoded;
        switch (super.value.format) {
            case 1:
                decoded = WzCanvas.getPixelDataBgra4444(inflated, super.value.width, super.value.height)
                this.bgra8888(img, decoded, decoded.length)
                break;
        }
        return img;
    }


    private readRawBytes(reader: WzFile): Buffer {
        const length = reader.readInt() - 1;
        reader.readByte();

        const header = reader.readShort() & 0xFFFF;
        reader.skip(-2);
        const decrypt = header != 0x9C78 && header != 0xDA78 && header != 0x0178 && header != 0x5E78;

        return decrypt ? reader.readEncodedBytes(length) : reader.readFully(length);
    }


    private calculateUncompressedSize(): number {
        //TODO verify sizes/formats
        switch (super.value.format) {
            case 0x1:
            case 0x201:
                return super.value.width * super.value.height * 2;
            case 0x2:
            case 0x3:
                return super.value.width * super.value.height * 4
            case 0x250:
                return Math.round(super.value.width * super.value.height / 128);
            default:
                throw new RangeError(`Can not calculate uncompresssed size of format ${super.value.format}`);
        }
    }

    private async inflate(data: Buffer): Promise<Buffer> {
        // FEATURE recode?
        const uncompressedSize = this.calculateUncompressedSize();
        return new Promise<Buffer>((resolve, reject) => {
            const inflater = zlib.createInflate();
            const buf = Buffer.alloc(uncompressedSize)
            const chunks = new Array<Uint8Array>();
            inflater.on('error', (err: Error & { errno: number }) => {
                if (err.errno != -5) {
                    reject(err);
                }
            });
            inflater.on('data', (chunk: Uint8Array) => {
                chunks.push(chunk);
            });
            inflater.on('finish', () => {
                const chunk = Buffer.concat(chunks);
                chunk.copy(buf, 0, 0, Math.min(chunk.length, uncompressedSize));
                inflater.close();
                resolve(buf);
            });

            inflater.end(data);
        });
    }

    private static getPixelDataBgra4444(rawData: Uint8Array, width: number, height: number): Uint8Array {
        let b: number, g: number

        const uncompressedSize = width * height * 2
        const argb = new Uint8Array(uncompressedSize * 2)
        for (let i = 0; i < uncompressedSize; i++) {
            b = rawData[i] & 0x0F
            b |= (b << 4)

            argb[i * 2] = (b >>> 0) & 0xff

            g = rawData[i] & 0xF0
            g |= (g >> 4)

            argb[i * 2 + 1] = (g >>> 0) & 0xff
        }
        return argb
    }

    public bgra8888(img: Jimp, data: Uint8Array, length: number): void {
        let x = 0
        let y = 0
        const width = img.getWidth()
        for (let i = 0; i < length; i += 4) {
            img.setPixelColor(WzCanvas.rgbaToInt(data[i + 2], data[i + 1], data[i + 0], data[i + 3]), x, y)
            x++
            if (x >= width) { x = 0; y++ }
        }
    }

    public static rgbaToInt(r: number, g: number, b: number, a: number): number {
        return Jimp.rgbaToInt(r, g, b, a);
    }

}




// int sizeUncompressed = 0;
// int size8888;
// int maxWriteBuf = 2;
// byte[] writeBuf = new byte[maxWriteBuf];
// switch (this.format) {
//     case 0x1, 0x201 -> sizeUncompressed = this.height * this.width * 4;
//     case 0x2 -> sizeUncompressed = this.height * this.width * 8;
//     case 0x205 -> sizeUncompressed = this.height * this.width / 128;
// }
// size8888 = this.height * this.width * 8;
// if (size8888 > maxWriteBuf) {
//     maxWriteBuf = size8888;
//     writeBuf = new byte[maxWriteBuf];
// }

// final var len = reader.readInt();
// reader.readByte();


// final var header = reader.readShort() & 0xFFFF;
// reader.skip(-2);
// final var requiresDecryption = header != 0x9C78 && header != 0xDA78 && header != 0x0178 && header != 0x5E78;

// final byte[] data;
// if (requiresDecryption) {
//     //final var blockSize = reader.readInt();
//     //reader.skip(blockSize);
//     data = reader.readEncodedBytes(len - 1);
// } else {
//     data = reader.readFully(len - 1);
// }

// final var dec = new Inflater();
// dec.setInput(data);
// int declen;

// final var uc = new byte[sizeUncompressed];
// try {
//     declen = dec.inflate(uc);
// } catch (DataFormatException ex) {
//     throw new RuntimeException("zlib fucks", ex);
// }
// dec.end();
// if (this.format == 1) {
//     for (int i = 0; i < sizeUncompressed; i++) {
//         byte low = (byte) (uc[i] & 0x0F);
//         byte high = (byte) (uc[i] & 0xF0);
//         writeBuf[(i << 1)] = (byte) (((low << 4) | low) & 0xFF);
//         writeBuf[(i << 1) + 1] = (byte) (high | ((high >>> 4) & 0xF));
//     }
// } else if (this.format == 2) {
//     writeBuf = uc;
// } else if (this.format == 513) {
//     for (int i = 0; i < declen; i += 2) {
//         byte bBits = (byte) ((uc[i] & 0x1F) << 3);
//         byte gBits = (byte) (((uc[i + 1] & 0x07) << 5) | ((uc[i] & 0xE0) >> 3));
//         byte rBits = (byte) (uc[i + 1] & 0xF8);
//         writeBuf[(i << 1)] = (byte) (bBits | (bBits >> 5));
//         writeBuf[(i << 1) + 1] = (byte) (gBits | (gBits >> 6));
//         writeBuf[(i << 1) + 2] = (byte) (rBits | (rBits >> 5));
//         writeBuf[(i << 1) + 3] = (byte) 0xFF;
//     }
// } else if (this.format == 517) {
//     byte b;
//     int pixelIndex;
//     for (int i = 0; i < declen; i++) {
//         for (int j = 0; j < 8; j++) {
//             b = (byte) (((uc[i] & (0x01 << (7 - j))) >> (7 - j)) * 255);
//             for (int k = 0; k < 16; k++) {
//                 pixelIndex = (i << 9) + (j << 6) + k * 2;
//                 writeBuf[pixelIndex] = b;
//                 writeBuf[pixelIndex + 1] = b;
//                 writeBuf[pixelIndex + 2] = b;
//                 writeBuf[pixelIndex + 3] = (byte) 0xFF;
//             }
//         }
//     }
// }
// final var imgData = new DataBufferByte(writeBuf, sizeUncompressed);
// final var sm = new PixelInterleavedSampleModel(DataBuffer.TYPE_BYTE, this.width, this.height, 4, this.width * 4, ZAHLEN);
// final var imgRaster = Raster.createWritableRaster(sm, imgData, new Point(0, 0));
// final var aa = new BufferedImage(this.width, this.height, BufferedImage.TYPE_INT_ARGB);
// aa.setData(imgRaster);
// this.image = aa;

// return this;