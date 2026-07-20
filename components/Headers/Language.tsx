'use client'

import "@/utils/i18n";
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Language = "en" | "zh"
const Language = () => {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language ?? "zh"
  const isChinese = currentLanguage.startsWith('zh')

  async function toggleLanguage() {
    const nextLanguage: Language = isChinese ? 'en' : 'zh'

    await i18n.changeLanguage(nextLanguage)

    localStorage.setItem('language', nextLanguage)

    document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en"
  }

  return (
    <button type="button" 
      onClick={toggleLanguage} 
      aria-label={isChinese ? '切换到英文' : 'Switch to Chinese'}
      className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md p-2"
      >
      <Languages className='text-black dark:text-white w-5 h-5' />
    </button>
  )
}

export default Language