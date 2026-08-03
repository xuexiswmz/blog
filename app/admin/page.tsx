import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import SignOutButton from '@/components/Admin/SignOutButton'
import Link from 'next/dist/client/link'

export default async function AdminPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        redirect("/admin/login")
    }
  return (
    <main className='p-6'>
        <h1 className='text-2xl font-semibold'>
            管理中心
        </h1>
        <p className='mt-3'>
            已登录: {session.user.name}
        </p>

        <p className=' mt-1 text-sm text-gray-500'>
            { session.user.email }
        </p>

        <div className="mt-6">
            <Link
                href="/admin/comments"
                className="inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-gray-900"
            >
                评论审核
            </Link>
        </div>
        
        <div className=' mt-6 '>
            <SignOutButton />
        </div>
    </main>
  )
}
