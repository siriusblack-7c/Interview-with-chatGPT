import React from 'react';
import { Edit3, Copy, X } from 'lucide-react';
import { useClipboard } from '../../hooks/useClipboard';

interface TextAreaProps {
    title: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    showEdit: boolean;
    onToggleEdit: () => void;
    colorScheme: 'purple' | 'orange';
    rows?: number;
}

const colorSchemes = {
    purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        focus: 'focus:ring-purple-500 focus:border-purple-500',
        button: 'bg-purple-500 hover:bg-purple-600'
    },
    orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-600',
        focus: 'focus:ring-orange-500 focus:border-orange-500',
        button: 'bg-orange-500 hover:bg-orange-600'
    }
};

export const TextArea: React.FC<TextAreaProps> = ({
    title,
    placeholder,
    value,
    onChange,
    onClear,
    showEdit,
    onToggleEdit,
    colorScheme,
    rows = 4
}) => {
    const { copyToClipboard } = useClipboard();
    const colors = colorSchemes[colorScheme];

    const handleCopyText = async () => {
        await copyToClipboard(value);
    };

    if (!value && !showEdit) {
        return (
            <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Add any additional context for better responses</p>
                <button
                    onClick={onToggleEdit}
                    className={`${colors.button} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto`}
                >
                    <Edit3 className="h-4 w-4" />
                    Add {title}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {showEdit && (
                <div>
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={`w-full p-3 border border-gray-300 rounded-lg ${colors.focus} text-sm`}
                        rows={rows}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                            {value.length} characters
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={onToggleEdit}
                                className="text-gray-600 hover:text-gray-700 px-3 py-1 text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onToggleEdit}
                                className={`${colors.button} text-white px-3 py-1 rounded text-xs`}
                                disabled={!value.trim()}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {value && !showEdit && (
                <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Edit3 className={`h-4 w-4 ${colors.text}`} />
                            <span className={`text-sm font-medium ${colors.text}`}>
                                {title} Loaded
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyText}
                                className={`${colors.text} hover:${colors.text.replace('text-', 'text-')} p-1`}
                                title={`Copy ${title.toLowerCase()}`}
                            >
                                <Copy className="h-3 w-3" />
                            </button>
                            <button
                                onClick={onToggleEdit}
                                className={`${colors.text} hover:${colors.text.replace('text-', 'text-')} p-1`}
                                title={`Edit ${title.toLowerCase()}`}
                            >
                                <Edit3 className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                    <div className={`text-xs ${colors.text}`}>
                        ✓ {value.length} characters • Entered manually • Click edit to modify
                    </div>
                    <div className={`mt-2 text-xs ${colors.text} ${colors.bg} rounded p-2 max-h-20 overflow-y-auto`}>
                        {value.substring(0, 200)}
                        {value.length > 200 && '...'}
                    </div>
                </div>
            )}
        </div>
    );
};
