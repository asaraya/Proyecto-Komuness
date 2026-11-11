/**
 * Verificación del CONTENIDO real de los archivos subidos.
 *
 * El nombre y el MIME que manda el cliente son datos no confiables: aquí se leen los bytes
 * del archivo para comprobar que (1) es del tipo que dice su extensión, (2) no es un
 * ejecutable/script disfrazado y (3) no trae contenido activo conocido (macros, JavaScript
 * en PDF, ZIP con ejecutables, zip-slip, zip-bombs, etc.).
 *
 * Sin dependencias externas. Funciona con archivos en disco (multer.diskStorage)
 * y en memoria (multer.memoryStorage).
 */
import fsp from 'fs/promises';
import path from 'path';

export type FileKind =
  | 'pdf' | 'png' | 'jpeg' | 'webp' | 'txt'
  | 'zip' | 'rar' | 'docx' | 'xlsx' | 'pptx'
  | 'doc' | 'xls' | 'ppt';

/** extensión (minúsculas, con punto) → tipo lógico + MIME canónico */
export const EXT_TO_KIND: Record<string, { kind: FileKind; mime: string }> = {
  '.pdf':  { kind: 'pdf',  mime: 'application/pdf' },
  '.png':  { kind: 'png',  mime: 'image/png' },
  '.jpg':  { kind: 'jpeg', mime: 'image/jpeg' },
  '.jpeg': { kind: 'jpeg', mime: 'image/jpeg' },
  '.webp': { kind: 'webp', mime: 'image/webp' },
  '.txt':  { kind: 'txt',  mime: 'text/plain' },
  '.zip':  { kind: 'zip',  mime: 'application/zip' },
  '.rar':  { kind: 'rar',  mime: 'application/x-rar-compressed' },
  '.docx': { kind: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '.xlsx': { kind: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  '.pptx': { kind: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  '.doc':  { kind: 'doc',  mime: 'application/msword' },
  '.xls':  { kind: 'xls',  mime: 'application/vnd.ms-excel' },
  '.ppt':  { kind: 'ppt',  mime: 'application/vnd.ms-powerpoint' },
};

/** Conjuntos de extensiones por política de subida */
export const POLICY_EXTS = {
  images:  ['.jpg', '.jpeg', '.png', '.webp'],
  pdf:     ['.pdf'],
  library: ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar'],
} as const;
export type UploadPolicy = keyof typeof POLICY_EXTS;

export type VerifyResult = { ok: true; mime: string; kind: FileKind } | { ok: false; reason: string };

/* ----------------------------- acceso a bytes ----------------------------- */

interface Source {
  size: number;
  read(pos: number, len: number): Promise<Buffer>;
}

async function openSource(file: { buffer?: Buffer; path?: string }): Promise<{ src: Source; close: () => Promise<void> }> {
  if (file.buffer) {
    const buf = file.buffer;
    return {
      src: { size: buf.length, read: async (pos, len) => buf.subarray(pos, Math.min(buf.length, pos + len)) },
      close: async () => {},
    };
  }
  if (!file.path) throw new Error('Archivo sin contenido');
  const fh = await fsp.open(file.path, 'r');
  const { size } = await fh.stat();
  return {
    src: {
      size,
      read: async (pos, len) => {
        const n = Math.max(0, Math.min(len, size - pos));
        const buf = Buffer.alloc(n);
        if (n > 0) await fh.read(buf, 0, n, pos);
        return buf;
      },
    },
    close: () => fh.close(),
  };
}

/** Busca alguna de las secuencias de bytes en todo el archivo (por bloques) */
async function containsAny(src: Source, needles: Buffer[], maxBytes = Infinity): Promise<Buffer | null> {
  const CHUNK = 1024 * 1024;
  const overlap = Math.max(...needles.map(n => n.length)) - 1;
  const limit = Math.min(src.size, maxBytes);
  let pos = 0;
  while (pos < limit) {
    const buf = await src.read(pos, CHUNK + overlap);
    for (const n of needles) if (buf.includes(n)) return n;
    pos += CHUNK;
  }
  return null;
}

const utf16 = (s: string) => Buffer.from(s, 'utf16le');

/* ----------------------- firmas de ejecutables / scripts ----------------------- */

/** Devuelve una descripción si los primeros bytes son de un ejecutable o script, si no null */
function executableSignature(h: Buffer): string | null {
  const starts = (...bytes: number[]) => bytes.every((b, i) => h[i] === b);
  if (starts(0x4d, 0x5a)) return 'ejecutable de Windows (PE/MZ)';
  if (starts(0x7f, 0x45, 0x4c, 0x46)) return 'ejecutable de Linux (ELF)';
  if (starts(0xfe, 0xed, 0xfa, 0xce) || starts(0xfe, 0xed, 0xfa, 0xcf) ||
      starts(0xce, 0xfa, 0xed, 0xfe) || starts(0xcf, 0xfa, 0xed, 0xfe)) return 'ejecutable de macOS (Mach-O)';
  if (starts(0xca, 0xfe, 0xba, 0xbe)) return 'binario Java / Mach-O universal';
  if (starts(0x23, 0x21)) return 'script (#!)';
  if (starts(0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00)) return 'acceso directo de Windows (.lnk)';
  const text = h.subarray(0, 512).toString('latin1').trimStart().toLowerCase();
  if (text.startsWith('<?php') || text.startsWith('<script') || text.startsWith('<!doctype html') || text.startsWith('<html') || text.startsWith('<svg')) {
    return 'documento web activo (HTML/PHP/JS/SVG)';
  }
  return null;
}

/* ------------------------------- ZIP / OOXML ------------------------------- */

const DANGEROUS_ENTRY_EXTS = new Set([
  '.exe', '.dll', '.scr', '.com', '.pif', '.msi', '.msp', '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.vbe',
  '.js', '.jse', '.wsf', '.wsh', '.hta', '.cpl', '.lnk', '.reg', '.jar', '.apk', '.sh', '.bash',
  '.php', '.phtml', '.jsp', '.asp', '.aspx', '.py', '.pl', '.rb', '.so', '.dylib', '.app', '.command', '.appimage',
]);

const MAX_ZIP_ENTRIES = 10_000;
const MAX_ZIP_UNCOMPRESSED = 2 * 1024 * 1024 * 1024; // 2 GB descomprimido
const MAX_ZIP_RATIO = 200;                            // anti zip-bomb

interface ZipEntry { name: string; flags: number; compressed: number; uncompressed: number }

/** Lee el directorio central de un ZIP. Devuelve null si el ZIP está corrupto */
async function readZipEntries(src: Source): Promise<ZipEntry[] | null> {
  const tailLen = Math.min(src.size, 66 * 1024);
  const tail = await src.read(src.size - tailLen, tailLen);
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || eocd + 22 > tail.length) return null;
  const total = tail.readUInt16LE(eocd + 10);
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return null; // ZIP64: no soportado → rechazar
  if (cdOffset + cdSize > src.size || total > MAX_ZIP_ENTRIES) return null;

  const cd = await src.read(cdOffset, cdSize);
  const entries: ZipEntry[] = [];
  let p = 0;
  for (let i = 0; i < total; i++) {
    if (p + 46 > cd.length || cd.readUInt32LE(p) !== 0x02014b50) return null;
    const flags = cd.readUInt16LE(p + 8);
    const compressed = cd.readUInt32LE(p + 20);
    const uncompressed = cd.readUInt32LE(p + 24);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    if (p + 46 + nameLen > cd.length) return null;
    entries.push({ name: cd.subarray(p + 46, p + 46 + nameLen).toString('utf8'), flags, compressed, uncompressed });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function checkZipEntries(entries: ZipEntry[], zipSize: number): string | null {
  let totalUncompressed = 0;
  for (const e of entries) {
    const n = e.name.replace(/\\/g, '/');
    if (n.startsWith('/') || /^[a-zA-Z]:/.test(n) || n.split('/').includes('..')) {
      return `contiene una ruta peligrosa (${e.name})`;
    }
    if (e.flags & 0x1) return 'contiene archivos cifrados que no se pueden revisar';
    const ext = path.extname(n).toLowerCase();
    if (DANGEROUS_ENTRY_EXTS.has(ext)) return `contiene un archivo ejecutable o script (${e.name})`;
    totalUncompressed += e.uncompressed;
  }
  if (totalUncompressed > MAX_ZIP_UNCOMPRESSED) return 'se descomprime a un tamaño excesivo';
  if (zipSize > 0 && totalUncompressed / zipSize > MAX_ZIP_RATIO) return 'tiene una tasa de compresión sospechosa (posible zip-bomb)';
  return null;
}

const OOXML_PREFIX: Record<string, string> = { docx: 'word/', xlsx: 'xl/', pptx: 'ppt/' };

/* ----------------------------- verificadores ----------------------------- */

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
const OLE_SIG = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

async function verifyKind(kind: FileKind, src: Source, head: Buffer): Promise<string | null> {
  switch (kind) {
    case 'png': {
      if (!head.subarray(0, 8).equals(PNG_SIG)) return 'el contenido no es un PNG válido';
      const tail = await src.read(src.size - 12, 12);
      if (!tail.equals(PNG_IEND)) return 'el PNG está corrupto o tiene datos adicionales ocultos';
      return null;
    }
    case 'jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff ? null : 'el contenido no es un JPEG válido';
    case 'webp': {
      if (head.subarray(0, 4).toString('latin1') !== 'RIFF' || head.subarray(8, 12).toString('latin1') !== 'WEBP') {
        return 'el contenido no es un WEBP válido';
      }
      const riffSize = head.readUInt32LE(4) + 8;
      return riffSize <= src.size ? null : 'el WEBP está corrupto';
    }
    case 'pdf': {
      if (head.subarray(0, 5).toString('latin1') !== '%PDF-') return 'el contenido no es un PDF válido';
      const bad = await containsAny(src, [Buffer.from('/JavaScript'), Buffer.from('/Launch')], 100 * 1024 * 1024);
      if (bad) return 'el PDF contiene JavaScript o acciones de lanzamiento (no permitido)';
      return null;
    }
    case 'txt': {
      const sample = await src.read(0, Math.min(src.size, 1024 * 1024));
      if (sample.includes(0)) return 'el contenido no es texto plano (contiene datos binarios)';
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(sample.subarray(0, sample.length - 3)); // -3: tolerar multibyte cortado
      } catch {
        // permitir texto ANSI (latin1): solo se rechaza si hay muchos caracteres de control
        const ctrl = sample.filter(b => b < 0x09 || (b > 0x0d && b < 0x20)).length;
        if (ctrl > 0) return 'el contenido no es texto plano';
      }
      return null;
    }
    case 'rar': {
      const v4 = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
      const v5 = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
      return head.subarray(0, 7).equals(v4) || head.subarray(0, 8).equals(v5) ? null : 'el contenido no es un RAR válido';
    }
    case 'zip':
    case 'docx':
    case 'xlsx':
    case 'pptx': {
      const isZip = head[0] === 0x50 && head[1] === 0x4b && (head[2] === 0x03 || head[2] === 0x05);
      if (!isZip) return `el contenido no es un ${kind.toUpperCase()} válido`;
      const entries = await readZipEntries(src);
      if (!entries) return 'el archivo comprimido está corrupto o usa un formato no soportado (ZIP64)';
      const problem = checkZipEntries(entries, src.size);
      if (problem) return `el archivo comprimido ${problem}`;
      if (kind !== 'zip') {
        const names = entries.map(e => e.name.replace(/\\/g, '/'));
        if (!names.includes('[Content_Types].xml') || !names.some(n => n.startsWith(OOXML_PREFIX[kind]))) {
          return `no es un documento ${kind.toUpperCase()} genuino`;
        }
        if (names.some(n => /vbaproject\.bin$/i.test(n))) return 'contiene macros (VBA), que no están permitidas';
      }
      return null;
    }
    case 'doc':
    case 'xls':
    case 'ppt': {
      if (!head.subarray(0, 8).equals(OLE_SIG)) return `el contenido no es un documento ${kind.toUpperCase()} válido`;
      const marker = { doc: 'WordDocument', xls: 'Workbook', ppt: 'PowerPoint Document' }[kind];
      const alt = kind === 'xls' ? [utf16('Workbook'), utf16('Book')] : [utf16(marker)];
      const OLE_SCAN_LIMIT = 100 * 1024 * 1024;
      if (!(await containsAny(src, alt, OLE_SCAN_LIMIT))) return `no es un documento ${kind.toUpperCase()} genuino`;
      if (await containsAny(src, [utf16('_VBA_PROJECT')], OLE_SCAN_LIMIT)) {
        return 'contiene macros (VBA), que no están permitidas';
      }
      return null;
    }
  }
}

/**
 * Verifica un archivo: la extensión debe estar permitida por la política y el contenido real
 * debe corresponder a esa extensión.
 */
export async function verifyFileContent(
  file: { originalname: string; buffer?: Buffer; path?: string },
  policy: UploadPolicy
): Promise<VerifyResult> {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = POLICY_EXTS[policy] as readonly string[];
  const info = EXT_TO_KIND[ext];
  if (!info || !allowed.includes(ext)) return { ok: false, reason: 'formato de archivo no permitido' };

  let handle: Awaited<ReturnType<typeof openSource>> | undefined;
  try {
    handle = await openSource(file);
    const { src } = handle;
    if (src.size === 0) return { ok: false, reason: 'el archivo está vacío' };

    const head = await src.read(0, 4096);
    const exe = executableSignature(head);
    if (exe) return { ok: false, reason: `el contenido es un ${exe}` };

    const problem = await verifyKind(info.kind, src, head);
    if (problem) return { ok: false, reason: problem };
    return { ok: true, mime: info.mime, kind: info.kind };
  } catch (err) {
    return { ok: false, reason: 'no se pudo leer el archivo para verificarlo' };
  } finally {
    await handle?.close().catch(() => {});
  }
}
