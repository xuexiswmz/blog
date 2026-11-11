"use client";

import { useState } from "react";
import { getOrCreateGuestUsername } from "../utils/guestUsername";

function readGuestUsername() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return getOrCreateGuestUsername(window.localStorage);
  } catch {
    return getOrCreateGuestUsername(null);
  }
}

/**
 * 为游客提供稳定的展示用户名。
 *
 * 用户名保存在 localStorage，不会自动过期；
 * 评论区归属仍然由服务端 httpOnly cookie 中的 visitor_id 判断。
 */
export function useGuestUsername() {
  const [username] = useState(readGuestUsername);

  return username;
}
