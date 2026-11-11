/** Generadores de archivos mínimos pero estructuralmente válidos (y versiones disfrazadas) para tests */
import zlib from 'zlib';

export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('0000000d49484452000000010000000108060000001f15c489', 'hex'),
  Buffer.from('0000000a49444154789c6300010000050001', 'hex'),
  Buffer.from('0d0a2db4', 'hex'),
  Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]),
]);
export const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(30, 1), Buffer.from([0xff, 0xd9])]);
export const WEBP = (() => {
  const body = Buffer.concat([Buffer.from('WEBP'), Buffer.alloc(20, 2)]);
  const size = Buffer.alloc(4); size.writeUInt32LE(body.length);
  return Buffer.concat([Buffer.from('RIFF'), size, body]);
})();
export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
export const PDF_JS = Buffer.from('%PDF-1.4\n1 0 obj<</S/JavaScript /JavaScript (app.alert(1))>>endobj\n%%EOF');
export const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100, 0x90)]);
export const ELF = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(60)]);
export const SCRIPT = Buffer.from('#!/bin/sh\nrm -rf /\n');
export const HTML = Buffer.from('<html><script>alert(1)</script></html>');
export const TXT = Buffer.from('Hola mundo, esto es texto plano con acentos: áéíóú\n');

/** ZIP mínimo con entradas "stored". flags/uncompressed permiten simular cifrado o bombas. */
export function makeZip(entries: { name: string; data?: Buffer; flags?: number; fakeUncompressed?: number }[]) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name);
    const data = e.data ?? Buffer.from('x');
    const flags = e.flags ?? 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(flags, 6);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(flags, 8);
    c.writeUInt32LE(data.length, 20); c.writeUInt32LE(e.fakeUncompressed ?? data.length, 24);
    c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    centrals.push(c, name);
    offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

export const ZIP = makeZip([{ name: 'readme.txt', data: Buffer.from('hola') }]);
const ooxml = (dir: string, extra: { name: string }[] = []) =>
  makeZip([{ name: '[Content_Types].xml' }, { name: `${dir}/document.xml` }, ...extra]);
export const DOCX = ooxml('word');
export const XLSX = ooxml('xl');
export const PPTX = ooxml('ppt');
export const DOCX_MACRO = ooxml('word', [{ name: 'word/vbaProject.bin' }]);

const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
export const DOC = Buffer.concat([OLE, Buffer.alloc(100), Buffer.from('WordDocument', 'utf16le')]);
export const XLS = Buffer.concat([OLE, Buffer.alloc(100), Buffer.from('Workbook', 'utf16le')]);
export const PPT = Buffer.concat([OLE, Buffer.alloc(100), Buffer.from('PowerPoint Document', 'utf16le')]);
export const DOC_MACRO = Buffer.concat([DOC, Buffer.from('_VBA_PROJECT', 'utf16le')]);
export const RAR = Buffer.concat([Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]), Buffer.alloc(50)]);
void zlib;
