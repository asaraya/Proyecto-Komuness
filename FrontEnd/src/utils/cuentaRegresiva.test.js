import { calcularRestante, formatearFechaCR, textoCorto, fechaHoraCRaISO } from "./cuentaRegresiva";

const OBJETIVO = "2026-12-15T01:00:00Z"; // lunes 14 dic, 7:00 p. m. en CR

test("calcula días, horas y minutos restantes", () => {
  expect(calcularRestante(OBJETIVO, Date.parse("2026-12-02T22:30:00Z"))).toEqual({
    dias: 12,
    horas: 2,
    minutos: 30,
    esHoy: false,
    terminado: false,
  });
});

test("redondea hacia arriba los segundos sueltos para no mostrar 0 min antes de tiempo", () => {
  const r = calcularRestante(OBJETIVO, Date.parse("2026-12-15T00:59:30Z"));
  expect(r).toMatchObject({ dias: 0, horas: 0, minutos: 1, esHoy: false });
});

test("pasada la hora es 'hoy' hasta el fin del día CR, luego terminado", () => {
  expect(calcularRestante(OBJETIVO, Date.parse("2026-12-15T02:00:00Z"))).toMatchObject({
    esHoy: true,
    terminado: false,
  });
  expect(calcularRestante(OBJETIVO, Date.parse("2026-12-15T05:59:59Z")).terminado).toBe(false);
  expect(calcularRestante(OBJETIVO, Date.parse("2026-12-15T06:00:00Z")).terminado).toBe(true);
});

test("es pura: saltar horas de golpe da lo mismo que calcular desde cero", () => {
  const inicio = Date.parse("2026-12-10T10:00:00Z");
  const despues = inicio + 5 * 3600000;
  calcularRestante(OBJETIVO, inicio);
  expect(calcularRestante(OBJETIVO, despues)).toEqual(calcularRestante(OBJETIVO, despues));
  expect(calcularRestante(OBJETIVO, despues).horas).toBe(10);
});

test("formatea la fecha en hora de Costa Rica", () => {
  const texto = formatearFechaCR(OBJETIVO);
  expect(texto).toMatch(/^Lunes/);
  expect(texto).toContain("14 de diciembre");
  expect(texto).toContain("7:00");
  // La hora no se parte en dos líneas
  expect(texto).toMatch(/7:00 p\. m\.$/);
});

test("texto corto para la lista", () => {
  expect(textoCorto({ dias: 12, horas: 3, minutos: 0, esHoy: false })).toBe("en 12 días");
  expect(textoCorto({ dias: 1, horas: 3, minutos: 0, esHoy: false })).toBe("en 1 día");
  expect(textoCorto({ dias: 0, horas: 5, minutos: 10, esHoy: false })).toBe("en 5 h");
  expect(textoCorto({ dias: 0, horas: 0, minutos: 30, esHoy: false })).toBe("en 30 min");
  expect(textoCorto({ dias: 0, horas: 0, minutos: 0, esHoy: true })).toBe("Hoy");
});

test("convierte fecha y hora del formulario a ISO con -06:00", () => {
  expect(fechaHoraCRaISO("2026-12-14", "19:00")).toBe("2026-12-15T01:00:00.000Z");
  expect(fechaHoraCRaISO("2026-12-14", "")).toBe("2026-12-14T06:00:00.000Z");
  expect(fechaHoraCRaISO("", "10:00")).toBeNull();
});
