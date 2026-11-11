// UI63: buscador de tutoriales por nombre.
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Tutoriales from "../components/tutoriales";
import { useAuth } from "../components/context/AuthContext";

jest.mock("../components/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-hot-toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
// react-markdown es ESM y el Jest de react-scripts no lo transforma.
jest.mock("react-markdown", () => ({ children }) => <p>{children}</p>);
jest.mock("../components/tutorialModal", () => () => null);

const TUTORIALES = [
  { _id: "1", nombre: "Cómo crear tu cuenta", descripcion: "Registrate con tu correo." },
  { _id: "2", nombre: "Publicar un emprendimiento", descripcion: "Usá el botón +." },
  { _id: "3", nombre: "Usar la biblioteca", descripcion: "Buscá documentos por nombre." },
];

const titulos = () => screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const buscador = () => screen.getByRole("searchbox", { name: "Buscar tutorial por nombre" });

beforeEach(() => {
  useAuth.mockReturnValue({ user: null });
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ data: TUTORIALES }) }),
  );
});

test("sin búsqueda muestra todos los tutoriales", async () => {
  render(<Tutoriales />);
  expect(await screen.findByText("Cómo crear tu cuenta")).toBeInTheDocument();
  expect(titulos()).toHaveLength(3);
});

test("filtra por nombre sin importar mayúsculas ni tildes", async () => {
  render(<Tutoriales />);
  await screen.findByText("Cómo crear tu cuenta");

  fireEvent.change(buscador(), { target: { value: "COMO CREAR" } });

  expect(titulos()).toEqual(["Cómo crear tu cuenta"]);
  expect(screen.getByText("1 de 3 tutoriales")).toBeInTheDocument();
});

test("busca solo en el nombre, no en la descripción", async () => {
  render(<Tutoriales />);
  await screen.findByText("Cómo crear tu cuenta");

  // "documentos" solo aparece en la descripción de "Usar la biblioteca"
  fireEvent.change(buscador(), { target: { value: "documentos" } });

  expect(titulos()).toEqual([]);
});

test("avisa cuando ningún tutorial coincide", async () => {
  render(<Tutoriales />);
  await screen.findByText("Cómo crear tu cuenta");

  fireEvent.change(buscador(), { target: { value: "zzz" } });

  expect(titulos()).toEqual([]);
  expect(screen.getByText("No hay tutoriales que coincidan con “zzz”.")).toBeInTheDocument();
});

test("el botón × limpia la búsqueda y vuelve a mostrar todo", async () => {
  render(<Tutoriales />);
  await screen.findByText("Cómo crear tu cuenta");

  fireEvent.change(buscador(), { target: { value: "biblio" } });
  expect(titulos()).toEqual(["Usar la biblioteca"]);

  fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

  expect(buscador()).toHaveValue("");
  expect(titulos()).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
});
