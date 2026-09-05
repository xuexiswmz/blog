import Profile from './Profile'
import TimeLine from './TimeLine'

const Contents = () => {
  return (
    <div className='mt-4 flex min-h-0 w-full flex-1 gap-[clamp(0.75rem,1.5vw,1.5rem)] overflow-hidden'>
      <Profile />
      <TimeLine />
    </div>
  )
}

export default Contents
