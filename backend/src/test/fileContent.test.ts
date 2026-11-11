import { describe, test, expect } from '@jest/globals';
import { verifyFileContent } from '../utils/fileContent';
import * as F from './helpers/fakeFiles';

const check = (originalname: string, buffer: Buffer, policy: 'images' | 'pdf' | 'library' = 'library') =>
  verifyFileContent({ originalname, buffer }, policy);

describe('verifyFileContent - archivos legítimos', () => {
  const valid: [string, Buffer][] = [
    ['a.pdf', F.PDF], ['a.png', F.PNG], ['a.jpg', F.JPEG], ['a.jpeg', F.JPEG], ['a.webp', F.WEBP],
    ['a.txt', F.TXT], ['a.zip', F.ZIP], ['a.docx', F.DOCX], ['a.xlsx', F.XLSX], ['a.pptx', F.PPTX],
    ['a.doc', F.DOC], ['a.xls', F.XLS], ['a.ppt', F.PPT], ['a.rar', F.RAR], ['A.PDF', F.PDF],
  ];
  test.each(valid)('acepta %s', async (name, buf) => {
    expect((await check(name, buf)).ok).toBe(true);
  });
});

describe('verifyFileContent - contenido que no coincide con la extensión', () => {
  const bad: [string, string, Buffer][] = [
    ['exe como .pdf', 'a.pdf', F.EXE], ['exe como .png', 'a.png', F.EXE], ['exe como .docx', 'a.docx', F.EXE],
    ['elf como .txt', 'a.txt', F.ELF], ['script como .txt', 'a.txt', F.SCRIPT], ['html como .txt', 'a.txt', F.HTML],
    ['png como .jpg', 'a.jpg', F.PNG], ['jpg como .png', 'a.png', F.JPEG], ['pdf como .png', 'a.png', F.PDF],
    ['txt como .pdf', 'a.pdf', F.TXT], ['txt como .zip', 'a.zip', F.TXT], ['zip como .docx', 'a.docx', F.ZIP],
    ['xlsx como .docx', 'a.docx', F.XLSX], ['docx como .xlsx', 'a.xlsx', F.DOCX], ['doc como .xls', 'a.xls', F.DOC],
    ['zip como .rar', 'a.rar', F.ZIP], ['rar como .zip', 'a.zip', F.RAR], ['basura como .webp', 'a.webp', Buffer.from('RIFFxxxxNOPE0000')],
    ['vacío', 'a.pdf', Buffer.alloc(0)],
  ];
  test.each(bad)('rechaza %s', async (_d, name, buf) => {
    expect((await check(name, buf)).ok).toBe(false);
  });
});

describe('verifyFileContent - contenido activo / peligroso', () => {
  test('rechaza PDF con JavaScript', async () => expect((await check('a.pdf', F.PDF_JS)).ok).toBe(false));
  test('rechaza PNG con datos añadidos tras IEND', async () =>
    expect((await check('a.png', Buffer.concat([F.PNG, Buffer.from('<?php system($_GET[0]); ?>')]))).ok).toBe(false));
  test('rechaza docx con macros', async () => expect((await check('a.docx', F.DOCX_MACRO)).ok).toBe(false));
  test('rechaza doc con macros', async () => expect((await check('a.doc', F.DOC_MACRO)).ok).toBe(false));
  test('rechaza zip con ejecutable dentro', async () =>
    expect((await check('a.zip', F.makeZip([{ name: 'ok.txt' }, { name: 'setup.exe' }]))).ok).toBe(false));
  test('rechaza zip con script dentro', async () =>
    expect((await check('a.zip', F.makeZip([{ name: 'x/run.ps1' }]))).ok).toBe(false));
  test('rechaza zip-slip', async () =>
    expect((await check('a.zip', F.makeZip([{ name: '../../etc/cron.d/x' }]))).ok).toBe(false));
  test('rechaza zip cifrado', async () =>
    expect((await check('a.zip', F.makeZip([{ name: 'a.txt', flags: 1 }]))).ok).toBe(false));
  test('rechaza zip-bomb', async () =>
    expect((await check('a.zip', F.makeZip([{ name: 'big.txt', fakeUncompressed: 1_500_000_000 }]))).ok).toBe(false));
});

describe('verifyFileContent - política por tipo de subida', () => {
  test('imágenes: no acepta PDF ni ZIP', async () => {
    expect((await check('a.pdf', F.PDF, 'images')).ok).toBe(false);
    expect((await check('a.zip', F.ZIP, 'images')).ok).toBe(false);
    expect((await check('a.png', F.PNG, 'images')).ok).toBe(true);
  });
  test('cv: solo PDF', async () => {
    expect((await check('a.png', F.PNG, 'pdf')).ok).toBe(false);
    expect((await check('a.pdf', F.PDF, 'pdf')).ok).toBe(true);
  });
  test('extensiones no permitidas', async () => {
    for (const n of ['a.exe', 'a.svg', 'a.html', 'a.js', 'a.sh', 'a.php', 'a.pdf.exe', 'a'])
      expect((await check(n, F.PDF)).ok).toBe(false);
  });
  test('devuelve el MIME real', async () => {
    const r = await check('a.jpg', F.JPEG);
    expect(r.ok && r.mime).toBe('image/jpeg');
  });
});
