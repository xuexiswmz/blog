// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: mocks.signInEmail },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
    refresh: mocks.refresh,
  }),
}));

import AdminLoginForm from "./AdminLoginForm";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container.remove();
  root = null;
});

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("AdminLoginForm", () => {
  it("signs in with email and password and redirects to admin", async () => {
    mocks.signInEmail.mockResolvedValue({ error: null });

    await act(async () => {
      root = createRoot(container);
      root.render(<AdminLoginForm />);
    });

    const email = container.querySelector<HTMLInputElement>("#admin-email");
    const password = container.querySelector<HTMLInputElement>(
      "#admin-password",
    );

    await act(async () => {
      if (email) setValue(email, "admin@example.com");
      if (password) setValue(password, "password123");
    });

    await act(async () => {
      container.querySelector("form")?.requestSubmit();
    });

    expect(mocks.signInEmail).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "password123",
    });
    expect(mocks.replace).toHaveBeenCalledWith("/admin");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows the auth error", async () => {
    mocks.signInEmail.mockResolvedValue({
      error: { message: "邮箱或密码错误" },
    });

    await act(async () => {
      root = createRoot(container);
      root.render(<AdminLoginForm />);
    });

    const email = container.querySelector<HTMLInputElement>("#admin-email");
    const password = container.querySelector<HTMLInputElement>(
      "#admin-password",
    );

    await act(async () => {
      if (email) setValue(email, "admin@example.com");
      if (password) setValue(password, "wrong-password");
    });

    await act(async () => {
      container.querySelector("form")?.requestSubmit();
    });

    expect(container.textContent).toContain("邮箱或密码错误");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
