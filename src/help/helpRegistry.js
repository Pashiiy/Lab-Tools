import gelQuantification from './content/gel-quantification.json';
import qpcrAnalyzer from './content/qpcr-analyzer.json';
import figureGenerator from './content/figure-generator.json';
import endpointAnalysis from './content/endpoint-analysis.json';
import colonyCounter from './content/colony-counter.json';

const HELP_CONTENT = {
  'gel-quantification': gelQuantification,
  'qpcr-analyzer': qpcrAnalyzer,
  'figure-generator': figureGenerator,
  'endpoint-analysis': endpointAnalysis,
  'colony-counter': colonyCounter,
};

/**
 * @param {string} toolId
 * @returns {import('./helpTypes').ToolHelpContent|null}
 */
export function getHelpContent(toolId) {
  return HELP_CONTENT[toolId] ?? null;
}

export function hasHelpContent(toolId) {
  return Boolean(HELP_CONTENT[toolId]);
}

export function listHelpToolIds() {
  return Object.keys(HELP_CONTENT);
}
