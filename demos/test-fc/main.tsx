import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
// const App = () => {
//   const [num, setNum] = useState(20);
//   console.log('App run', num);
//   function asyncSet() {
//     setNum(num + 1);
//     setNum(num + 1);
//   }
//   return <div>
//     <button onClick={asyncSet}>++</button>
//     <p>{num}</p>
//     <Child />
//   </div>
// }

// const Child = () => {
//   const [num, setNum] = useState(0);
//   return <div>
//     <h1 onClick={() => setNum(num + 1)}>patrick288</h1>
//     <div>{num}</div>
//   </div>
// }

const EventCom = () => {
  const [num, setNum] = useState(0);
  // let arr = num % 2 === 0
  //   ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
  //   : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]


  const arr =
    num % 2 === 0
      ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
      : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];
  return (
    <ul onClickCapture={() => setNum(num + 1)}>
      <li>4</li>
      <li>5</li>
      {arr}
    </ul>
  );
  // return <ul onClickCapture={() => setNum(num + 1)}>{arr}</ul>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <App />
  <EventCom />
)
