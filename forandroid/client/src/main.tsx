import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App"

const rootContainer: HTMLElement | null = document.getElementById("root");
if(typeof rootContainer === null){
  throw new Error("Root element failed to exist");
}
const root = ReactDOM.createRoot(rootContainer as HTMLElement);

root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
