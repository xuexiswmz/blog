import { LibraryBig, Sun } from 'lucide-react'
import React from 'react'

const BarItem = () => {
  return (
    <div className='flex items-center justify-center h-full w-full gap-5'>
        <Sun className='text-black dark:text-white w-5 h-5' />
        <LibraryBig className='text-black dark:text-white w-5 h-5' />
    </div>
  )
}

export default BarItem