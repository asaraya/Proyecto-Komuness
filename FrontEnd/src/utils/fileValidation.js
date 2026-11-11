/**
 * Verificación del CONTENIDO real de los archivos antes de subirlos (espejo de
 * backend/src/utils/fileContent.ts). Es una ayuda de UX: evita subir archivos que el
 * servidor va a rechazar, pero la validación que cuenta es siempre la del backend.
 *
 * Uso:
 *   const { valid, rejected } = await filterValidFiles(files, 'images')
 *   const res = await verifyFileContent(file, 'library')   // { ok, reason, mime }
 */
import { toast } from 'react-hot-toast'

const EXT_TO_KIND = {
  '.pdf': { kind: 'pdf', mime: 'application/pdf' },
  '.png': { kind: 'png', mime: 'image/png' },
  '.jpg': { kind: 'jpeg', mime: 'image/jpeg' },
  '.jpeg': { kind: 'jpeg', mime: 'image/jpeg' },
  '.webp': { kind: 'webp', mime: 'image/webp' },
  '.txt': { kind: 'txt', mime: 'text/plain' },
  '.zip': { kind: 'zip', mime: 'application/zip' },
  '.rar': { kind: 'rar', mime: 'application/x-rar-compressed' },
  '.docx': { kind: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '.xlsx': { kind: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  '.pptx': { kind: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  '.doc': { kind: 'doc', mime: 'application/msword' },
  '.xls': { kind: 'xls', mime: 'application/vnd.ms-excel' },
  '.ppt': { kind: 'ppt', mime: 'application/vnd.ms-powerpoint' },
}

export const POLICY_EXTS = {
  images: ['.jpg', '.jpeg', '.png', '.webp'],
  pdf: ['.pdf'],
  library: ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar'],
}

/** Valor para el atributo `accept` de un <input type="file"> */
export const acceptAttr = (policy) => POLICY_EXTS[policy].join(',')

/** Mensaje legible con los formatos permitidos */
export const allowedLabel = (policy) =>
  POLICY_EXTS[policy].map((e) => e.slice(1).toUpperCase()).filter((v, i, a) => a.indexOf(v) === i).join(', ')

const DANGEROUS_ENTRY_EXTS = new Set([
  '.exe', '.dll', '.scr', '.com', '.pif', '.msi', '.msp', '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.vbe',
  '.js', '.jse', '.wsf', '.wsh', '.hta', '.cpl', '.lnk', '.reg', '.jar', '.apk', '.sh', '.bash',
  '.php', '.phtml', '.jsp', '.asp', '.aspx', '.py', '.pl', '.rb', '.so', '.dylib', '.app', '.command', '.appimage',
])
const MAX_ZIP_ENTRIES = 10000
const MAX_ZIP_UNCOMPRESSED = 2 * 1024 * 1024 * 1024
const MAX_ZIP_RATIO = 200
const SCAN_LIMIT = 100 * 1024 * 1024

const extOf = (name) => {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i).toLowerCase() : ''
}

/* ------------------------------ acceso a bytes ------------------------------ */

const read = async (file, pos, len) => {
  const end = Math.min(file.size, pos + len)
  if (pos >= end) return new Uint8Array(0)
  return new Uint8Array(await file.slice(pos, end).arrayBuffer())
}
const ascii = (bytes) => String.fromCharCode(...bytes)
const startsWith = (bytes, sig) => sig.every((b, i) => bytes[i] === b)
const u16 = (b, p) => b[p] | (b[p + 1] << 8)
const u32 = (b, p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0
const utf16 = (s) => Array.from(s).flatMap((c) => [c.charCodeAt(0), 0])
const latin1 = (s) => Array.from(s).map((c) => c.charCodeAt(0))

const indexOfSeq = (hay, needle, from = 0) => {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer
    return i
  }
  return -1
}

/** ¿Aparece alguna de las secuencias en el archivo? (lectura por bloques) */
async function containsAny(file, needles, maxBytes = Infinity) {
  const CHUNK = 1024 * 1024
  const overlap = Math.max(...needles.map((n) => n.length)) - 1
  const limit = Math.min(file.size, maxBytes)
  for (let pos = 0; pos < limit; pos += CHUNK) {
    const buf = await read(file, pos, CHUNK + overlap)
    for (const n of needles) if (indexOfSeq(buf, n) >= 0) return true
  }
  return false
}

/* ------------------------------ ejecutables ------------------------------ */

function executableSignature(h) {
  if (startsWith(h, [0x4d, 0x5a])) return 'ejecutable de Windows (PE/MZ)'
  if (startsWith(h, [0x7f, 0x45, 0x4c, 0x46])) return 'ejecutable de Linux (ELF)'
  if (
    startsWith(h, [0xfe, 0xed, 0xfa, 0xce]) || startsWith(h, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWith(h, [0xce, 0xfa, 0xed, 0xfe]) || startsWith(h, [0xcf, 0xfa, 0xed, 0xfe])
  ) return 'ejecutable de macOS (Mach-O)'
  if (startsWith(h, [0xca, 0xfe, 0xba, 0xbe])) return 'binario Java / Mach-O universal'
  if (startsWith(h, [0x23, 0x21])) return 'script (#!)'
  if (startsWith(h, [0x4c, 0, 0, 0, 0x01, 0x14, 0x02, 0])) return 'acceso directo de Windows (.lnk)'
  const text = ascii(h.subarray(0, 512)).trimStart().toLowerCase()
  if (['<?php', '<script', '<!doctype html', '<html', '<svg'].some((t) => text.startsWith(t))) {
    return 'documento web activo (HTML/PHP/JS/SVG)'
  }
  return null
}

/* ------------------------------- ZIP / OOXML ------------------------------- */

async function readZipEntries(file) {
  const tailLen = Math.min(file.size, 66 * 1024)
  const tail = await read(file, file.size - tailLen, tailLen)
  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x05 && tail[i + 3] === 0x06) { eocd = i; break }
  }
  if (eocd < 0) return null
  const total = u16(tail, eocd + 10)
  const cdSize = u32(tail, eocd + 12)
  const cdOffset = u32(tail, eocd + 16)
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return null
  if (cdOffset + cdSize > file.size || total > MAX_ZIP_ENTRIES) return null
  const cd = await read(file, cdOffset, cdSize)
  const entries = []
  let p = 0
  const dec = new TextDecoder('utf-8')
  for (let i = 0; i < total; i++) {
    if (p + 46 > cd.length || u32(cd, p) !== 0x02014b50) return null
    const nameLen = u16(cd, p + 28)
    if (p + 46 + nameLen > cd.length) return null
    entries.push({
      name: dec.decode(cd.subarray(p + 46, p + 46 + nameLen)),
      flags: u16(cd, p + 8),
      uncompressed: u32(cd, p + 24),
    })
    p += 46 + nameLen + u16(cd, p + 30) + u16(cd, p + 32)
  }
  return entries
}

function checkZipEntries(entries, zipSize) {
  let total = 0
  for (const e of entries) {
    const n = e.name.replace(/\\/g, '/')
    if (n.startsWith('/') || /^[a-zA-Z]:/.test(n) || n.split('/').includes('..')) return `contiene una ruta peligrosa (${e.name})`
    if (e.flags & 1) return 'contiene archivos cifrados que no se pueden revisar'
    if (DANGEROUS_ENTRY_EXTS.has(extOf(n))) return `contiene un archivo ejecutable o script (${e.name})`
    total += e.uncompressed
  }
  if (total > MAX_ZIP_UNCOMPRESSED) return 'se descomprime a un tamaño excesivo'
  if (zipSize > 0 && total / zipSize > MAX_ZIP_RATIO) return 'tiene una tasa de compresión sospechosa (posible zip-bomb)'
  return null
}

const OOXML_PREFIX = { docx: 'word/', xlsx: 'xl/', pptx: 'ppt/' }
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PNG_IEND = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]
const OLE_SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

