import { describe, expect, test, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';

jest.setTimeout(30000);
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelUsuario } from '../models/usuario.model';
import { modelPublicacion } from '../models/publicacion.model';
import { modelCategoria } from '../models/categoria.model';
import { modelCuentaRegresiva } from '../models/cuentaRegresiva.model';
import { construirFechaObjetivo } from '../utils/cuentaRegresiva';
import { sincronizarCuentaRegresivaDeEvento } from '../services/cuentaRegresiva.service';
import { crearUsuarioConToken, crearCategoria } from './helpers/testData';
import { PNG } from './helpers/fakeFiles';

const fechaEnDias = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

describe('Cuenta regresiva ligada a eventos', () => {
    const usuarios: string[] = [];
    let adminAuth: string;
    let basicoAuth: string;
    let autorizadoAuth: string;
    let categoriaId: string;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        const admin = await crearUsuarioConToken(1);
        const basico = await crearUsuarioConToken(2);
        const autorizado = await crearUsuarioConToken(2);
        await modelUsuario.findByIdAndUpdate(autorizado.usuario._id, { puedeCrearCuentaRegresiva: true });
        adminAuth = admin.auth;
        basicoAuth = basico.auth;
        autorizadoAuth = autorizado.auth;
        usuarios.push(String(admin.usuario._id), String(basico.usuario._id), String(autorizado.usuario._id));
        categoriaId = String((await crearCategoria())._id);
    });

    beforeEach(async () => {
        await modelCuentaRegresiva.deleteMany({ creadoPor: { $in: usuarios } });
    });

    afterAll(async () => {
        await modelCuentaRegresiva.deleteMany({ creadoPor: { $in: usuarios } });
        await modelPublicacion.deleteMany({ autor: { $in: usuarios } });
        await modelUsuario.deleteMany({ _id: { $in: usuarios } });
        await modelCategoria.findByIdAndDelete(categoriaId);
        await mongoose.connection.close();
    });

    const crearEvento = (auth: string, extra: Record<string, unknown> = {}) =>
        request(app)
            .post('/api/publicaciones/')
            .set('Authorization', auth)
            .send({
                titulo: 'Concierto en nuestra sede',
                contenido: 'c',
                contenidoBreve: 'c',
                fecha: new Date().toISOString(),
                tag: 'evento',
                publicado: true,
                categoria: categoriaId,
                precio: 0,
                fechaEvento: fechaEnDias(10),
                horaEvento: '19:00',
                ...extra,
            });

    test('admin con la casilla crea el contador ligado al evento', async () => {
        const res = await crearEvento(adminAuth, { mostrarCuentaRegresiva: 'true' });
        expect(res.status).toBe(201);
        const cuentas = await modelCuentaRegresiva.find({ creadoPor: { $in: usuarios } }).lean();
        expect(cuentas).toHaveLength(1);
        expect(String(cuentas[0].publicacion)).toBe(String(res.body._id));
        expect(cuentas[0].titulo).toBe('Concierto en nuestra sede');
        expect(cuentas[0].fechaObjetivo.getTime()).toBe(construirFechaObjetivo(fechaEnDias(10), '19:00')!.getTime());
    });

    test('básico sin permiso que manda la casilla: evento sí, contador no', async () => {
        const res = await crearEvento(basicoAuth, { mostrarCuentaRegresiva: 'true', publicado: false });
        expect(res.status).toBe(201);
        expect(await modelCuentaRegresiva.countDocuments({ creadoPor: { $in: usuarios } })).toBe(0);
    });

    test('sin la casilla no se crea contador', async () => {
        const res = await crearEvento(adminAuth);
        expect(res.status).toBe(201);
        expect(await modelCuentaRegresiva.countDocuments({ creadoPor: { $in: usuarios } })).toBe(0);
    });

    test('fecha pasada o inválida: evento sí, contador no', async () => {
        const pasada = await crearEvento(adminAuth, { mostrarCuentaRegresiva: 'true', fechaEvento: fechaEnDias(-3) });
        expect(pasada.status).toBe(201);
        const invalida = await crearEvento(adminAuth, { mostrarCuentaRegresiva: 'true', fechaEvento: 'pronto' });
        expect(invalida.status).toBe(201);
        expect(await modelCuentaRegresiva.countDocuments({ creadoPor: { $in: usuarios } })).toBe(0);
    });

    test('editar la fecha del evento actualiza el contador; borrarlo lo elimina', async () => {
        const res = await crearEvento(adminAuth, { mostrarCuentaRegresiva: 'true' });
        const id = res.body._id;

        const put = await request(app)
            .put(`/api/publicaciones/${id}`)
            .set('Authorization', adminAuth)
            .send({ fechaEvento: fechaEnDias(20), horaEvento: '08:30', titulo: 'Concierto (nueva fecha)' });
        expect(put.status).toBe(200);
        const cuenta = await modelCuentaRegresiva.findOne({ publicacion: id }).lean();
        expect(cuenta!.fechaObjetivo.getTime()).toBe(construirFechaObjetivo(fechaEnDias(20), '08:30')!.getTime());
        expect(cuenta!.titulo).toBe('Concierto (nueva fecha)');

        const del = await request(app).delete(`/api/publicaciones/${id}`).set('Authorization', adminAuth);
        expect(del.status).toBe(200);
        expect(await modelCuentaRegresiva.countDocuments({ publicacion: id })).toBe(0);
    });

    test('ruta /v2: un solo contador y ligado al evento, no a la publicación automática', async () => {
        const res = await request(app)
            .post('/api/publicaciones/v2')
            .set('Authorization', adminAuth)
            .field('titulo', 'Evento v2')
            .field('contenido', 'c')
            .field('contenidoBreve', 'c')
            .field('fecha', new Date().toISOString())
            .field('tag', 'evento')
            .field('publicado', 'true')
            .field('categoria', categoriaId)
            .field('precio', '1000')
            .field('fechaEvento', fechaEnDias(7))
            .field('horaEvento', '10:00')
            .field('mostrarCuentaRegresiva', 'true')
            .attach('imagenes', PNG, { filename: 'a.png', contentType: 'image/png' });
        expect(res.status).toBe(201);
        const cuentas = await modelCuentaRegresiva.find({ creadoPor: { $in: usuarios } }).lean();
        expect(cuentas).toHaveLength(1);
        expect(String(cuentas[0].publicacion)).toBe(String(res.body._id));
    });

    test('POST /cuentas-regresivas/evento/:id activa el contador de un evento existente', async () => {
        const evento = await crearEvento(autorizadoAuth, { publicado: false });
        const otro = await crearEvento(adminAuth);

        const ajeno = await request(app)
            .post(`/api/cuentas-regresivas/evento/${otro.body._id}`)
            .set('Authorization', autorizadoAuth);
        expect(ajeno.status).toBe(403);

        const propio = await request(app)
            .post(`/api/cuentas-regresivas/evento/${evento.body._id}`)
            .set('Authorization', autorizadoAuth);
        expect(propio.status).toBe(201);
        const repetido = await request(app)
            .post(`/api/cuentas-regresivas/evento/${evento.body._id}`)
            .set('Authorization', autorizadoAuth);
        expect(repetido.status).toBe(200);
        expect(await modelCuentaRegresiva.countDocuments({ publicacion: evento.body._id })).toBe(1);

        // Pendiente de aprobación: no aparece en la principal.
        const activas = await request(app).get('/api/cuentas-regresivas/activas');
        expect(activas.body.data.some((c: any) => c.publicacion?._id === evento.body._id)).toBe(false);
    });
    test('si la publicación deja de ser un evento válido, su contador se elimina', async () => {
        const res = await crearEvento(adminAuth, { mostrarCuentaRegresiva: 'true' });
        const id = res.body._id;
        expect(await modelCuentaRegresiva.countDocuments({ publicacion: id })).toBe(1);

        const r = await sincronizarCuentaRegresivaDeEvento(
            { _id: id, tag: 'publicacion', titulo: 'x', fechaEvento: fechaEnDias(10), horaEvento: '19:00' },
            { crearSiNoExiste: false }
        );
        expect(r).toBe('eliminada');
        expect(await modelCuentaRegresiva.countDocuments({ publicacion: id })).toBe(0);

        const res2 = await crearEvento(adminAuth, { mostrarCuentaRegresiva: 'true' });
        await sincronizarCuentaRegresivaDeEvento(
            { _id: res2.body._id, tag: 'evento', titulo: 'x', fechaEvento: '' },
            { crearSiNoExiste: false }
        );
        expect(await modelCuentaRegresiva.countDocuments({ publicacion: res2.body._id })).toBe(0);
    });

    test('el autor del evento ve y puede quitar el contador aunque lo haya activado un admin', async () => {
        const evento = await crearEvento(autorizadoAuth, { publicado: false });
        const activar = await request(app)
            .post(`/api/cuentas-regresivas/evento/${evento.body._id}`)
            .set('Authorization', adminAuth);
        expect(activar.status).toBe(201);

        const lista = await request(app).get('/api/cuentas-regresivas').set('Authorization', autorizadoAuth);
        const ids = lista.body.data.map((c: any) => String(c.publicacion?._id));
        expect(ids).toContain(String(evento.body._id));

        const quitar = await request(app)
            .delete(`/api/cuentas-regresivas/${activar.body.data._id}`)
            .set('Authorization', autorizadoAuth);
        expect(quitar.status).toBe(200);
    });

    test('un usuario autorizado no ve ni borra contadores de eventos ajenos', async () => {
        const ajeno = await crearEvento(adminAuth, { mostrarCuentaRegresiva: 'true' });
        const cuenta = await modelCuentaRegresiva.findOne({ publicacion: ajeno.body._id }).lean();
        const lista = await request(app).get('/api/cuentas-regresivas').set('Authorization', autorizadoAuth);
        expect(lista.body.data.some((c: any) => String(c._id) === String(cuenta!._id))).toBe(false);
        const del = await request(app).delete(`/api/cuentas-regresivas/${cuenta!._id}`).set('Authorization', autorizadoAuth);
        expect(del.status).toBe(403);
    });
});
