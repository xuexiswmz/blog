import Profile from './Profile'
import TimeLine from './TimeLine'

const Contents = () => {
  return (
    <div className=' flex min-h-0 w-full flex-1 overflow-hidden mt-5'>
      <Profile />
      <TimeLine />
    </div>
  )
}

export default Contents