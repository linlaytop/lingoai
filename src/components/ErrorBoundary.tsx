import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.state.errorInfo!, this.reset);
      }
      // Default fallback: show error details
      const componentStack = this.state.errorInfo?.componentStack || 'No stack';
      return (
        <div style={{
          padding: '40px 20px',
          fontFamily: 'monospace',
          background: '#fef2f2',
          color: '#991b1b',
          minHeight: '100vh',
          overflow: 'auto',
        }}>
          <h1 style={{ fontSize: '20px', margin: '0 0 12px' }}>
            ⚠️ React 渲染错误
          </h1>
          <p style={{ fontSize: '13px', margin: '8px 0', color: '#666' }}>
            <strong>错误类型:</strong> {this.state.error?.name}
          </p>
          <p style={{ fontSize: '13px', margin: '8px 0', color: '#666' }}>
            <strong>错误信息:</strong> {this.state.error?.message}
          </p>
          <details style={{ marginTop: '16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#dc2626' }}>
              查看组件堆栈 (点击展开)
            </summary>
            <pre style={{
              marginTop: '8px',
              padding: '12px',
              background: '#fee2e2',
              borderRadius: '6px',
              fontSize: '11px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '60vh',
              overflow: 'auto',
            }}>
{componentStack}
            </pre>
          </details>
          <button
            onClick={this.reset}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}