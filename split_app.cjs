const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf-8');

const importsMatch = content.match(/import React.*?from 'motion\/react';/s);
const imports = importsMatch ? importsMatch[0] : '';

const splitContent = (startMarker, endMarker) => {
  const start = content.indexOf(startMarker);
  if (start === -1) return null;
  const end = endMarker ? content.indexOf(endMarker, start) : content.length;
  return content.substring(start, end).trim();
};

const landing = splitContent('// --- 1. Landing View ---', '// --- 2. Dashboard View');
const dashboard = splitContent('// --- 2. Dashboard View', '// --- 3. Pipeline');
const pipeline = splitContent('// --- 3. Pipeline Initiation View ---', '// --- 4. Copilot');
const editor = splitContent('// --- 4. Copilot Editor View', '// --- 5. Portfolio');
const portfolio = splitContent('// --- 5. Portfolio Builder View ---', '// --- Main App Component');

const template = (comp) => `
${imports}
import { ViewState } from '../types/navigation';
import { SHADOW, HOVER_SHADOW, COLORS } from '../lib/constants';

${comp}

export default ${comp.match(/const (\w+)/)[1]};
`.trim() + '\n';

fs.writeFileSync('src/pages/Landing.tsx', template(landing));
fs.writeFileSync('src/pages/Dashboard.tsx', template(dashboard));
fs.writeFileSync('src/pages/Pipeline.tsx', template(pipeline));
fs.writeFileSync('src/pages/Editor.tsx', template(editor));
fs.writeFileSync('src/pages/Portfolio.tsx', template(portfolio));

// Update App.tsx
const appStart = content.indexOf('// --- Main App Component ---');
const appComponent = content.substring(appStart).trim();

const newAppTsx = `
${imports}
import { ViewState } from './types/navigation';
import LandingView from './pages/Landing';
import DashboardView from './pages/Dashboard';
import PipelineView from './pages/Pipeline';
import EditorView from './pages/Editor';
import PortfolioView from './pages/Portfolio';

const LoadingOverlay = ({ message = '불러오는 중...' }: { message?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
  >
    <Loader2 className="w-12 h-12 text-[#002045] animate-spin mb-4" />
    <p className="text-[#002045] font-medium animate-pulse">{message}</p>
  </motion.div>
);

${appComponent}
`.trim() + '\n';

fs.writeFileSync('src/App.tsx', newAppTsx);

console.log("Files split successfully");
