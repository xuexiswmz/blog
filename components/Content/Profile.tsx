import Image from 'next/image'

const Profile = () => {
  return (
    <aside className='hidden md:flex flex-none w-75  justify-center min-h-[90vh] bg-blue-50 dark:bg-gray-900 sticky top-0 left-0'>
        <div className='flex flex-col w-full max-w-60 items-center justify-center gap-5'>
          <Image src="/avatar.jpeg" width={80} height={80} alt='Header Icon' className="rounded-full" />
          <div className='flex flex-col items-center justify-center gap-1'>
            <div className='text-xl font-bold text-black dark:text-white'>
              xuexiswmz
            </div>
            <p className='text-md font-medium text-gray-800 font-mono dark:text-gray-400 mb-3'>
              Frontend Developer {"➡️"} OPT
            </p>
            <section className='w-full text-left'>
              <h4 className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400'>Skills</h4>
              <p className='text-sm leading-6 tetx-g-600 dark:text-gray-300 pl-2'>
                React · Next.js · TypeScript
                <br/>
                Node.js · PostgreSQL · AI
              </p>
            </section>
            <section className='w-full text-left'>
              <h4 className='mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400'>Writing</h4>
              <p className='text-sm leading-6 tetx-g-600 dark:text-gray-300 pl-2'>
                Frontend · Backend · Database
                <br />
                AI · Testing · Refactoring
              </p>
            </section>
            <blockquote className='max-w-55 border-l-2 border-gray-300 px-4 font-serif text-md leading-6 text-gray-500 dark:text-gray-400 dark:border-gray-700'>
              <p className='text-pretty'>
                Histories make men wise; poets witty; the mathematics subtile; natural philosophy deep; moral grave; logic and rhetoric able to contend. Abeunt studia in morse.
              </p>
              <footer className='text-right text-md tracking-wide mt-3'>
                - Francis Bacon
              </footer>
            </blockquote>
          </div>
        </div>
      </aside>
  )
}

export default Profile