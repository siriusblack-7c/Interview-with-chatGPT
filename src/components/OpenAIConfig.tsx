import { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, AlertCircle, Info } from 'lucide-react';
import openaiService from '../services/openai';

interface OpenAIConfigProps {
    onConfigChange?: (configured: boolean) => void;
}

export default function OpenAIConfig({ onConfigChange }: OpenAIConfigProps) {
    const [apiKey, setApiKey] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    useEffect(() => {
        const configured = openaiService.isConfigured();
        setIsConfigured(configured);
        if (!configured) {
            setShowConfig(true);
        }
        onConfigChange?.(configured);
    }, [onConfigChange]);

    const handleSaveConfig = () => {
        if (apiKey.trim()) {
            // Update the OpenAI service with the new API key
            openaiService.updateApiKey(apiKey.trim());

            // Update local state
            setIsConfigured(true);
            setApiKey('');
            setShowConfig(false);

            // Notify parent component
            onConfigChange?.(true);
        }
    };

    const testConnection = async () => {
        setTestingConnection(true);
        try {
            await openaiService.generateInterviewResponse('Test question: What is your name?');
            alert('✅ OpenAI connection successful!');
        } catch (error: any) {
            alert(`❌ Connection failed: ${error.message}`);
        } finally {
            setTestingConnection(false);
        }
    };

    const usageInfo = openaiService.getUsageInfo();

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    OpenAI Configuration
                </h3>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    {showConfig ? 'Hide' : 'Show'} Config
                </button>
            </div>

            {/* Status Indicator */}
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${isConfigured
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                {isConfigured ? (
                    <>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">OpenAI Connected</span>
                        <span className="text-xs">({usageInfo.model} • {usageInfo.source})</span>
                    </>
                ) : (
                    <>
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">OpenAI Not Configured</span>
                    </>
                )}
            </div>

            {showConfig && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-700">
                                <p className="font-medium mb-2">🔑 Recommended Setup (Environment Variable):</p>
                                <div className="bg-blue-100 border border-blue-300 rounded p-2 mb-2">
                                    <p className="text-xs font-mono">
                                        1. Create <strong>.env.local</strong> file in project root<br />
                                        2. Add: <strong>VITE_OPENAI_API_KEY=sk-your_key_here</strong><br />
                                        3. Restart dev server: <strong>npm run dev</strong>
                                    </p>
                                </div>
                                <p className="font-medium mb-1">Alternative (Browser Storage):</p>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                    <li>Get API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                                    <li>Enter your API key below</li>
                                    <li>Click "Save Configuration"</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            OpenAI API Key
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <button
                                onClick={handleSaveConfig}
                                disabled={!apiKey.trim()}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>

                    {isConfigured && (
                        <div className="flex gap-2">
                            <button
                                onClick={testConnection}
                                disabled={testingConnection}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                {testingConnection ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Testing...
                                    </>
                                ) : (
                                    'Test Connection'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!isConfigured && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                        <strong>Demo Mode:</strong> Using static responses. Configure OpenAI for intelligent AI-powered responses! 🚀
                    </p>
                </div>
            )}
        </div>
    );
}