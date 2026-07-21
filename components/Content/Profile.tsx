'use client'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
const Profile = () => {
  const { t } = useTranslation()
  return (
    <aside className='hidden md:flex flex-none w-75  justify-center bg-blue-50 dark:bg-gray-900 h-fit min-h-[90vh] shrink-0 self-start '>
        <div className='flex flex-col w-full max-w-60 items-center justify-center gap-5'>
          <Image src="/avatar.jpeg" width={80} height={80} alt='Header Icon' className="rounded-full" />
          <div className='flex flex-col items-center justify-center gap-1'>
            <div className='text-xl font-bold text-black dark:text-white'>
              xuexiswmz
            </div>
            <p className='text-md font-medium text-gray-800 font-mono dark:text-gray-400 mb-3'>
              {t("profile.role")}
            </p>
            <section className='w-full text-left'>
              <h4 className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400'>{t("profile.skills")}</h4>
              <p className='text-sm leading-6 text-gray-600 dark:text-gray-300 pl-2'>
                React · Next.js · TypeScript
                <br/>
                Node.js · PostgreSQL · AI
              </p>
            </section>
            <section className='w-full text-left'>
              <h4 className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400'>{t("profile.writing")}</h4>
              <p className='text-sm leading-6 text-gray-600 dark:text-gray-300 pl-2'>
                {t("topic.frontend")} · {t("topic.performance")} · {t("topic.backend")}
                <br />
                {t("topic.ai")} · {t("topic.testing")} · {t("topic.refactoring")}
              </p>
            </section>
            <blockquote className='max-w-55 mt-2 border-l-2 border-gray-300 px-4 font-serif text-md leading-6 text-gray-500 dark:text-gray-400 dark:border-gray-700'>
              <p className='text-pretty'>
                {t("quote.text")}
              </p>
              <footer className='text-right text-md tracking-wide mt-3'>
                {t("quote.author")}
              </footer>
            </blockquote>
          </div>
        </div>
      </aside>
  )
}

export default Profile