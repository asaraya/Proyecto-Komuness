import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import express from 'express';
import multer from 'multer';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { secureUploads } from '../utils/uploadSecurity';
import * as F from './helpers/fakeFiles';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-sec-'));
const upload = multer({ dest: dir });
const left = () => fs.readdirSync(dir);

const app = express();
app.post('/ok', upload.array('archivos'), secureUploads('library'), (_req, res) => { res.json({ ok: true }); });
// controlador que rechaza DESPUÉS de que multer guardó (validación de negocio)
app.post('/business-400', upload.array('archivos'), secureUploads('library'), (_req, res) => { res.status(400).json({ ok: false }); });
app.post('/business-404', upload.array('archivos'), secureUploads('library'), (_req, res) => { res.status(404).json({ ok: false }); });
app.post('/boom', upload.array('archivos'), secureUploads('library'), (_req, res) => { res.status(500).json({ ok: false }); });
app.post('/images', upload.single('f'), secureUploads('images'), (_req, res) => { res.json({ ok: true }); });

const waitClean = async (expected: number) => {
  for (let i = 0; i < 40 && left().length !== expected; i++) await new Promise(r => setTimeout(r, 25));
  return left().length;
};

beforeEach(() => { left().forEach(f => fs.unlinkSync(path.join(dir, f))); });
afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('secureUploads', () => {
  test('archivo válido se conserva', async () => {
    await request(app).post('/ok').attach('archivos', F.PDF, 'a.pdf').expect(200);
    expect(left().length).toBe(1);
  });

  test('exe disfrazado de pdf: 400 y NADA queda en disco', async () => {
    const res = await request(app).post('/ok').attach('archivos', F.EXE, { filename: 'a.pdf', contentType: 'application/pdf' }).expect(400);
    expect(res.body.errorCode).toBe('INVALID_FILE_CONTENT');
    expect(await waitClean(0)).toBe(0);
  });

  test('lote con un archivo malo: se borran también los buenos', async () => {
    await request(app).post('/ok')
      .attach('archivos', F.PDF, 'bueno.pdf')
      .attach('archivos', F.EXE, { filename: 'malo.pdf', contentType: 'application/pdf' })
      .expect(400);
    expect(await waitClean(0)).toBe(0);
  });

  test('extensión no permitida (multer fileFilter ausente): 400 y sin archivos', async () => {
    await request(app).post('/ok').attach('archivos', F.EXE, { filename: 'a.exe', contentType: 'application/x-msdownload' }).expect(400);
    expect(await waitClean(0)).toBe(0);
  });

  test.each(['/business-400', '/business-404', '/boom'])('error del controlador en %s borra los archivos', async (route) => {
    await request(app).post(route).attach('archivos', F.PDF, 'a.pdf');
    expect(await waitClean(0)).toBe(0);
  });

  test('política images rechaza un PDF válido', async () => {
    await request(app).post('/images').attach('f', F.PDF, 'a.pdf').expect(400);
    expect(await waitClean(0)).toBe(0);
  });
});
