import EndpointAnalysisApp from '../apps/endpoint-analysis/EndpointAnalysisApp';
import ColonyCounterApp from '../apps/colony-counter/ColonyCounterApp';
import GelQuantificationApp from '../apps/gel-quantification/GelQuantificationApp';

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
};

export const TOOL_LIST = Object.values(TOOLS);
