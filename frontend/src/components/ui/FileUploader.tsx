import React from 'react';
import { Upload, FileText } from 'lucide-react';
import { parseEmailLeads, ParsedLeads } from '../../utils/emailParser';

interface FileUploaderProps {
  onParsed: (result: ParsedLeads) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onParsed }) => {
  const [dragOver, setDragOver] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) onParsed(parseEmailLeads(content));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
        dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-blue-500/60 bg-slate-900/40'
      }`}
    >
      <input
        type="file"
        accept=".csv,.txt"
        className="hidden"
        id="file-upload"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
        }}
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
        {fileName ? (
          <>
            <FileText className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-slate-200">{fileName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Click to replace file</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drop <span className="text-blue-400">.csv</span> or <span className="text-blue-400">.txt</span> lead file
              </p>
              <p className="text-xs text-slate-500 mt-0.5">or click to browse files</p>
            </div>
          </>
        )}
      </label>
    </div>
  );
};
