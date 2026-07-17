import Image from 'next/image'
import React from 'react'
import BarItem from './BarItem'

const Headers = () => {
  return (
    <div className="flex w-full gap-5 mt-5 items-center">
        <div className="items-center w-35 gap-2 text-2xl font-bold text-gray-700 dark:text-white/55 flex">
            <Image src="/header-white.svg" width={35} height={35} alt='Header Icon' />
        </div>
        <div className=" ml-auto flex items-center min-w-10 text-xl">
            <BarItem />
        </div>
    </div>
  )
}

export default Headers