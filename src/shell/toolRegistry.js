import EndpointAnalysisApp from '../apps/endpoint-analysis/EndpointAnalysisApp';
import ColonyCounterApp from '../apps/colony-counter/ColonyCounterApp';
import GelQuantificationApp from '../apps/gel-quantification/GelQuantificationApp';
import QPCRAnalyzerApp from '../apps/qpcr-analyzer/QPCRAnalyzerApp';
import FigureGeneratorApp from '../apps/figure-generator/FigureGeneratorApp';

export const TOOLS = {
  'endpoint-analysis': {
    id: 'endpoint-analysis',
    name: 'Endpoint Analysis',
    description: 'Score gels, classify colonies, and export repair endpoint data.',
    component: EndpointAnalysisApp,
  },
  'colony-counter': {
    id: 'colony-counter',
    name: 'Colony Counter',
    description: 'Mark colonies on petri dish images and calculate CFU.',
    component: ColonyCounterApp,
  },
  'gel-quantification': {
    id: 'gel-quantification',
    name: 'Gel Quantification',
    description: 'Fiji-equivalent ROI measurement, box-in-box correction, and Excel export.',
    component: GelQuantificationApp,
  },
  'qpcr-analyzer': {
    id: 'qpcr-analyzer',
    name: 'qPCR Analysis',
    description: 'Open QuantStudio .eds files or Excel exports — plate setup, run info, ΔΔCt, and charts.',
    component: QPCRAnalyzerApp,
  },
  'figure-generator': {
    id: 'figure-generator',
    name: 'Figure Generator',
    description: 'Create publication-quality figures from CSV or Excel datasets with scientific formatting.',
    component: FigureGeneratorApp,
  },
};

export const TOOL_LIST = Object.values(TOOLS);
