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

const EventCom = () => {
  const [num, setNum] = useState(20);
  let arr = num % 2 === 0
    ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
    : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]
  return <ul onClickCapture={() => setNum(num + 1)}>{arr}</ul>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <App />
  <EventCom />
)
