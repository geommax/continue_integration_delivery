import React, { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function App() {
  const [base, setBase] = useState('2');
  const [exponent, setExponent] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calculationResult, setCalculationResult] = useState(null);
  const [linearLogs, setLinearLogs] = useState([]);
  const [exponentialLogs, setExponentialLogs] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const eventSourceRef = useRef(null);

  const handleCalculate = async (e) => {
    e.preventDefault();
    
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setLoading(true);
    setError(null);
    setCalculationResult(null);
    setLinearLogs([]);
    setExponentialLogs([]);
    setCurrentStep(0);

    try {
      // Use EventSource for Server-Sent Events
      const url = `${API_URL}/api/calculate/stream`;
      
      // Use fetch with POST to initiate, then switch to EventSource
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base: parseFloat(base),
          exponent: parseInt(exponent)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start calculation');
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processText = async ({ done, value }) => {
        if (done) {
          setLoading(false);
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'start') {
                console.log('Calculation started:', data.calculation_id);
              } else if (data.type === 'step') {
                // Add step to logs - this triggers re-render immediately
                setCurrentStep(data.step);
                
                setLinearLogs(prev => [
                  ...prev,
                  {
                    step: data.step,
                    operation: data.linear.operation,
                    result: data.linear.result,
                    timestamp: data.timestamp
                  }
                ]);
                
                setExponentialLogs(prev => [
                  ...prev,
                  {
                    step: data.step,
                    operation: data.exponential.operation,
                    result: data.exponential.result,
                    timestamp: data.timestamp
                  }
                ]);
              } else if (data.type === 'complete') {
                setCalculationResult(data);
                setLoading(false);
              } else if (data.type === 'error') {
                setError(data.message);
                setLoading(false);
              }
            } catch (err) {
              console.error('Error parsing SSE data:', err);
            }
          }
        }

        // Continue reading
        return reader.read().then(processText);
      };

      reader.read().then(processText);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An error occurred while calculating');
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    if (Math.abs(num) > 1e6 || (Math.abs(num) < 0.000001 && num !== 0)) {
      return num.toExponential(6);
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const getChartData = () => {
    const maxLength = Math.max(linearLogs.length, exponentialLogs.length);
    const data = [];
    
    for (let i = 0; i < maxLength; i++) {
      data.push({
        step: i + 1,
        linear: linearLogs[i]?.result,
        exponential: exponentialLogs[i]?.result
      });
    }
    
    return data;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
            📊 Growth Pattern Calculator
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium">
            Real-time Linear vs Exponential Growth Visualization
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            3-Tier Architecture: React + Python + MongoDB
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-blue-500">⚙️</span>
                Input Parameters
              </h2>
              
              <form onSubmit={handleCalculate} className="space-y-5">
                {/* Base Input */}
                <div>
                  <label htmlFor="base" className="block text-sm font-semibold text-gray-700 mb-2">
                    Base (B)
                  </label>
                  <input
                    id="base"
                    type="number"
                    step="any"
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-lg disabled:bg-gray-100"
                    placeholder="Enter base value"
                  />
                  <p className="text-xs text-gray-500 mt-1">Positive number only</p>
                </div>

                {/* Exponent Input */}
                <div>
                  <label htmlFor="exponent" className="block text-sm font-semibold text-gray-700 mb-2">
                    Exponent (E)
                  </label>
                  <input
                    id="exponent"
                    type="number"
                    min="1"
                    max="100"
                    value={exponent}
                    onChange={(e) => setExponent(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-lg disabled:bg-gray-100"
                    placeholder="Enter exponent (1-100)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Integer between 1 and 100</p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Calculate Growth
                    </>
                  )}
                </button>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">⚠️</span>
                      <div className="flex-1">
                        <strong className="font-bold">Error</strong>
                        <p className="text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                {calculationResult && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                      <span>✅</span>
                      Calculation Complete
                    </h3>
                    <div className="space-y-1 text-sm text-green-700">
                      <p><strong>Linear:</strong> {formatNumber(calculationResult.linear_result)}</p>
                      <p><strong>Exponential:</strong> {formatNumber(calculationResult.exponential_result)}</p>
                      <p><strong>Steps:</strong> {calculationResult.total_steps}</p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Output Logs and Visualization */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visualization Chart */}
            {calculationResult && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-purple-500">📈</span>
                  Growth Visualization
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="step" 
                        label={{ value: 'Step', position: 'insideBottom', offset: -5 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        formatter={(value) => formatNumber(value)}
                        contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="linear" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Linear Growth"
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="exponential" 
                        stroke="#a855f7" 
                        strokeWidth={3}
                        name="Exponential Growth"
                        dot={{ fill: '#a855f7', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Output Logs Panel */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-blue-500">📝</span>
                Calculation Logs
              </h2>

              {calculationResult ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Linear Logs */}
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <span>🔵</span>
                      Linear Growth Logs
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {linearLogs.map((log, index) => (
                        <div key={index} className="bg-white rounded p-3 shadow-sm border border-blue-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs text-gray-500">Step {log.step}</span>
                            <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="font-mono text-sm text-blue-900">{log.operation}</div>
                          <div className="font-bold text-lg text-blue-700 mt-1">{formatNumber(log.result)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exponential Logs */}
                  <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                    <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                      <span>🟣</span>
                      Exponential Growth Logs
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {exponentialLogs.map((log, index) => (
                        <div key={index} className="bg-white rounded p-3 shadow-sm border border-purple-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs text-gray-500">Step {log.step}</span>
                            <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="font-mono text-sm text-purple-900">{log.operation}</div>
                          <div className="font-bold text-lg text-purple-700 mt-1">{formatNumber(log.result)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 text-lg">
                    Enter parameters and click "Calculate Growth" to see detailed logs
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Built with React + Tailwind CSS • Python FastAPI • MongoDB</p>
          <p className="mt-1">3-Tier Architecture Demonstration</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
