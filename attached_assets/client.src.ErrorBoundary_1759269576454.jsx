// /client/src/ErrorBoundary.jsx
import React from 'react'

export class ErrorBoundary extends React.Component{
  constructor(props){
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error){ return { error } }
  componentDidCatch(error, info){ console.error('ErrorBoundary', error, info) }
  render(){
    if (this.state.error){
      return (
        <div style={{padding:16}}>
          <h2>Something went wrong.</h2>
          <p>{String(this.state.error.message || this.state.error)}</p>
          <button onClick={()=> this.setState({ error:null })}>Dismiss</button>
        </div>
      )
    }
    return this.props.children
  }
}
