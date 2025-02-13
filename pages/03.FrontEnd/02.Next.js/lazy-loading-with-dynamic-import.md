---
title: lazy-loading-with-dynamic-import
date: 2025-02-13
---
## Next.js page
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import PopupListModal from '@/components/common/modal/popup-list-modal'

const Home = () => {
  const [isShow, setIsShow] = useState<boolean>(false)
  return (
    <>
      <Button onClick={() => setIsShow(true)}>Click to Show Component </Button>
      {isShow && <PopupListModal popupTgtScrn={'main'} />}
    </>
  )
}

export default Home
```



![](_images/Pasted%20image%2020250213152253.png)

## Dynamic Import
`app/page.tsx`를 다음과 같이 수정한다.
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'

const DynamicComponent = dynamic(
  () => import('@/components/common/modal/popup-list-modal'),
  {
    ssr: false,
    loading: () => <p>loading...</p>
  }
)

const Home = () => {
  const [isShow, setIsShow] = useState<boolean>(false)
  return (
    <>
      <Button onClick={() => setIsShow(true)}>Click to Show Component </Button>
      {isShow && <DynamicComponent popupTgtScrn={'main'} />}
    </>
  )
}

export default Home
```

빌드 후에 브라우저에서 보면
![](_images/Pasted%20image%2020250213150443.png)
크기는 133kB로 줄었다.
그리고 버튼을 클릭했을 시에만 아래와 같이 1.3Mb를 가져온다.
![](_images/Pasted%20image%2020250213150544.png)
