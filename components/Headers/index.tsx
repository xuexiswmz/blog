import Image from 'next/image'
import React from 'react'
import BarItem from './BarItem'

const Headers = () => {
  return (
    <div className="flex w-full gap-5 mt-5 items-center">
        <div className="flex flex-none items-center w-35 gap-2 text-2xl font-bold text-gray-700 dark:text-white/55">
            <Image src="/header-white.svg" width={35} height={35} alt='Header Icon' />
            xuexiswmz
        </div>
        <div className="flex-1 flex justify-center items-center min-w-0 text-md font-medium text-gray-400 font-serif dark:text-gray-500/55">
            Studies make me wise
        </div>
        <div className="flex-none flex justify-center items-center min-w-10 text-xl">
            <BarItem />
        </div>
    </div>
  )
}

export default Headers