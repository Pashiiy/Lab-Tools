import { useRef, useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { useGlobalTheme } from '../../../shared/useGlobalTheme';
import { getEndpointChartTheme } from '../utils/chartTheme';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { REPAIR_COLORS } from '../constants/categories';
import './ChartPanel.css';

const CHART_TYPES = [
  { id: 'pie', label: 'Pie', icon: '🥧' },
  { id: 'bar', label: 'Bar', icon: '▬' },
];

function getTooltipStyle(chartTheme) {
  return {
    background: chartTheme.tooltipBg,
    border: `1px solid ${chartTheme.tooltipBorder}`,
    borderRadius: 6,
    color: chartTheme.tooltipText,
  };
}

function StackedDistribution({
  classifiedCounts,
  stackedBarData,
  activeRepairProducts,
  chartTheme,
}) {
  if (!stackedBarData) {
    return (
      <div className="chart-panel__empty chart-panel__empty--compact">
        Score colonies to see distribution
      </div>
    );
  }

  return (
    <div className="chart-panel__stacked">
      <ResponsiveContainer width="100%" height={100}>
        <BarChart
          layout="vertical"
          data={stackedBarData}
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: chartTheme.tick, fontSize: 10 }}
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            formatter={(value, name) => [`${value}%`, name]}
            contentStyle={getTooltipStyle(chartTheme)}
          />
          {activeRepairProducts.map((repairProduct) => (
            <Bar
              key={repairProduct}
              dataKey={repairProduct}
              stackId="a"
              fill={REPAIR_COLORS[repairProduct]}
              radius={0}
            >
              <LabelList
                dataKey={repairProduct}
                position="inside"
                formatter={(v) => (v >= 6 ? `${v}%` : '')}
                style={{
                  fill: chartTheme.barLabel,
                  fontSize: 9,
                  fontFamily: 'DM Mono',
                  fontWeight: 'bold',
                }}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-panel__stacked-legend">
        {activeRepairProducts.map((rp) => {
          const entry = classifiedCounts.find((e) => e.repairProduct === rp);
          const pct = stackedBarData?.[0]?.[rp] ?? 0;
          return (
            <div key={rp} className="chart-panel__stacked-legend-item">
              <div
                className="chart-panel__stacked-swatch"
                style={{ background: REPAIR_COLORS[rp] }}
              />
              <span className="chart-panel__stacked-name">{rp}</span>
              <span className="chart-panel__stacked-count">{entry?.count ?? 0}</span>
              <span className="chart-panel__stacked-pct">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClassifiedColoniesChart({ categoryCounts, chartTheme }) {
  if (!categoryCounts.length) {
    return (
      <div className="chart-panel__empty chart-panel__empty--compact">
        No classified colonies yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={categoryCounts}
        margin={{ top: 8, right: 12, left: 0, bottom: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis
          dataKey="categoryId"
          tick={{ fill: chartTheme.tick, fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: chartTheme.tick, fontSize: 11 }}
          allowDecimals={false}
          label={{
            value: 'Colonies',
            angle: -90,
            position: 'insideLeft',
            fill: chartTheme.label,
            fontSize: 10,
          }}
        />
        <Tooltip
          contentStyle={getTooltipStyle(chartTheme)}
          formatter={(value, _name, props) => [
            `${value} colonies`,
            `${props.payload.categoryId} (${props.payload.repairProduct})`,
          ]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {categoryCounts.map((entry) => (
            <Cell key={entry.categoryId} fill={REPAIR_COLORS[entry.repairProduct]} />
          ))}
          <LabelList
            dataKey="count"
            position="top"
            style={{ fill: chartTheme.text, fontSize: 10, fontFamily: 'DM Mono' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ChartPanel({
  classifiedCounts,
  stackedBarData,
  categoryCounts,
  strainName,
  onExportExcel,
}) {
  const panelRef = useRef(null);
  const [chartType, setChartType] = useState('pie');
  const [fadeKey, setFadeKey] = useState(0);
  const { theme } = useGlobalTheme();
  const chartTheme = useMemo(() => getEndpointChartTheme(), [theme]);

  const totalClassified = useMemo(
    () => classifiedCounts.reduce((sum, entry) => sum + entry.count, 0),
    [classifiedCounts]
  );

  const hasData = classifiedCounts.length > 0;

  const activeRepairProducts = useMemo(
    () =>
      classifiedCounts
        .filter((e) => e.repairProduct !== 'UNCLASSIFIED' && e.count > 0)
        .map((e) => e.repairProduct),
    [classifiedCounts]
  );

  const switchChart = (type) => {
    setChartType(type);
    setFadeKey((k) => k + 1);
  };

  const exportPng = async () => {
    if (!panelRef.current) return;
    const canvas = await html2canvas(panelRef.current, {
      backgroundColor: chartTheme.exportBg,
      scale: 2,
    });
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${strainName || 'endpoint'}_chart.png`;
    link.click();
  };

  const renderAlternateChart = () => {
    if (!hasData) {
      return (
        <div className="chart-panel__empty chart-panel__empty--compact">
          Score colonies to see chart
        </div>
      );
    }

    if (chartType === 'pie') {
      return (
        <div className="chart-panel__pie-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={classifiedCounts}
                dataKey="count"
                nameKey="repairProduct"
                cx="50%"
                cy="45%"
                outerRadius={90}
                innerRadius={40}
                paddingAngle={2}
                label={({ repairProduct, percent, x, y }) => (
                  <text
                    x={x}
                    y={y}
                    fill={chartTheme.text}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                  >
                    {`${repairProduct} ${(percent * 100).toFixed(1)}%`}
                  </text>
                )}
                labelLine
              >
                {classifiedCounts.map((entry) => (
                  <Cell
                    key={entry.repairProduct}
                    fill={REPAIR_COLORS[entry.repairProduct]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} colonies`, name]}
                contentStyle={getTooltipStyle(chartTheme)}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: chartTheme.text, fontSize: 11 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-panel__donut-center">
            <span className="chart-panel__donut-total">{totalClassified}</span>
            <span className="chart-panel__donut-label">colonies</span>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={classifiedCounts}
          margin={{ top: 8, right: 16, left: 0, bottom: 36 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            dataKey="repairProduct"
            tick={{ fill: chartTheme.tick, fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fill: chartTheme.tick, fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: chartTheme.cursor }}
            contentStyle={getTooltipStyle(chartTheme)}
            formatter={(value) => [`${value} colonies`]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {classifiedCounts.map((entry) => (
              <Cell
                key={entry.repairProduct}
                fill={REPAIR_COLORS[entry.repairProduct]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="chart-panel" ref={panelRef}>
      <div className="chart-panel__toolbar">
        <span className="chart-panel__heading">Charts</span>
        <span className="chart-panel__strain">
          Strain: {strainName || '—'}
        </span>
      </div>

      <section className="chart-panel__section">
        <h4 className="chart-panel__section-title">Repair Product Distribution</h4>
        <StackedDistribution
          classifiedCounts={classifiedCounts}
          stackedBarData={stackedBarData}
          activeRepairProducts={activeRepairProducts}
          chartTheme={chartTheme}
        />
      </section>

      <section className="chart-panel__section">
        <div className="chart-panel__section-header">
          <h4 className="chart-panel__section-title">Alternate View</h4>
          <div className="chart-panel__tabs">
            {CHART_TYPES.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                className={`chart-panel__tab${chartType === id ? ' chart-panel__tab--active' : ''}`}
                onClick={() => switchChart(id)}
              >
                <span className="chart-panel__tab-icon">{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>
        <div key={fadeKey} className="chart-panel__chart chart-panel__chart--fade">
          {renderAlternateChart()}
        </div>
      </section>

      <section className="chart-panel__section chart-panel__section--last">
        <h4 className="chart-panel__section-title">Classified Colonies</h4>
        <ClassifiedColoniesChart
          categoryCounts={categoryCounts}
          chartTheme={chartTheme}
        />
      </section>

      <div className="chart-panel__footer">
        <button type="button" className="chart-panel__export" onClick={exportPng}>
          💾 Export Chart PNG
        </button>
        <button
          type="button"
          className="chart-panel__export"
          onClick={onExportExcel}
        >
          📋 Export Excel
        </button>
      </div>
    </div>
  );
}
