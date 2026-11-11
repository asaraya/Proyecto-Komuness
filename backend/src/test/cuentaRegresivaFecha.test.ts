import { describe, expect, test } from '@jest/globals';
import { construirFechaObjetivo, finDelDiaCR } from '../utils/cuentaRegresiva';

describe('Cuenta regresiva: fechas en hora de Costa Rica', () => {
    test('fecha y hora se interpretan en -06:00', () => {
        expect(construirFechaObjetivo('2026-12-14', '19:00')!.toISOString()).toBe('2026-12-15T01:00:00.000Z');
    });

    test('sin hora usa 00:00 CR', () => {
        expect(construirFechaObjetivo('2026-12-14', '')!.toISOString()).toBe('2026-12-14T06:00:00.000Z');
        expect(construirFechaObjetivo('2026-12-14')!.toISOString()).toBe('2026-12-14T06:00:00.000Z');
    });

    test('inválidos devuelven null', () => {
        for (const f of ['', '14/12/2026', '2026-13-01', '2026-02-30', undefined, 42]) {
            expect(construirFechaObjetivo(f as any, '10:00')).toBeNull();
        }
        expect(construirFechaObjetivo('2026-12-14', '25:00')).toBeNull();
        expect(construirFechaObjetivo('2026-12-14', '7pm')).toBeNull();
    });

    test('finDelDiaCR devuelve 23:59:59.999 del día CR', () => {
        // 2026-12-15T01:00Z es 14 dic 19:00 en CR
        expect(finDelDiaCR(new Date('2026-12-15T01:00:00Z')).toISOString()).toBe('2026-12-15T05:59:59.999Z');
        // 2026-12-14T06:00Z es 14 dic 00:00 en CR
        expect(finDelDiaCR(new Date('2026-12-14T06:00:00Z')).toISOString()).toBe('2026-12-15T05:59:59.999Z');
    });
});
