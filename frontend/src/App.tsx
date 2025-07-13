import UploadArea from './components/UploadArea';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Invoice Converter</h1>
        <UploadArea />
      </div>
    </div>
  );
}

export default App;