async function verifyKind(kind, file, head) {
  switch (kind) {
    case 'png': {
      if (!startsWith(head, PNG_SIG)) return 'el contenido no es un PNG válido'
      const tail = await read(file, file.size - 12, 12)
      return PNG_IEND.every((b, i) => tail[i] === b) ? null : 'el PNG está corrupto o tiene datos adicionales ocultos'
    }
    case 'jpeg':
      return startsWith(head, [0xff, 0xd8, 0xff]) ? null : 'el contenido no es un JPEG válido'
    case 'webp': {
      if (ascii(head.subarray(0, 4)) !== 'RIFF' || ascii(head.subarray(8, 12)) !== 'WEBP') return 'el contenido no es un WEBP válido'
      return u32(head, 4) + 8 <= file.size ? null : 'el WEBP está corrupto'
    }
    case 'pdf': {
      if (ascii(head.subarray(0, 5)) !== '%PDF-') return 'el contenido no es un PDF válido'
      if (await containsAny(file, [latin1('/JavaScript'), latin1('/Launch')], SCAN_LIMIT)) {
        return 'el PDF contiene JavaScript o acciones de lanzamiento (no permitido)'
      }
      return null
    }
    case 'txt': {
      const sample = await read(file, 0, 1024 * 1024)
      if (sample.includes(0)) return 'el contenido no es texto plano (contiene datos binarios)'
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(sample.subarray(0, Math.max(0, sample.length - 3)))
      } catch {
        if (sample.some((b) => b < 0x09 || (b > 0x0d && b < 0x20))) return 'el contenido no es texto plano'
      }
      return null
    }
    case 'rar':
      return startsWith(head, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]) || startsWith(head, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])
        ? null : 'el contenido no es un RAR válido'
    case 'zip':
    case 'docx':
    case 'xlsx':
    case 'pptx': {
      if (!(head[0] === 0x50 && head[1] === 0x4b && (head[2] === 0x03 || head[2] === 0x05))) return `el contenido no es un ${kind.toUpperCase()} válido`
      const entries = await readZipEntries(file)
      if (!entries) return 'el archivo comprimido está corrupto o usa un formato no soportado (ZIP64)'
      const problem = checkZipEntries(entries, file.size)
      if (problem) return `el archivo comprimido ${problem}`
      if (kind !== 'zip') {
        const names = entries.map((e) => e.name.replace(/\\/g, '/'))
        if (!names.includes('[Content_Types].xml') || !names.some((n) => n.startsWith(OOXML_PREFIX[kind]))) return `no es un documento ${kind.toUpperCase()} genuino`
        if (names.some((n) => /vbaproject\.bin$/i.test(n))) return 'contiene macros (VBA), que no están permitidas'
      }
      return null
    }
    case 'doc':
    case 'xls':
    case 'ppt': {
      if (!startsWith(head, OLE_SIG)) return `el contenido no es un documento ${kind.toUpperCase()} válido`
      const markers = kind === 'doc' ? [utf16('WordDocument')] : kind === 'xls' ? [utf16('Workbook'), utf16('Book')] : [utf16('PowerPoint Document')]
      if (!(await containsAny(file, markers, SCAN_LIMIT))) return `no es un documento ${kind.toUpperCase()} genuino`
      if (await containsAny(file, [utf16('_VBA_PROJECT')], SCAN_LIMIT)) return 'contiene macros (VBA), que no están permitidas'
      return null
    }
    default:
      return 'formato no soportado'
  }
}

