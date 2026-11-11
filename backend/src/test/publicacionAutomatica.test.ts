// BKD38: cada evento/emprendimiento genera una publicación automática que
// se aprueba o se rechaza junto con su original.
import { describe, expect, test, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelPublicacion } from '../models/publicacion.model';
import { crearUsuarioConToken, crearCategoria } from './helpers/testData';

jest.setTimeout(30000);

// PNG de 1x1 completo (el backend revisa la firma y que el archivo termine en IEND).
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
);

describe('Publicación automática de eventos y emprendimientos (BKD38)', () => {
    let auth: string;
    let categoriaId: string;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        ({ auth } = await crearUsuarioConToken(0));
        categoriaId = (await crearCategoria())._id.toString();
    });

    const crear = (tag: 'evento' | 'emprendimiento' | 'publicacion', titulo: string) => {
        const req = request(app)
            .post('/api/publicaciones/v2')
            .set('Authorization', auth)
            .field('titulo', titulo)
            .field('contenido', 'Contenido de prueba')
            .field('contenidoBreve', 'Breve')
            .field('fecha', new Date().toISOString())
            .field('tag', tag)
            .field('publicado', 'false')
            .field('categoria', categoriaId)
            .field('comunidad', 'San Carlos')
            .attach('imagenes', PNG, { filename: 'a.png', contentType: 'image/png' });
        if (tag !== 'publicacion') req.field('precio', '1000');
        if (tag === 'evento') req.field('fechaEvento', '2099-01-01').field('horaEvento', '10:00');
        return req;
    };

    test.each(['evento', 'emprendimiento'] as const)('Crear %s genera su publicación', async (tag) => {
        const res = await crear(tag, `Original ${tag} ${Date.now()}`);
        expect(res.status).toBe(201);

        const copia = await modelPublicacion.findOne({ publicacionOrigenId: res.body._id }).lean();
        expect(copia).not.toBeNull();
        expect(copia?.tag).toBe('publicacion');
        expect(copia?.titulo).toBe(res.body.titulo);
        expect(copia?.adjunto?.[0]?.key).not.toBe(res.body.adjunto?.[0]?.key);
    });

    test('Crear una publicación normal no genera copia', async () => {
        const res = await crear('publicacion', `Normal ${Date.now()}`);
        expect(res.status).toBe(201);
        expect(await modelPublicacion.countDocuments({ publicacionOrigenId: res.body._id })).toBe(0);
    });

    test('Aprobar el original aprueba también su publicación', async () => {
        const res = await crear('evento', `Aprobar ${Date.now()}`);
        const aprobar = await request(app)
            .put(`/api/publicaciones/${res.body._id}`)
            .set('Authorization', auth)
            .send({ publicado: true });
        expect(aprobar.status).toBe(200);

        const copia = await modelPublicacion.findOne({ publicacionOrigenId: res.body._id }).lean();
        expect(copia?.publicado).toBe(true);
    });

    test('Rechazar el original borra también su publicación pendiente', async () => {
        const res = await crear('emprendimiento', `Rechazar ${Date.now()}`);
        const rechazar = await request(app)
            .delete(`/api/publicaciones/${res.body._id}`)
            .set('Authorization', auth);
        expect(rechazar.status).toBe(200);

        expect(await modelPublicacion.countDocuments({ publicacionOrigenId: res.body._id })).toBe(0);
    });

    test('Borrar un original ya publicado no toca su publicación', async () => {
        const res = await crear('evento', `Publicado ${Date.now()}`);
        await request(app)
            .put(`/api/publicaciones/${res.body._id}`)
            .set('Authorization', auth)
            .send({ publicado: true });
        await request(app)
            .delete(`/api/publicaciones/${res.body._id}`)
            .set('Authorization', auth);

        expect(await modelPublicacion.countDocuments({ publicacionOrigenId: res.body._id })).toBe(1);
    });
});
