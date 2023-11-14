import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
const App = () => {
  const [num, setNum] = useState(20);
  console.log('App run');
  // @ts-ignore
  window.setNum = setNum;
  return num === 3 ? <Child /> : <div>{num}</div>;
}

const Child = () => {
  return <h1>patrick288</h1>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
