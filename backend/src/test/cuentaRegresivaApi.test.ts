import { describe, expect, test, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';

jest.setTimeout(30000);
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelUsuario } from '../models/usuario.model';
import { modelPublicacion } from '../models/publicacion.model';
import { modelCuentaRegresiva } from '../models/cuentaRegresiva.model';
import { crearUsuarioConToken, crearCategoria } from './helpers/testData';
import { modelCategoria } from '../models/categoria.model';

const DIA = 24 * 60 * 60 * 1000;
const enDias = (n: number) => new Date(Date.now() + n * DIA);
// /activas es global: otras suites corren en paralelo, así que solo se miran los de esta.
const PROPIOS = ['inactivo', 'vencido', 'pendiente', 'evento ok', 'libre ok', 'hoy', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];
const titulosPropios = (data: any[]) => data.map((c) => c.titulo).filter((t) => PROPIOS.includes(t));

describe('API /api/cuentas-regresivas', () => {
    const usuarios: string[] = [];
    const publicaciones: string[] = [];
    let adminAuth: string;
    let adminId: string;
    let basicoAuth: string; // sin permiso
    let autorizadoAuth: string; // básico con permiso
    let autorizadoId: string;
    let categoriaId: string;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        const admin = await crearUsuarioConToken(1);
        const basico = await crearUsuarioConToken(2);
        const autorizado = await crearUsuarioConToken(2);
        await modelUsuario.findByIdAndUpdate(autorizado.usuario._id, { puedeCrearCuentaRegresiva: true });
        adminAuth = admin.auth;
        adminId = String(admin.usuario._id);
        basicoAuth = basico.auth;
        autorizadoAuth = autorizado.auth;
        autorizadoId = String(autorizado.usuario._id);
        usuarios.push(adminId, String(basico.usuario._id), autorizadoId);
        categoriaId = String((await crearCategoria())._id);
    });

    beforeEach(async () => {
        await modelCuentaRegresiva.deleteMany({ creadoPor: { $in: usuarios } });
    });

    afterAll(async () => {
        await modelCuentaRegresiva.deleteMany({ creadoPor: { $in: usuarios } });
        await modelPublicacion.deleteMany({ _id: { $in: publicaciones } });
        await modelUsuario.deleteMany({ _id: { $in: usuarios } });
        await modelCategoria.findByIdAndDelete(categoriaId);
        await mongoose.connection.close();
    });

    const crearEvento = async (publicado: boolean) => {
        const pub = await modelPublicacion.create({
            titulo: 'Evento test',
            contenido: 'c',
            contenidoBreve: 'c',
            autor: adminId,
            fecha: new Date().toISOString(),
            tag: 'evento',
            publicado,
            categoria: categoriaId,
        });
        publicaciones.push(String(pub._id));
        return pub;
    };

    describe('GET /activas', () => {
        test('excluye inactivos, vencidos y eventos sin publicar', async () => {
            const sinPublicar = await crearEvento(false);
            const publicado = await crearEvento(true);
            await modelCuentaRegresiva.create([
                { titulo: 'inactivo', fechaObjetivo: enDias(3), creadoPor: adminId, activo: false },
                { titulo: 'vencido', fechaObjetivo: enDias(-2), creadoPor: adminId },
                { titulo: 'pendiente', fechaObjetivo: enDias(4), creadoPor: adminId, publicacion: sinPublicar._id },
                { titulo: 'evento ok', fechaObjetivo: enDias(5), creadoPor: adminId, publicacion: publicado._id },
                { titulo: 'libre ok', fechaObjetivo: enDias(2), creadoPor: adminId, enlace: 'https://komuness.cr' },
            ]);

            const res = await request(app).get('/api/cuentas-regresivas/activas');
            expect(res.status).toBe(200);
            expect(titulosPropios(res.body.data)).toEqual(['libre ok', 'evento ok']);
            const evento = res.body.data.find((c: any) => c.titulo === 'evento ok');
            expect(evento.publicacion._id).toBe(String(publicado._id));
            expect(evento.publicacion.tag).toBe('evento');
            expect(evento.creadoPor).toBeUndefined();
        });

        test('sigue visible el mismo día después de la hora objetivo', async () => {
            // Hace 1 minuto: en hora CR sigue siendo el mismo día salvo justo a medianoche.
            const haceUnMinuto = new Date(Date.now() - 60 * 1000);
            await modelCuentaRegresiva.create({ titulo: 'hoy', fechaObjetivo: haceUnMinuto, creadoPor: adminId });
            const res = await request(app).get('/api/cuentas-regresivas/activas');
            expect(titulosPropios(res.body.data)).toEqual(['hoy']);
        });

        test('máximo 4, en orden por fecha', async () => {
            await modelCuentaRegresiva.create(
                [6, 2, 5, 1, 4, 3].map((d) => ({ titulo: `d${d}`, fechaObjetivo: enDias(d), creadoPor: adminId }))
            );
            const res = await request(app).get('/api/cuentas-regresivas/activas');
            expect(titulosPropios(res.body.data)).toEqual(['d1', 'd2', 'd3', 'd4']);
            expect(res.body.data).toHaveLength(4);
        });
    });

    describe('gestión', () => {
        test('sin permiso → 403', async () => {
            const res = await request(app)
                .post('/api/cuentas-regresivas')
                .set('Authorization', basicoAuth)
                .send({ titulo: 'x', fechaObjetivo: enDias(3).toISOString() });
            expect(res.status).toBe(403);
            const lista = await request(app).get('/api/cuentas-regresivas').set('Authorization', basicoAuth);
            expect(lista.status).toBe(403);
        });

        test('sin sesión → 401', async () => {
            const res = await request(app).post('/api/cuentas-regresivas').send({ titulo: 'x' });
            expect(res.status).toBe(401);
        });

        test('autorizado crea un contador libre', async () => {
            const res = await request(app)
                .post('/api/cuentas-regresivas')
                .set('Authorization', autorizadoAuth)
                .send({ titulo: '  Concierto en nuestra sede  ', fechaObjetivo: enDias(3).toISOString(), enlace: 'https://komuness.cr/x' });
            expect(res.status).toBe(201);
            expect(res.body.data.titulo).toBe('Concierto en nuestra sede');
            expect(String(res.body.data.creadoPor)).toBe(autorizadoId);
        });

        test('validaciones de creación', async () => {
            const casos = [
                { titulo: '', fechaObjetivo: enDias(3).toISOString() },
                { titulo: 'x'.repeat(121), fechaObjetivo: enDias(3).toISOString() },
                { titulo: 'x', fechaObjetivo: 'mañana' },
                { titulo: 'x', fechaObjetivo: enDias(-1).toISOString() },
                { titulo: 'x', fechaObjetivo: enDias(3).toISOString(), enlace: 'javascript:alert(1)' },
            ];
            for (const body of casos) {
                const res = await request(app).post('/api/cuentas-regresivas').set('Authorization', autorizadoAuth).send(body);
                expect(res.status).toBe(400);
            }
        });

        test('lista: admin ve todos, autorizado solo los suyos', async () => {
            await modelCuentaRegresiva.create([
                { titulo: 'del admin', fechaObjetivo: enDias(3), creadoPor: adminId },
                { titulo: 'mío', fechaObjetivo: enDias(4), creadoPor: autorizadoId },
            ]);
            const admin = await request(app).get('/api/cuentas-regresivas').set('Authorization', adminAuth);
            expect(admin.body.data.map((c: any) => c.titulo)).toEqual(expect.arrayContaining(['del admin', 'mío']));
            const propio = await request(app).get('/api/cuentas-regresivas').set('Authorization', autorizadoAuth);
            expect(propio.body.data.map((c: any) => c.titulo)).toEqual(['mío']);
        });

        test('no se edita ni borra un contador ajeno; admin sí', async () => {
            const ajeno = await modelCuentaRegresiva.create({ titulo: 'ajeno', fechaObjetivo: enDias(3), creadoPor: adminId });
            const put = await request(app)
                .put(`/api/cuentas-regresivas/${ajeno._id}`)
                .set('Authorization', autorizadoAuth)
                .send({ activo: false });
            expect(put.status).toBe(403);
            const del = await request(app).delete(`/api/cuentas-regresivas/${ajeno._id}`).set('Authorization', autorizadoAuth);
            expect(del.status).toBe(403);

            const mio = await modelCuentaRegresiva.create({ titulo: 'del autorizado', fechaObjetivo: enDias(3), creadoPor: autorizadoId });
            const putAdmin = await request(app)
                .put(`/api/cuentas-regresivas/${mio._id}`)
                .set('Authorization', adminAuth)
                .send({ activo: false, titulo: 'nuevo' });
            expect(putAdmin.status).toBe(200);
            expect(putAdmin.body.data.activo).toBe(false);
            expect(putAdmin.body.data.titulo).toBe('nuevo');
            const delAdmin = await request(app).delete(`/api/cuentas-regresivas/${mio._id}`).set('Authorization', adminAuth);
            expect(delAdmin.status).toBe(200);
            expect(await modelCuentaRegresiva.findById(mio._id)).toBeNull();
        });

        test('la fecha de un contador ligado a evento no se edita a mano', async () => {
            const evento = await crearEvento(true);
            const original = enDias(5);
            const c = await modelCuentaRegresiva.create({ titulo: 'e', fechaObjetivo: original, creadoPor: adminId, publicacion: evento._id });
            const res = await request(app)
                .put(`/api/cuentas-regresivas/${c._id}`)
                .set('Authorization', adminAuth)
                .send({ fechaObjetivo: enDias(9).toISOString() });
            expect(res.status).toBe(400);
            const actual = await modelCuentaRegresiva.findById(c._id);
            expect(actual!.fechaObjetivo.getTime()).toBe(original.getTime());
        });
    });
});
