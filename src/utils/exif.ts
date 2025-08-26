/**
 * Set EXIF orientation (without re-encoding) to preserve original camera metadata (ISO, exposure, etc.).
 * Degrees: 0->1, 90->6, 180->3, 270->8
 */
export async function setJpegOrientation(
  blob: Blob,
  deg: number
): Promise<Blob> {
  if (blob.type !== "image/jpeg") return blob;
  const map: Record<number, number> = { 0: 1, 90: 6, 180: 3, 270: 8 };
  const orientationValue = map[(deg + 360) % 360];
  if (!orientationValue) return blob;
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return blob;

  let offset = 2;
  let exifFound = false;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // SOS / EOI
    const size = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (size < 2) break;
    if (marker === 0xe1 && isExif(bytes, offset + 4)) {
      try {
        if (rewriteOrientation(bytes, offset + 4, size - 2, orientationValue)) {
          exifFound = true;
          break;
        }
      } catch {
        // fall through
      }
    }
    offset += 2 + size;
  }

  if (!exifFound) {
    // Inject minimal EXIF with orientation
    const exifSegment = buildMinimalExif(orientationValue);
    const out = new Uint8Array(bytes.length + exifSegment.length);
    out.set(bytes.subarray(0, 2), 0); // SOI
    out.set(exifSegment, 2);
    out.set(bytes.subarray(2), 2 + exifSegment.length);
    return new Blob([out], { type: "image/jpeg" });
  }

  return new Blob([bytes], { type: "image/jpeg" });
}

function isExif(bytes: Uint8Array, start: number): boolean {
  return (
    bytes[start] === 0x45 &&
    bytes[start + 1] === 0x78 &&
    bytes[start + 2] === 0x69 &&
    bytes[start + 3] === 0x66 &&
    bytes[start + 4] === 0x00 &&
    bytes[start + 5] === 0x00
  );
}

function rewriteOrientation(
  bytes: Uint8Array,
  exifDataStart: number,
  exifDataLength: number,
  value: number
): boolean {
  // TIFF header after 6 bytes "Exif\0\0"
  const tiffStart = exifDataStart + 6;
  if (tiffStart + 8 > bytes.length) return false;
  const little =
    bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49
      ? true
      : bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d
      ? false
      : null;
  if (little === null) return false;

  const rd16 = (o: number) =>
    little ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1];
  const wr16 = (o: number, v: number) => {
    if (little) {
      bytes[o] = v & 0xff;
      bytes[o + 1] = v >> 8;
    } else {
      bytes[o] = v >> 8;
      bytes[o + 1] = v & 0xff;
    }
  };
  const rd32 = (o: number) =>
    little
      ? bytes[o] |
        (bytes[o + 1] << 8) |
        (bytes[o + 2] << 16) |
        (bytes[o + 3] << 24)
      : (bytes[o] << 24) |
        (bytes[o + 1] << 16) |
        (bytes[o + 2] << 8) |
        bytes[o + 3];

  if (rd16(tiffStart + 2) !== 0x002a) return false;
  const ifd0Offset = rd32(tiffStart + 4);
  const ifd0 = tiffStart + ifd0Offset;
  if (ifd0 + 2 > exifDataStart + exifDataLength) return false;
  const count = rd16(ifd0);
  let entryPtr = ifd0 + 2;
  for (let i = 0; i < count; i++) {
    const tag = rd16(entryPtr);
    if (tag === 0x0112) {
      // Orientation tag: type SHORT (3), count 1
      // Bytes 2..3 = type, 4..7 = count, 8..11 = value/offset
      // Ensure type=3 and count=1
      wr16(entryPtr + 2, 3);
      if (little) {
        bytes[entryPtr + 4] = 1;
        bytes[entryPtr + 5] = 0;
        bytes[entryPtr + 6] = 0;
        bytes[entryPtr + 7] = 0;
        bytes[entryPtr + 8] = value & 0xff;
        bytes[entryPtr + 9] = value >> 8;
        bytes[entryPtr + 10] = 0;
        bytes[entryPtr + 11] = 0;
      } else {
        bytes[entryPtr + 4] = 0;
        bytes[entryPtr + 5] = 0;
        bytes[entryPtr + 6] = 0;
        bytes[entryPtr + 7] = 1;
        bytes[entryPtr + 8] = value >> 8;
        bytes[entryPtr + 9] = value & 0xff;
        bytes[entryPtr + 10] = 0;
        bytes[entryPtr + 11] = 0;
      }
      return true;
    }
    entryPtr += 12;
    if (entryPtr + 12 > exifDataStart + exifDataLength) break;
  }
  return false;
}

function buildMinimalExif(orientation: number): Uint8Array {
  // Build: APP1 marker (FFE1) + length + "Exif\0\0" + TIFF (little endian) with 1 IFD0 entry (Orientation)
  const tiffHeader = new Uint8Array(8);
  // "II" little endian
  tiffHeader[0] = 0x49;
  tiffHeader[1] = 0x49;
  tiffHeader[2] = 0x2a;
  tiffHeader[3] = 0x00;
  // IFD0 offset = 8 (immediately after header)
  tiffHeader[4] = 0x08;
  tiffHeader[5] = 0x00;
  tiffHeader[6] = 0x00;
  tiffHeader[7] = 0x00;

  // IFD0: entry count (1)
  const ifd = new Uint8Array(2 + 12 + 4);
  ifd[0] = 0x01;
  ifd[1] = 0x00;
  // Entry
  // Tag 0x0112
  ifd[2] = 0x12;
  ifd[3] = 0x01;
  // Type SHORT (3)
  ifd[4] = 0x03;
  ifd[5] = 0x00;
  // Count = 1
  ifd[6] = 0x01;
  ifd[7] = 0x00;
  ifd[8] = orientation & 0xff;
  ifd[9] = 0x00;
  ifd[10] = 0x00;
  ifd[11] = 0x00;
  // Next IFD pointer = 0
  // ifd[12..15] already 0

  const exifId = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"
  const exifPayload = concat([exifId, tiffHeader, ifd]);

  const size = exifPayload.length + 2; // size field excludes marker itself
  const app1 = new Uint8Array(2 + 2 + exifPayload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1[2] = (size >> 8) & 0xff;
  app1[3] = size & 0xff;
  app1.set(exifPayload, 4);
  return app1;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
