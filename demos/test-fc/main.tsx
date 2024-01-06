import React, { useState, useEffect, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  // const [num, setNum] = useState(0);
  // return <>
  //   <button onClick={() => setNum(1)}>click</button>
  //   {num === 0 ? <Child /> : "null"}
  // </>
  const [num, setNum] = useState(99);
  useLayoutEffect(() => {
    console.log(22);
    setNum(88);
  }, []);
  return <>
    {num}
    {/* <Child /> */}
  </>
}
const Child = () => {
  useEffect(() => {
    console.log('useEffect run');
    return () => {
      console.log('useEffect unmount')
    }
  })
  useLayoutEffect(() => {
    console.log('useLayoutEffect run');
    return () => {
      console.log('useLayoutEffect unmount')
    }
  })
  return <div>
    Child
  </div>
}

const root = ReactDOM.createRoot(document.querySelector('#root')!);

root.render(<App />);
