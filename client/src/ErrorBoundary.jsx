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
          <h2 data-testid="heading-error">Something went wrong.</h2>
          <p data-testid="text-error">{String(this.state.error.message || this.state.error)}</p>
          <button data-testid="button-dismiss" onClick={()=> this.setState({ error:null })}>Dismiss</button>
        </div>
      )
    }
    return this.props.children
  }
}
