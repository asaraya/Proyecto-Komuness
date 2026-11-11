// UI64: buscador de proyectos destacados por nombre.
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProyectosDestacados from "../components/proyectosDestacados";
import { useAuth } from "../components/context/AuthContext";

jest.mock("../components/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-hot-toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
// react-markdown es ESM y el Jest de react-scripts no lo transforma.
jest.mock("react-markdown", () => ({ children }) => <p>{children}</p>);
jest.mock("../components/proyectosDestacadosModal", () => () => null);

const PROYECTOS = [
  { _id: "1", nombre: "Murales de San Carlos", descripcion: "Jóvenes artistas pintaron murales." },
  { _id: "2", nombre: "Orquesta Comunitaria Juvenil", descripcion: "Niñas y niños aprenden música." },
  { _id: "3", nombre: "Mercado de Emprendedoras", descripcion: "Feria mensual en el salón comunal." },
];

const titulos = () => screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const buscador = () => screen.getByRole("searchbox", { name: "Buscar proyecto por nombre" });

beforeEach(() => {
  useAuth.mockReturnValue({ user: null });
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ data: PROYECTOS }) }),
  );
});

test("sin búsqueda muestra todos los proyectos", async () => {
  render(<ProyectosDestacados />);
  expect(await screen.findByText("Murales de San Carlos")).toBeInTheDocument();
  expect(titulos()).toHaveLength(3);
});

test("filtra por nombre sin importar mayúsculas ni tildes", async () => {
  render(<ProyectosDestacados />);
  await screen.findByText("Murales de San Carlos");

  fireEvent.change(buscador(), { target: { value: "ORQUÉSTA" } });

  expect(titulos()).toEqual(["Orquesta Comunitaria Juvenil"]);
  expect(screen.getByText("1 de 3 proyectos")).toBeInTheDocument();
});

test("busca solo en el nombre, no en la descripción", async () => {
  render(<ProyectosDestacados />);
  await screen.findByText("Murales de San Carlos");

  // "comunal" solo aparece en la descripción de "Mercado de Emprendedoras"
  fireEvent.change(buscador(), { target: { value: "comunal" } });

  expect(titulos()).toEqual([]);
});

test("avisa cuando ningún proyecto coincide", async () => {
  render(<ProyectosDestacados />);
  await screen.findByText("Murales de San Carlos");

  fireEvent.change(buscador(), { target: { value: "zzz" } });

  expect(titulos()).toEqual([]);
  expect(screen.getByText("No hay proyectos que coincidan con “zzz”.")).toBeInTheDocument();
});

test("el botón × limpia la búsqueda y vuelve a mostrar todo", async () => {
  render(<ProyectosDestacados />);
  await screen.findByText("Murales de San Carlos");

  fireEvent.change(buscador(), { target: { value: "mercado" } });
  expect(titulos()).toEqual(["Mercado de Emprendedoras"]);

  fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

  expect(buscador()).toHaveValue("");
  expect(titulos()).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
});
