// UI41: el botón "+" de crear aparece en Eventos y Emprendimientos para
// cualquier usuario con sesión (lo que crea queda pendiente hasta que un admin
// lo aprueba) y nunca en Publicaciones, que se generan automáticamente.
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Publicaciones } from "../components/publicaciones";
import { useAuth } from "../components/context/AuthContext";

jest.mock("../components/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-hot-toast", () => ({ toast: { error: jest.fn(), success: jest.fn(), promise: jest.fn() } }));
// El Jest de react-scripts no resuelve los "exports" de react-router-dom v7.
jest.mock(
  "react-router-dom",
  () => ({
    useLocation: () => ({ pathname: "/", search: "" }),
    useNavigate: () => jest.fn(),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
  }),
  { virtual: true },
);

// Hijos pesados (mapas, calendario, carruseles) no son parte de esta prueba.
jest.mock("../pages/formulario", () => () => null);
jest.mock("../components/publicacionCard", () => () => null);
jest.mock("../components/eventoCard", () => () => null);
jest.mock("../components/publicacionModal", () => () => null);
jest.mock("../components/publicidadModal", () => () => null);
jest.mock("../components/generic/categoriaFilter", () => () => null);
jest.mock("../components/buscadorPublicaciones", () => () => null);
jest.mock("../components/AlertaLimitePublicaciones", () => () => null);
jest.mock("../components/limiteDePublicaciones", () => () => null);
jest.mock("../components/generic/dateFilter", () => () => null);
jest.mock("../components/generic/priceFilter", () => () => null);
jest.mock("../components/generic/comunidadFilter", () => () => null);
jest.mock("../components/CarruselGenerico", () => () => null);
jest.mock("../components/Calendar", () => () => null);

const USUARIOS = [
  ["un admin", { _id: "a1", nombre: "Admin", tipoUsuario: 0 }],
  ["un usuario básico", { _id: "b1", nombre: "Basico", tipoUsuario: 2 }],
  ["un usuario premium", { _id: "p1", nombre: "Premium", tipoUsuario: 3 }],
];

const renderLista = (tag) => render(<Publicaciones tag={tag} />);
const BOTON = "Inspira a otros con tu talento";

beforeEach(() => {
  window.scrollTo = jest.fn(); // jsdom no implementa scroll
  jest.clearAllMocks();
  localStorage.setItem("token", "t");
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], pagination: { offset: 0, limit: 12, total: 0, pages: 0 } }),
    }),
  );
});

describe.each(["evento", "emprendimiento"])("en %s", (tag) => {
  test.each(USUARIOS)("%s ve el botón de crear", async (_, user) => {
    useAuth.mockReturnValue({ user });
    renderLista(tag);
    expect(await screen.findByText(BOTON)).toBeInTheDocument();
  });

  test("sin sesión no aparece", async () => {
    useAuth.mockReturnValue({ user: null });
    renderLista(tag);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(BOTON)).not.toBeInTheDocument();
  });
});

describe("en publicacion", () => {
  test.each(USUARIOS)("%s no ve el botón: las publicaciones se generan solas", async (_, user) => {
    useAuth.mockReturnValue({ user });
    renderLista("publicacion");
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(BOTON)).not.toBeInTheDocument();
  });
});
