import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
const App = () => {
  const [num, setNum] = useState(20);
  window['setNum'] = setNum;
  return (
    <div>
      {/* <Child /> */}
      {num}
    </div>
  )
}

const Child = () => {
  return <h1>patrick288</h1>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
