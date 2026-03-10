import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React error boundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#f5f0e8' }}>
                    <h2>Something went wrong</h2>
                    <p>Please refresh the page to continue.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1.5rem',
                            cursor: 'pointer',
                        }}
                    >
                        Refresh
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
