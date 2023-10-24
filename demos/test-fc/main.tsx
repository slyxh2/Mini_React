import React from 'react'
import ReactDOM from 'react-dom/client'
const App = () => {
  let a = 2;
  return (
    <div>
      <Child />
    </div>
  )
}

const Child = () => {
  return <h1>patrick288</h1>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
