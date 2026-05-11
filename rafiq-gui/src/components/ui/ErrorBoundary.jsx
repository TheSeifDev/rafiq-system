import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0f1a',
            color: '#e0f7ff',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #ff3b5c, #cc2244)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 0 40px rgba(255, 59, 92, 0.5)'
            }}
          >
            <span style={{ fontSize: 32, color: 'white' }}>!</span>
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 8, color: '#ff3b5c' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#6b8fa3', marginBottom: 16 }}>
            RAFIQ encountered an error
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: 10,
                color: '#6b8fa3',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: 12,
                borderRadius: 8,
                maxWidth: '80%',
                overflow: 'auto',
                textAlign: 'left'
              }}
            >
              {this.state.error.message || String(this.state.error)}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '12px 32px',
              backgroundColor: '#00d4ff',
              border: 'none',
              borderRadius: 24,
              color: '#0a0f1a',
              fontSize: 14,
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;