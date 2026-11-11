// BKD38 / UI30: el formulario solo crea eventos y emprendimientos; la
// publicación del feed se genera automáticamente en el backend.
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-hot-toast";
import FormularioPublicacion from "../pages/formulario";

jest.mock("react-hot-toast", () => ({
  toast: { error: jest.fn(), success: jest.fn(), promise: jest.fn() },
}));
jest.mock("../components/MapaUbicacion", () => () => <div data-testid="mapa" />);
jest.mock("../components/generic/categoriaSelector", () => () => <select aria-label="categoria" />);
jest.mock("../components/AlertaLimitePublicaciones", () => () => null);

const renderFormulario = (openTag) =>
  render(<FormularioPublicacion isOpen onClose={jest.fn()} openTag={openTag} />);

const selectTipo = () => screen.getAllByRole("combobox").find((s) => s.getAttribute("name") === "tag");

beforeEach(() => {
  window.scrollTo = jest.fn(); // jsdom no implementa scroll
  localStorage.clear();
  sessionStorage.clear();
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

test("el tipo solo ofrece Evento y Emprendimiento (no Publicación)", async () => {
  renderFormulario("emprendimiento");
  const select = await waitFor(selectTipo);
  const opciones = within(select).getAllByRole("option").map((o) => o.value);
  expect(opciones).toEqual(["", "evento", "emprendimiento"]);
  expect(opciones).not.toContain("publicacion");
});

test.each([
  ["evento", "Crear evento"],
  ["emprendimiento", "Crear emprendimiento"],
])("abierto desde %s, el formulario viene preseleccionado", async (tag, titulo) => {
  renderFormulario(tag);
  await waitFor(() => expect(selectTipo()).toHaveValue(tag));
  expect(screen.getByText(titulo)).toBeInTheDocument();
});

test("abierto desde Publicaciones, no preselecciona un tipo inválido", async () => {
  renderFormulario("publicacion");
  await waitFor(() => expect(selectTipo()).toHaveValue(""));
  expect(screen.getByText("Crear evento o emprendimiento")).toBeInTheDocument();
});

test("no deja enviar sin elegir evento o emprendimiento", async () => {
  const { container } = renderFormulario("publicacion");
  await waitFor(selectTipo);
  fireEvent.submit(container.querySelector("form"));
  expect(toast.error).toHaveBeenCalledWith("Selecciona si es un evento o un emprendimiento");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("un borrador viejo con tipo publicación no se puede reutilizar", async () => {
  // Los borradores se guardan en localStorage (sessionDraftStorage.js).
  localStorage.setItem(
    "komuness:crear-publicacion:general",
    JSON.stringify({ formData: { tag: "publicacion", titulo: "Viejo" } }),
  );
  renderFormulario(undefined);
  const cargar = await screen.findByText("Cargar borrador");
  fireEvent.click(cargar);
  await waitFor(() => expect(screen.getByDisplayValue("Viejo")).toBeInTheDocument());
  expect(selectTipo()).toHaveValue("");
});
