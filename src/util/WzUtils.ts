export const BYTE_MIN_VALUE = -128;
export const BYTE_MAX_VALUE = 127;

export function encVersion(real: number): number {
    const versionHash = encHash(real);
    return 0xFF ^ ((versionHash >> 8) & 0xFF) ^ (versionHash & 0xFF);
}

export function encHash(real: number): number {
    const str = new String(real);
    let versionHash = 0;
    for (var i = 0; i < str.length; i++) {
        versionHash = (32 * versionHash) + str.charCodeAt(i) + 1;
    }
    return versionHash;
}

export function rotateLeft(i: number, distance: number): number {
    return (i << distance) | (i >>> -distance);
}

export function intToByte(int: number): number {
    if (int < 0) throw new RangeError(`int < 0`);
    if (int > 0xFF) throw new RangeError(`int > ${0xFF}`);

    return (int > BYTE_MAX_VALUE) ? int - 0x100 : int;
}
