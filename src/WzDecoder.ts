import crypto, { Cipher, CipherKey } from 'crypto';
import { intToByte } from './util/WzUtils';

export class WzDecoder {

    private static BLOCK_SIZE = 16;

    private _cipher: Cipher;
    private _keys: Buffer;

    constructor(iv: Buffer, key: CipherKey) {
        this._cipher = crypto.createCipheriv('aes-256-ecb', key, null);
        this._cipher.setAutoPadding(true);
        this._keys = this._cipher.update(Buffer.alloc(WzDecoder.BLOCK_SIZE, iv));
    }

    public get(index: number): number {
        if (this._keys.length <= index) {
            this.expandTo(((index / WzDecoder.BLOCK_SIZE) + 1) * WzDecoder.BLOCK_SIZE);
        }

        return intToByte(this._keys[index]);
    }

    private expandTo(newSize: number): void {
        const newKeys = Buffer.allocUnsafe(newSize);
        this._keys.copy(newKeys);
        
        const startIndex = this._keys.length;
        let prep = Buffer.allocUnsafe(WzDecoder.BLOCK_SIZE)
        newKeys.copy(prep, 0, startIndex - WzDecoder.BLOCK_SIZE, startIndex);
        for (var i = startIndex; i < newKeys.length; i += WzDecoder.BLOCK_SIZE) {
            prep = this._cipher.update(prep);
            prep.copy(newKeys, i)
        }
        this._keys = newKeys;
    }
}