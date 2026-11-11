import { describe, expect, it, vi } from "vitest";
import {
  createGuestUsername,
  getOrCreateGuestUsername,
  GUEST_USERNAME_STORAGE_KEY,
  isGuestUsername,
} from "./guestUsername";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe("createGuestUsername", () => {
  it("生成 user_ 加 8 位小写字母或数字", () => {
    expect(createGuestUsername()).toMatch(/^user_[0-9a-z]{8}$/);
  });

  it("每次生成不同的用户名", () => {
    expect(createGuestUsername()).not.toBe(createGuestUsername());
  });
});

describe("isGuestUsername", () => {
  it("识别合法的游客用户名", () => {
    expect(isGuestUsername("user_ab12cd34")).toBe(true);
  });

  it.each(["user_", "user_ABC12345", "user_1234567", "admin", "user_ab-12345"])(
    "拒绝不合法的用户名 %s",
    (value) => {
      expect(isGuestUsername(value)).toBe(false);
    },
  );
});

describe("getOrCreateGuestUsername", () => {
  it("已有合法用户名时直接复用，不重复写入", () => {
    const storage = createStorage({
      [GUEST_USERNAME_STORAGE_KEY]: "user_ab12cd34",
    });

    expect(getOrCreateGuestUsername(storage)).toBe("user_ab12cd34");
    expect(storage.getItem).toHaveBeenCalledWith(GUEST_USERNAME_STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("没有用户名时生成并写入浏览器存储", () => {
    const storage = createStorage();

    const username = getOrCreateGuestUsername(storage);

    expect(username).toMatch(/^user_[0-9a-z]{8}$/);
    expect(storage.setItem).toHaveBeenCalledWith(
      GUEST_USERNAME_STORAGE_KEY,
      username,
    );
  });

  it("已有值不合法时重新生成并覆盖", () => {
    const storage = createStorage({
      [GUEST_USERNAME_STORAGE_KEY]: "自定义昵称",
    });

    const username = getOrCreateGuestUsername(storage);

    expect(username).toMatch(/^user_[0-9a-z]{8}$/);
    expect(storage.setItem).toHaveBeenCalledWith(
      GUEST_USERNAME_STORAGE_KEY,
      username,
    );
  });

  it("读取存储失败时仍然返回可用的用户名", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("storage unavailable");
      }),
      setItem: vi.fn(),
    };

    expect(getOrCreateGuestUsername(storage)).toMatch(/^user_[0-9a-z]{8}$/);
  });

  it("写入存储失败时仍然返回可用的用户名", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error("quota exceeded");
      }),
    };

    expect(getOrCreateGuestUsername(storage)).toMatch(/^user_[0-9a-z]{8}$/);
  });
});
