import { Moon, Sun } from 'lucide-react'
import React from 'react'

type Theme = 'dark' | 'light'

const Theme = () => {
  const [theme, setTheme] = React.useState<Theme>('dark')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // 获取本地存储的主题
    const savedTheme = localStorage.getItem('theme') as Theme | null
    // 获取系统主题
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    // 如果本地存储中有主题，则使用本地存储的主题，否则使用系统主题
    const initialTheme = savedTheme ?? systemTheme
    // 设置主题
    setTheme(initialTheme)
    // 设置 HTML 元素的 data-theme 属性
    document.documentElement.dataset.theme = initialTheme
    setMounted(true)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    localStorage.setItem('theme', nextTheme)
  }
  if (!mounted) {
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