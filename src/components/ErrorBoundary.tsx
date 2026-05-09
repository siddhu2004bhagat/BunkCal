import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-[#f7f9fb] p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl p-8 ambient-shadow text-center border border-[#c5c6cd]">
            <div className="w-14 h-14 bg-[#ffdad6] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-[#ba1a1a]" />
            </div>
            <h2 className="text-lg font-bold text-[#091426] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#45474c] mb-6">{this.state.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#091426] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
