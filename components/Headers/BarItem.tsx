'use client'
import {  Scroll, Share2 } from 'lucide-react'
import Theme from './Theme'
import Language from './Language'
import Image from 'next/image'
import Link from 'next/link'


const BarItem = () => {
  
  return (
    <div className='flex items-center justify-center h-full w-full'>

        <Link href="/" aria-label='文章轴' className='hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md p-2'>      
          <Scroll className='text-black dark:text-white w-5 h-5' />
        </Link>

        <Link href="/graph" aria-label='文章图谱' className='hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md p-2'>      
          <Share2 className='text-black dark:text-white w-5 h-5' />
        </Link>

        <Language />

        <Theme />

        <div className="items-center justify-center h-full w-full gap-3 md:flex hidden">
          <a href="https://github.com/xuexiswmz" target="_blank" rel="noopener noreferrer">
            <Image src="/github.svg" width={25} height={25} alt='Github Icon' className="brightness-0 dark:invert" />
          </a>
        </div>

        <div className='flex items-center justify-center h-full w-full gap-3 md:hidden'>
          <a href="https://github.com/xuexiswmz" target="_blank" rel="noopener noreferrer">
            <Image src="/avatar.jpeg" width={25} height={25} alt='Header Icon' className='rounded-full ' />
          </a>
        </div>
    </div>
  )
}

export default BarItem