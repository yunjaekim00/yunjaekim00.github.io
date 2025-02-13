---
title: lazy-loading-with-dynamic-import
date: 2025-02-13
---
## Next.js page
아래는 `app/page.tsx`의 코드이다.

- 용량이 꽤 큰 `PopupListModal`을 import한 후,
- useState의 초기값을 `false`로 놓아,
- `PopupListModal` component가 렌더링되지 않게 해놓았다.

이 component는 실제로 여러가지 성격의 component일 수 있다.
웹사이트를 이용하는 모든 사람들이 꼭 보지 않아도 되는, 클릭해서 원할 때만 봐도 되는 component라고 보면 된다.

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

빌드 후에 브라우저에서 살펴보면
![](./_images/Pasted%20image%2020250213152253.png)
1.4Mb의 용량을 가져오는 것을 볼 수 있다.
이는 렌더링이 되지 않음에도 불구하고 `import`로 가져오는 것이다.
당장 main page에 필요하지 않는 component를 import해와서 초기 로딩 속도가 느려진다.

위와 똑같은 기능의 `page.tsx`이지만 다음 코드를 보자.

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

위 코드와의 유일한 차이점은 `PopupListModal`을 바로 import하지 않고 **dynamic import**로 import 했다는 점이다. 

빌드 후에 브라우저에서 보면
![](./_images/Pasted%20image%2020250213150443.png)
page.tsx의 크기는 133kB로 줄었다.
그리고 버튼을 클릭했하면 useState가 true로 바뀌고 component가 랜더링 되면서 아래와 같이 별도의 1.3Mb짜리 `.js`을 가져온다.
![](./_images/Pasted%20image%2020250213150544.png)
이것이 Dynamic import를 이용한 lazy loading으로, 고객들의 UX를 개선시킬 수 있다.

공식문서 참조: https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading