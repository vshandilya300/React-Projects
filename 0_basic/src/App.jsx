import { useState } from 'react'
import './App.css'

function App() {
  const [count,setcount] = useState(68);

  const addvalue = () =>{
    setcount(count+1)
  }
  const removevalue = () => {
    setcount(count-1)
  }
  


  return (
    <>
      <h1>Counter Project</h1>
      <h2>counter value: {count}</h2>

      <button onClick={addvalue}>Add value</button>
      <br />
      <button onClick={removevalue}>remove value</button>
    </>
  )
}

export default App
