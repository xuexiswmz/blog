export const GUEST_USERNAME_STORAGE_KEY = "blog_guest_username";

const GUEST_USERNAME_PATTERN = /^user_[0-9a-z]{8}$/;

const USERNAME_SUFFIX_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

const USERNAME_SUFFIX_LENGTH = 8;

export function isGuestUsername(value: string) {
  return GUEST_USERNAME_PATTERN.test(value);
}

/**
 * 生成形如 user_ab12cd34 的游客用户名。
 *
 * 用户名只用于展示，真正判断评论归属的是服务端
 * httpOnly cookie 里的 visitor_id。
 */
export function createGuestUsername() {
  const bytes = new Uint8Array(USERNAME_SUFFIX_LENGTH);

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  let suffix = "";

  for (const byte of bytes) {
    suffix += USERNAME_SUFFIX_ALPHABET[byte % USERNAME_SUFFIX_ALPHABET.length];
  }

  return `user_${suffix}`;
}

type UsernameStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * 从浏览器存储中读取游客用户名；没有或格式不合法时
 * 生成一个新用户名并写入。localStorage 不会自动过期。
 */
export function getOrCreateGuestUsername(storage: UsernameStorage | null) {
  if (storage) {
    try {
      const storedUsername = storage.getItem(GUEST_USERNAME_STORAGE_KEY);

      if (storedUsername && isGuestUsername(storedUsername)) {
        return storedUsername;
      }
    } catch {
      // 隐私模式等场景可能禁止读取存储，继续生成临时用户名。
    }
  }

  const username = createGuestUsername();

  if (storage) {
    try {
      storage.setItem(GUEST_USERNAME_STORAGE_KEY, username);
    } catch {
      // 写入失败时仍然让本次评论使用生成好的用户名。
    }
  }

  return username;
}
