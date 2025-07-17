import UploadArea from './components/UploadArea';
import { CurrencyProvider } from './contexts/CurrencyContext';

function App() {
  return (
    <CurrencyProvider defaultCurrency="USD">
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Invoice Converter</h1>
          <UploadArea />
        </div>
      </div>
    </CurrencyProvider>
  );
}

export default App;