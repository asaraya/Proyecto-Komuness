// UI65: la casilla de cuenta regresiva solo aparece en eventos y para
// cuentas con permiso.
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import FormularioPublicacion from "../pages/formulario";
import { useAuth } from "../components/context/AuthContext";

jest.mock("react-hot-toast", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn(), promise: jest.fn() }),
}));
jest.mock("../components/MapaUbicacion", () => () => <div data-testid="mapa" />);
jest.mock("../components/generic/categoriaSelector", () => () => <select aria-label="categoria" />);
jest.mock("../components/AlertaLimitePublicaciones", () => () => null);
jest.mock("../components/context/AuthContext", () => ({ useAuth: jest.fn() }));

const TEXTO = "Mostrar cuenta regresiva en la principal";

const renderCon = (user, tag) => {
  useAuth.mockReturnValue({ user });
  return render(<FormularioPublicacion isOpen onClose={jest.fn()} openTag={tag} />);
};

beforeEach(() => {
  window.scrollTo = jest.fn();
  localStorage.clear();
  sessionStorage.clear();
  global.fetch = jest.fn();
});

test.each([
  ["admin", { tipoUsuario: 1 }],
  ["básico con permiso", { tipoUsuario: 2, puedeCrearCuentaRegresiva: true }],
])("%s ve la casilla en un evento, desmarcada", async (_, user) => {
  renderCon(user, "evento");
  const casilla = await screen.findByLabelText(TEXTO);
  expect(casilla).not.toBeChecked();
});

test("un básico sin permiso no ve la casilla", async () => {
  renderCon({ tipoUsuario: 2 }, "evento");
  await waitFor(() => expect(screen.getByText("Crear evento")).toBeInTheDocument());
  expect(screen.queryByLabelText(TEXTO)).not.toBeInTheDocument();
});

test("en un emprendimiento no aparece", async () => {
  renderCon({ tipoUsuario: 1 }, "emprendimiento");
  await waitFor(() => expect(screen.getByText("Crear emprendimiento")).toBeInTheDocument());
  expect(screen.queryByLabelText(TEXTO)).not.toBeInTheDocument();
});
