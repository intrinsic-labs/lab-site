import { promises as fsp } from "node:fs";

/**
 * Intrinsic pixel dimensions of an image on disk, read from its header at build time.
 *
 * WHY THIS EXISTS. Several image slots on this site are deliberately un-cropped — the
 * product hero is `object-contain` at `max-h-[58vh]`, a gallery slide is a fixed height and
 * `w-auto` — so, unlike the 4:3 `object-cover` cards, there is no aspect box reserving their
 * space. Without `width`/`height` on the tag the browser lays the page out with the image at
 * zero, then reflows everything when the bytes arrive. On `/products` that measured as a
 * 0.068 CLS: the hero pops in and shoves the whole two-column grid sideways, which is
 * precisely the "stuff gets jumbled up" the page was reported for. `width` + `height` give
 * the browser the aspect ratio up front; the CSS still decides the rendered size, because
 * every one of these tags already carries `w-auto`/`h-auto` + a `max-*` bound.
 *
 * WHY NOT `next/image`. It resolves dimensions for *statically imported* images only. These
 * paths are discovered at runtime by reading `public/products/<slug>/` (the folder is the
 * declaration — see public/products/README.md), so there is no import to analyse and the
 * dimensions have to be read the same way the filenames are.
 *
 * WHY A HEADER PARSER RATHER THAN A DEPENDENCY. Three formats are in the repo (png, jpg,
 * webp) and each states its size in the first few dozen bytes. Reading 64KB and looking is
 * smaller than the supply chain of an image library, and it fails soft: anything it cannot
 * parse returns `undefined` and the tag renders exactly as it did before.
 */
export interface Dimensions {
  width: number;
  height: number;
}

/** Enough for a PNG/WebP header and for the SOF marker of any JPEG we ship. */
const HEAD_BYTES = 65536;

function png(buf: Buffer): Dimensions | undefined {
  // 8-byte signature, then the IHDR chunk: 4 length + 4 type + 4 width + 4 height.
  if (buf.length < 24) return undefined;
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return undefined;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return undefined;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpeg(buf: Buffer): Dimensions | undefined {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return undefined;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++; // resync: fill bytes and entropy-coded data between segments
      continue;
    }
    const marker = buf[i + 1];
    // Standalone markers carry no length payload.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const length = buf.readUInt16BE(i + 2);
    // SOF0…SOF15 hold the frame size. C4 (DHT), C8 (JPG) and CC (DAC) share the range but
    // are not frame headers, so they are excluded rather than matched by range alone.
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    if (marker === 0xda) return undefined; // start of scan — no SOF found before the pixels
    if (length < 2) return undefined;
    i += 2 + length;
  }
  return undefined;
}

function webp(buf: Buffer): Dimensions | undefined {
  if (buf.length < 30) return undefined;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return undefined;
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8 ") {
    // Lossy: 3-byte frame tag + 3-byte sync code, then 14-bit width and height.
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (kind === "VP8L") {
    // Lossless: 1-byte signature, then 14 bits of width and 14 of height, packed LE.
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === "VP8X") {
    // Extended: canvas size as two 24-bit LE values, each stored minus one.
    return {
      width: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }
  return undefined;
}

/**
 * Reads the header of `absPath` and returns its pixel dimensions, or `undefined` for an
 * unreadable file or a format/variant this does not parse. Never throws: a missing size
 * degrades to the pre-existing behaviour (no `width`/`height` attribute) rather than
 * failing a build over an image.
 */
export async function imageSize(absPath: string): Promise<Dimensions | undefined> {
  let buf: Buffer;
  try {
    const fh = await fsp.open(absPath, "r");
    try {
      const { size } = await fh.stat();
      buf = Buffer.alloc(Math.min(HEAD_BYTES, size));
      await fh.read(buf, 0, buf.length, 0);
    } finally {
      await fh.close();
    }
  } catch {
    return undefined;
  }
  const d = png(buf) ?? jpeg(buf) ?? webp(buf);
  if (!d || !Number.isFinite(d.width) || !Number.isFinite(d.height) || d.width <= 0 || d.height <= 0) {
    return undefined;
  }
  return d;
}