/**
 * Verifica que `file` (objeto File) tenga extensión permitida por la política y que su
 * contenido real corresponda a esa extensión.
 * @param {File} file
 * @param {'images'|'pdf'|'library'} policy
 * @returns {Promise<{ok: true, mime: string, kind: string} | {ok: false, reason: string}>}
 */
export async function verifyFileContent(file, policy) {
  const ext = extOf(file.name || '')
  const info = EXT_TO_KIND[ext]
  if (!info || !POLICY_EXTS[policy].includes(ext)) {
    return { ok: false, reason: `formato no permitido (solo ${allowedLabel(policy)})` }
  }
  if (!file.size) return { ok: false, reason: 'el archivo está vacío' }
  try {
    const head = await read(file, 0, 4096)
    const exe = executableSignature(head)
    if (exe) return { ok: false, reason: `el contenido es un ${exe}` }
    const problem = await verifyKind(info.kind, file, head)
    if (problem) return { ok: false, reason: problem }
    return { ok: true, mime: info.mime, kind: info.kind }
  } catch {
    return { ok: false, reason: 'no se pudo leer el archivo para verificarlo' }
  }
}

/**
 * Verifica varios archivos, muestra un toast por cada rechazado y devuelve los válidos.
 * @returns {Promise<{valid: File[], rejected: {file: File, reason: string}[]}>}
 */
export async function filterValidFiles(files, policy, { notify = true } = {}) {
  const valid = []
  const rejected = []
  for (const file of Array.from(files || [])) {
    const res = await verifyFileContent(file, policy)
    if (res.ok) valid.push(file)
    else {
      rejected.push({ file, reason: res.reason })
      if (notify) toast.error(`${file.name}: ${res.reason}.`)
    }
  }
  return { valid, rejected }
}

/**
 * Verifica un único archivo y avisa con un toast si es rechazado.
 * @returns {Promise<boolean>} true si es válido
 */
export async function verifySingleFile(file, policy) {
  const res = await verifyFileContent(file, policy)
  if (!res.ok) toast.error(`${file.name}: ${res.reason}.`)
  return res.ok
}
