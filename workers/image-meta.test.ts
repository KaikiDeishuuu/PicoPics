// @vitest-environment node
import { describe, expect, it } from "vitest";

import { stripJpegMetadata } from "./image-meta";

function seg(marker: number, payload: number[]): Uint8Array {
  const length = 2 + payload.length;
  const out = new Uint8Array(2 + length);
  out[0] = 0xff;
  out[1] = marker;
  out[2] = length >> 8;
  out[3] = length & 0xff;
  out.set(payload, 4);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (let i = 0; i < parts.length; i++) total += parts[i].length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    out.set(parts[i], pos);
    pos += parts[i].length;
  }
  return out;
}

const SOI = new Uint8Array([0xff, 0xd8]);
const EOI = new Uint8Array([0xff, 0xd9]);
const APP0 = seg(0xe0, [
  0x4a,
  0x46,
  0x49,
  0x46,
  0x00,
  0x01,
  0x01,
  0x00, // "JFIF\0"
]);
const DQT = seg(0xdb, [0x00, 0x01, 0x02, 0x03]);
const SOF0 = seg(0xc0, [0x08, 0x00, 0x10, 0x00, 0x10, 0x01]);
const SOS = seg(0xda, [0x01, 0x00, 0x00, 0x3f, 0x00]);
const ENTROPY = new Uint8Array([0x12, 0x34, 0x56, 0x78]);

function exifApp1(): Uint8Array {
  const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xff, 0xff]; // "Exif\0\0" + junk
  return seg(0xe1, payload);
}

function commentSeg(): Uint8Array {
  return seg(0xfe, [0x41, 0x42, 0x43]); // "ABC"
}

function markers(bytes: Uint8Array): number[] {
  const found: number[] = [];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    found.push(marker);
    if (marker === 0xda) break;
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    i += 2 + length;
  }
  return found;
}

describe("stripJpegMetadata", () => {
  it("removes APP1 (EXIF) and COM segments, keeps structure markers", () => {
    const input = concat([SOI, APP0, exifApp1(), commentSeg(), DQT, SOF0, SOS, ENTROPY, EOI]);
    const out = stripJpegMetadata(input);

    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    expect(out[out.length - 2]).toBe(0xff);
    expect(out[out.length - 1]).toBe(0xd9);

    const found = markers(out);
    expect(found).not.toContain(0xe1);
    expect(found).not.toContain(0xfe);
    expect(found).toEqual([0xe0, 0xdb, 0xc0, 0xda]);

    const dropped = exifApp1().length + commentSeg().length;
    expect(out.length).toBe(input.length - dropped);
  });

  it("returns the identical buffer when there is no metadata to drop", () => {
    const input = concat([SOI, APP0, DQT, SOF0, SOS, ENTROPY, EOI]);
    const out = stripJpegMetadata(input);
    expect(out).toBe(input);
  });

  it("leaves non-JPEG bytes untouched", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    expect(stripJpegMetadata(png)).toBe(png);
  });

  it("leaves malformed JPEGs untouched rather than corrupting them", () => {
    // Segment length points past the end of the buffer.
    const broken = concat([SOI, new Uint8Array([0xff, 0xe1, 0xff, 0xff]), ENTROPY]);
    expect(stripJpegMetadata(broken)).toBe(broken);

    // Marker stream that stops mid-way.
    const truncated = concat([SOI, APP0, new Uint8Array([0xff])]);
    expect(stripJpegMetadata(truncated)).toBe(truncated);
  });
});
