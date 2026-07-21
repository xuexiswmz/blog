import { Moon, Sun } from 'lucide-react'
import React from 'react'

type Theme = 'dark' | 'light'

const THEME_CHANGE_EVENT = 'theme-change'

function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function subscribeToTheme(onThemeChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange)
  }
}

const Theme = () => {
  const theme = React.useSyncExternalStore<Theme | null>(
    subscribeToTheme,
    getTheme,
    () => null
  )

  function toggleTheme() {
    if (!theme) return

    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    localStorage.setItem('theme', nextTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  if (!theme) {
    return null
  }
  return (
    <button 
        onClick={toggleTheme}
        aria-label={
          theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'
        }
        className=" text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md p-2"
      >
        {
          theme === "light" ? (
            <Moon className='w-5 h-5' />
          ) : (
            <Sun className='w-5 h-5' />
          )
        }
      </button>
  )
}

export default Theme
