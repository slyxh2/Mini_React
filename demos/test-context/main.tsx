import React, { useState, useContext, createContext, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

const ctx = createContext(10);

function App() {
    const context = useContext(ctx);
    useEffect(() => {
        console.log(context);
    }, [])
    return (
        <>
            2
        </>
    );
}



const root = ReactDOM.createRoot(document.querySelector('#root')!);

root.render(<App />);
