/**
 * @jest-environment node
 */
import { verifyFileContent } from '../utils/fileValidation'

jest.mock('react-hot-toast', () => ({ toast: { error: jest.fn() } }))

// El sandbox de jest no expone File: se toma de 'buffer' (Node 20+, con slice().arrayBuffer())
const { File } = require('buffer')
const file = (name, bytes) => new File([bytes], name)
const buf = (...parts) => Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p))))

const PNG = buf(
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(20, 1),
  Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])
)
const JPEG = buf(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20), Buffer.from([0xff, 0xd9]))
const PDF = buf('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF')
const PDF_JS = buf('%PDF-1.4\n<</S/JavaScript /JavaScript (x)>>\n%%EOF')
const EXE = buf('MZ', Buffer.alloc(100, 0x90))
const TXT = buf('Hola mundo áéí\n')

function zip(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const e of entries) {
    const name = Buffer.from(e.name)
    const data = Buffer.from('x')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(e.flags || 0, 6)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, data)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0)
    c.writeUInt16LE(e.flags || 0, 8)
    c.writeUInt32LE(1, 20)
    c.writeUInt32LE(1, 24)
    c.writeUInt16LE(name.length, 28)
    c.writeUInt32LE(offset, 42)
    centrals.push(c, name)
    offset += 30 + name.length + data.length
  }
  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, eocd])
}
const DOCX = zip([{ name: '[Content_Types].xml' }, { name: 'word/document.xml' }])

describe('verifyFileContent (frontend)', () => {
  test.each([
    ['a.png', PNG, 'images'], ['a.jpg', JPEG, 'images'], ['a.pdf', PDF, 'pdf'], ['a.pdf', PDF, 'library'],
    ['a.txt', TXT, 'library'], ['a.zip', zip([{ name: 'r.txt' }]), 'library'], ['a.docx', DOCX, 'library'],
  ])('acepta %s (%s)', async (name, bytes, policy) => {
    expect((await verifyFileContent(file(name, bytes), policy)).ok).toBe(true)
  })

  test.each([
    ['exe como pdf', 'a.pdf', EXE, 'library'],
    ['exe como png', 'a.png', EXE, 'images'],
    ['png como jpg', 'a.jpg', PNG, 'images'],
    ['pdf como png', 'a.png', PDF, 'images'],
    ['pdf con javascript', 'a.pdf', PDF_JS, 'library'],
    ['png con datos ocultos al final', 'a.png', buf(PNG, '<?php evil ?>'), 'images'],
    ['zip como docx', 'a.docx', zip([{ name: 'r.txt' }]), 'library'],
    ['zip con exe', 'a.zip', zip([{ name: 'setup.exe' }]), 'library'],
    ['zip-slip', 'a.zip', zip([{ name: '../../x' }]), 'library'],
    ['zip cifrado', 'a.zip', zip([{ name: 'a.txt', flags: 1 }]), 'library'],
    ['pdf en política de imágenes', 'a.pdf', PDF, 'images'],
    ['extensión .exe', 'a.exe', PDF, 'library'],
    ['extensión .svg', 'a.svg', buf('<svg/>'), 'images'],
    ['archivo vacío', 'a.pdf', Buffer.alloc(0), 'library'],
  ])('rechaza %s', async (_d, name, bytes, policy) => {
    expect((await verifyFileContent(file(name, bytes), policy)).ok).toBe(false)
  })
})
