import Image from "next/image";
import React from "react";
import BarItem from "./BarItem";
import Link from "next/link";

const Headers = () => {
  return (
    <div className="flex w-full gap-5 mt-5 items-center shrink-0">
      <div className="items-center w-35 gap-2 text-2xl font-bold text-gray-700 dark:text-white/55 flex">
        <Link href="/" aria-label="home">
          <Image
            src="/header-white.svg"
            width={35}
            // header-white.svg 原始比例是 220:200，宽度 35 时高度约为 32。
            height={32}
            loading="eager"
            alt="Header Icon"
          />
        </Link>
      </div>
      <div className=" ml-auto flex items-center min-w-10 text-xl">
        <BarItem />
      </div>
    </div>
  );
};

export default Headers;
