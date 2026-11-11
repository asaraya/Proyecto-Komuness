import { describe, expect, test, beforeAll } from '@jest/globals';
import { modelCategoria } from '../models/categoria.model';
import { connectBD } from '../utils/mongodb';

describe('Modelo Categoria', () => {
    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
    });

    test('Crea y lista una categoría', async () => {
        const nombre = `Danza ${Date.now()}`;
        const categoria = await modelCategoria.create({ nombre });

        const categorias = await modelCategoria.find({ nombre });
        expect(categorias).toHaveLength(1);
        expect(String(categorias[0]._id)).toBe(String(categoria._id));

        await modelCategoria.findByIdAndDelete(categoria._id);
    });

    test('No permite categorías sin nombre', async () => {
        await expect(modelCategoria.create({})).rejects.toThrow();
    });
});
