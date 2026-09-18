// JPEG metadata stripper: walks the segment structure and drops APP1
// (EXIF / XMP — carries GPS coordinates and device info) and COM
// (comments) segments while leaving pixel data untouched. Anything that
// doesn't parse cleanly is returned unchanged — never corrupt an image
// to remove metadata.
//
// PNG/WebP/GIF pass through as-is: their EXIF-carrying chunks are rare in
// the wild (camera screenshots and phone photos that dominate uploads are
// JPEG), and dropping the wrong chunk would break rendering.
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }

  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let dropped = false;
  let i = 2;

  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) {
      // Not at a marker boundary — malformed; keep the original bytes.
      return bytes;
    }

    const marker = bytes[i + 1];

    // Standalone markers without a length field (TEM, RSTn).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(i, i + 2));
      i += 2;
      continue;
    }

    if (marker === 0xd9) {
      // EOI — done.
      parts.push(bytes.subarray(i));
      i = bytes.length;
      break;
    }

    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2 || i + 2 + length > bytes.length) {
      return bytes; // impossible length — malformed
    }

    if (marker === 0xe1 || marker === 0xfe) {
      dropped = true; // APP1 (EXIF/XMP) or COM — metadata only, drop
    } else {
      parts.push(bytes.subarray(i, i + 2 + length));
    }
    i += 2 + length;

    if (marker === 0xda) {
      // SOS — entropy-coded image data runs to EOI; copy verbatim.
      parts.push(bytes.subarray(i));
      i = bytes.length;
    }
  }

  if (i < bytes.length) {
    // Trailing bytes after the last parsed segment — keep the original.
    return bytes;
  }

  if (!dropped) {
    return bytes;
  }

  let total = 0;
  for (let idx = 0; idx < parts.length; idx++) {
    total += parts[idx].length;
  }
  const out = new Uint8Array(total);
  let pos = 0;
  for (let idx = 0; idx < parts.length; idx++) {
    out.set(parts[idx], pos);
    pos += parts[idx].length;
  }
  return out;
}
