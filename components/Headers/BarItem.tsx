'use client'
import { LibraryBig, Scroll } from 'lucide-react'
import Theme from './Theme'
import React from 'react'
import Image from 'next/image'


const BarItem = () => {
  
  return (
    <div className='flex items-center justify-center h-full w-full gap-3'>
        <Scroll className='text-black dark:text-white w-5 h-5' />
        <LibraryBig className='text-black dark:text-white w-5 h-5' />
        <Theme />
        |
        <div>
          <a href="https://github.com/xuexiswmz" target="_blank" rel="noopener noreferrer">
            <Image src="/github.svg" width={25} height={25} alt='Github Icon' className="brightness-0 dark:invert" />
          </a>
        </div>
    </div>
  )
}

export default BarItem