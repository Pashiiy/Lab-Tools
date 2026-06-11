import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  REPAIR_COLORS,
  REPAIR_CATEGORIES,
  classifyColony,
} from '../constants/categories';

const GEL_KEYS = [
  { key: 'galcen', label: 'GalCen' },
  { key: 'cen3', label: 'Cen3' },
  { key: 'rearrangement', label: 'Rearrangement' },
  { key: 'reciprocal', label: 'Reciprocal' },
];

function toArgb(hex) {
  return 'FF' + hex.replace('#', '').toUpperCase();
}

function toLightArgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = 0.82;
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return `FF${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`.toUpperCase();
}

function cellFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = cellFill('FF1A1A2E');
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF00E5A0' } } };
  });
}

function getImageExtension(src) {
  if (src.includes('image/png')) return 'png';
  if (src.includes('image/jpeg') || src.includes('image/jpg')) return 'jpeg';
  return 'png';
}

function getBase64FromDataUrl(src) {
  return src.replace(/^data:image\/\w+;base64,/, '');
}

function buildRepairChartXml(classifiedCounts, dataSheetRef = 'Summary') {
  const filtered = classifiedCounts.filter(
    (e) => e.repairProduct !== 'UNCLASSIFIED' && e.count > 0
  );
  const total = filtered.reduce((s, e) => s + e.count, 0);

  const seriesXml = filtered
    .map((item, idx) => {
      const pct = total > 0 ? ((item.count / total) * 100).toFixed(2) : '0';
      const colorHex = (REPAIR_COLORS[item.repairProduct] || '#888888').replace('#', '');
      const rowNum = idx + 5;
      return `
  <c:ser>
    <c:idx val="${idx}"/>
    <c:order val="${idx}"/>
    <c:tx>
      <c:strRef>
        <c:f>${dataSheetRef}!$A$${rowNum}</c:f>
        <c:strCache>
          <c:ptCount val="1"/>
          <c:pt idx="0"><c:v>${item.repairProduct}</c:v></c:pt>
        </c:strCache>
      </c:strRef>
    </c:tx>
    <c:spPr>
      <a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill>
      <a:ln><a:noFill/></a:ln>
    </c:spPr>
    <c:cat>
      <c:strLit>
        <c:ptCount val="1"/>
        <c:pt idx="0"><c:v>Repair Distribution</c:v></c:pt>
      </c:strLit>
    </c:cat>
    <c:val>
      <c:numLit>
        <c:ptCount val="1"/>
        <c:pt idx="0"><c:v>${pct}</c:v></c:pt>
      </c:numLit>
    </c:val>
  </c:ser>`;
    })
    .join('');

  return buildPercentStackedBarChartXml('Repair Product Distribution', seriesXml);
}

function buildCategoryChartXml(categoryCounts, dataSheetRef = 'Summary', startRow = 20) {
  const filtered = categoryCounts.filter((e) => e.count > 0);
  const seriesXml = filtered
    .map((item, idx) => {
      const colorHex = (REPAIR_COLORS[item.repairProduct] || '#888888').replace('#', '');
      const rowNum = startRow + idx;
      return `
  <c:ser>
    <c:idx val="${idx}"/>
    <c:order val="${idx}"/>
    <c:tx>
      <c:strRef>
        <c:f>${dataSheetRef}!$A$${rowNum}</c:f>
        <c:strCache>
          <c:ptCount val="1"/>
          <c:pt idx="0"><c:v>Cat. ${item.categoryId}</c:v></c:pt>
        </c:strCache>
      </c:strRef>
    </c:tx>
    <c:spPr>
      <a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill>
      <a:ln><a:noFill/></a:ln>
    </c:spPr>
    <c:cat>
      <c:strRef>
        <c:f>${dataSheetRef}!$B$${rowNum}</c:f>
        <c:strCache>
          <c:ptCount val="1"/>
          <c:pt idx="0"><c:v>${item.categoryId}</c:v></c:pt>
        </c:strCache>
      </c:strRef>
    </c:cat>
    <c:val>
      <c:numRef>
        <c:f>${dataSheetRef}!$C$${rowNum}</c:f>
        <c:numCache>
          <c:ptCount val="1"/>
          <c:pt idx="0"><c:v>${item.count}</c:v></c:pt>
        </c:numCache>
      </c:numRef>
    </c:val>
  </c:ser>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:lang val="en-US"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1200"/><a:t>Category Classification</a:t></a:r></a:p></c:rich></c:tx></c:title>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        ${seriesXml}
        <c:axId val="10"/><c:axId val="20"/>
      </c:barChart>
      <c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="20"/></c:catAx>
      <c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="10"/></c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
  </c:chart>
</c:chartSpace>`;
}

function buildPercentStackedBarChartXml(title, seriesXml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:lang val="en-US"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr b="1" sz="1200"/><a:t>${title}</a:t></a:r></a:p></c:rich></c:tx></c:title>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="percentStacked"/>
        ${seriesXml}
        <c:axId val="1"/><c:axId val="2"/>
      </c:barChart>
      <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:numFmt formatCode="0%" sourceLinked="0"/><c:crossAx val="2"/></c:catAx>
      <c:valAx><c:axId val="2"/><c:delete val="1"/><c:axPos val="l"/><c:crossAx val="1"/></c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
  </c:chart>
</c:chartSpace>`;
}

function buildDrawingXml(chartId, fromRow, toRow, fromCol = 0, toCol = 7) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>${fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr><xdr:cNvPr id="${chartId}" name="Chart ${chartId}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId1"/></a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

async function addDrawingToSheet(zip, sheetIndex, drawingIndex, relId = 'rId99') {
  const sheetRelsPath = `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`;
  let sheetRels = (await zip.file(sheetRelsPath)?.async('string')) ?? '';
  const drawingRel = `  <Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingIndex}.xml"/>`;

  if (sheetRels.includes('Relationships>')) {
    if (!sheetRels.includes(`drawing${drawingIndex}.xml`)) {
      sheetRels = sheetRels.replace('</Relationships>', `${drawingRel}\n</Relationships>`);
      zip.file(sheetRelsPath, sheetRels);
    }
  } else {
    zip.file(
      sheetRelsPath,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRel}</Relationships>`
    );
  }

  const sheetPath = `xl/worksheets/sheet${sheetIndex}.xml`;
  let sheetXml = await zip.file(sheetPath).async('string');
  if (!sheetXml.includes(`r:id="${relId}"`)) {
    sheetXml = sheetXml.replace('</worksheet>', `  <drawing r:id="${relId}"/>\n</worksheet>`);
    zip.file(sheetPath, sheetXml);
  }
}

async function injectCharts(xlsxBuffer, classifiedCounts, categoryCounts) {
  const zip = await JSZip.loadAsync(xlsxBuffer);

  zip.file('xl/charts/chart1.xml', buildRepairChartXml(classifiedCounts, 'Summary'));
  zip.file('xl/drawings/drawing1.xml', buildDrawingXml(1, 12, 26));
  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`
  );
  await addDrawingToSheet(zip, 1, 1, 'rIdChart1');

  if (categoryCounts.length > 0) {
    const catDataStart = 20;
    zip.file('xl/charts/chart2.xml', buildCategoryChartXml(categoryCounts, 'Summary', catDataStart));
    zip.file('xl/drawings/drawing2.xml', buildDrawingXml(2, 24, 40));
    zip.file(
      'xl/drawings/_rels/drawing2.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/>
</Relationships>`
    );
    await addDrawingToSheet(zip, 1, 2, 'rIdChart2');
  }

  let contentTypes = await zip.file('[Content_Types].xml').async('string');
  const overrides = [
    ['/xl/charts/chart1.xml', 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml'],
    ['/xl/drawings/drawing1.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml'],
  ];
  if (categoryCounts.length > 0) {
    overrides.push(
      ['/xl/charts/chart2.xml', 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml'],
      ['/xl/drawings/drawing2.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml']
    );
  }
  overrides.forEach(([part, type]) => {
    if (!contentTypes.includes(part)) {
      contentTypes = contentTypes.replace(
        '</Types>',
        `  <Override PartName="${part}" ContentType="${type}"/>\n</Types>`
      );
    }
  });
  zip.file('[Content_Types].xml', contentTypes);

  return zip.generateAsync({ type: 'arraybuffer', mimeType: 'application/zip' });
}

function addColonyDataRows(sheet, colonies) {
  colonies.forEach((colony) => {
    const { categoryId, repairProduct } = classifyColony(colony);
    const color = REPAIR_COLORS[repairProduct] || '#888888';
    const row = sheet.addRow([
      colony.id,
      colony.galcen === 1 ? '✓' : '−',
      colony.cen3 === 1 ? '✓' : '−',
      colony.rearrangement === 1 ? '✓' : '−',
      colony.reciprocal === 1 ? '✓' : '−',
      categoryId || '?',
      repairProduct,
    ]);
    row.height = 18;
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = cellFill(toLightArgb(color));
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
    });
    row.getCell(6).font = { bold: true, color: { argb: toArgb(color) } };
    row.getCell(7).fill = cellFill(toArgb(color));
    row.getCell(7).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
}

export async function exportToExcel({
  strainName,
  colonies,
  colonyCount,
  classifiedCounts,
  categoryCounts,
  summaryCounts,
  gels,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Endpoint Analyzer';
  workbook.created = new Date();

  const { counts, classifiedTotal } = summaryCounts;
  const unclassified = counts.UNCLASSIFIED || 0;
  const totalClassified = classifiedCounts
    .filter((e) => e.repairProduct !== 'UNCLASSIFIED')
    .reduce((s, e) => s + e.count, 0);

  // Sheet 1: Report
  const reportSheet = workbook.addWorksheet('Report');
  reportSheet.mergeCells('A1:F1');
  reportSheet.getCell('A1').value = 'Endpoint Analysis Report';
  reportSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF111111' } };
  reportSheet.getCell('A2').value = `Strain: ${strainName || 'Unnamed'}`;
  reportSheet.getCell('A3').value = `Exported: ${new Date().toLocaleString()}`;
  reportSheet.getCell('A3').font = { size: 10, color: { argb: 'FF888888' } };
  reportSheet.addRow([]);
  reportSheet.addRow(['Metric', 'Value']);
  styleHeaderRow(reportSheet.getRow(5));
  [
    ['Total Colonies', colonyCount],
    ['Classified', classifiedTotal],
    ['Unclassified', unclassified],
    ['Classification Rate', colonyCount > 0 ? `${((classifiedTotal / colonyCount) * 100).toFixed(1)}%` : '0%'],
  ].forEach(([label, value]) => {
    const row = reportSheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: 'center' };
  });
  reportSheet.addRow([]);
  reportSheet.addRow(['Repair Product', 'Count', '% of Classified']);
  styleHeaderRow(reportSheet.lastRow);
  classifiedCounts
    .filter((e) => e.repairProduct !== 'UNCLASSIFIED')
    .forEach(({ repairProduct, count }) => {
      const pct = totalClassified > 0 ? `${((count / totalClassified) * 100).toFixed(1)}%` : '0%';
      const row = reportSheet.addRow([repairProduct, count, pct]);
      const color = REPAIR_COLORS[repairProduct];
      row.getCell(1).fill = cellFill(toArgb(color));
      row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.eachCell((c) => { c.alignment = { horizontal: 'center' }; });
    });
  reportSheet.columns = [{ width: 22 }, { width: 14 }, { width: 16 }];

  // Sheet 2: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = `Summary — ${strainName || 'Unnamed Strain'}`;
  summarySheet.getCell('A1').font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Repair Product', 'Categories', 'Count', 'Percentage']);
  styleHeaderRow(summarySheet.getRow(3));
  summarySheet.columns = [{ width: 20 }, { width: 18 }, { width: 10 }, { width: 14 }];

  classifiedCounts.forEach(({ repairProduct, count }) => {
    const color = REPAIR_COLORS[repairProduct] || '#888888';
    const letters = REPAIR_CATEGORIES.filter((c) => c.repairProduct === repairProduct)
      .map((c) => c.id)
      .join(', ');
    const pct =
      repairProduct === 'UNCLASSIFIED'
        ? 'N/A'
        : totalClassified > 0
          ? `${((count / totalClassified) * 100).toFixed(1)}%`
          : '0%';
    const row = summarySheet.addRow([repairProduct, letters, count, pct]);
    row.height = 20;
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = cellFill(toLightArgb(color));
    });
    row.getCell(1).fill = cellFill(toArgb(color));
    row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  summarySheet.addRow([]);
  summarySheet.addRow(['Category Data for Chart']);
  summarySheet.addRow(['Label', 'Category', 'Count', 'Repair Product']);
  styleHeaderRow(summarySheet.lastRow);
  const categoryStartRow = summarySheet.lastRow.number + 1;
  categoryCounts.forEach((item) => {
    const row = summarySheet.addRow([
      `Cat. ${item.categoryId}`,
      item.categoryId,
      item.count,
      item.repairProduct,
    ]);
    row.eachCell((c) => { c.alignment = { horizontal: 'center' }; });
  });
  void categoryStartRow;

  // Sheet 3: Classified Colonies
  const coloniesSheet = workbook.addWorksheet('Classified Colonies');
  coloniesSheet.mergeCells('A1:G1');
  coloniesSheet.getCell('A1').value = `Colony Classification — ${strainName || 'Unnamed'}`;
  coloniesSheet.getCell('A1').font = { bold: true, size: 14 };
  coloniesSheet.mergeCells('A2:G2');
  coloniesSheet.getCell('A2').value = `Exported: ${new Date().toLocaleString()}`;
  coloniesSheet.addRow([]);
  const colonyHeader = coloniesSheet.addRow([
    'Colony', 'GalCen', 'Cen3', 'Rearrangement', 'Reciprocal', 'Category', 'Repair Product',
  ]);
  styleHeaderRow(colonyHeader);
  coloniesSheet.columns = [
    { width: 9 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 20 },
  ];
  addColonyDataRows(coloniesSheet, colonies);
  coloniesSheet.views = [{ state: 'frozen', ySplit: 4 }];

  // Sheet 4: Images
  const imagesSheet = workbook.addWorksheet('Images');
  imagesSheet.mergeCells('A1:E1');
  imagesSheet.getCell('A1').value = 'Gel Images by Target';
  imagesSheet.getCell('A1').font = { bold: true, size: 14 };
  imagesSheet.columns = [{ width: 16 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 40 }];

  let imageRow = 3;
  const imageIds = [];

  for (let i = 0; i < GEL_KEYS.length; i++) {
    const { key, label } = GEL_KEYS[i];
    const gel = gels[key];
    const positive = colonies.filter((c) => c[key] === 1).length;
    const col = (i % 2) * 3;
    const sectionRow = imageRow;

    imagesSheet.getCell(sectionRow, col + 1).value = label;
    imagesSheet.getCell(sectionRow, col + 1).font = { bold: true, size: 12 };
    imagesSheet.getCell(sectionRow + 1, col + 1).value = 'Target:';
    imagesSheet.getCell(sectionRow + 1, col + 2).value = label;
    imagesSheet.getCell(sectionRow + 2, col + 1).value = 'File:';
    imagesSheet.getCell(sectionRow + 2, col + 2).value = gel.name || '—';
    imagesSheet.getCell(sectionRow + 3, col + 1).value = 'Positive:';
    imagesSheet.getCell(sectionRow + 3, col + 2).value = `${positive} / ${colonyCount}`;

    if (gel.src) {
      try {
        const imageId = workbook.addImage({
          base64: getBase64FromDataUrl(gel.src),
          extension: getImageExtension(gel.src),
        });
        imageIds.push(imageId);
        imagesSheet.addImage(imageId, {
          tl: { col: col, row: sectionRow + 4 },
          ext: { width: 240, height: 160 },
        });
      } catch (err) {
        imagesSheet.getCell(sectionRow + 4, col + 1).value = '(image embed failed)';
        console.warn(`Image embed failed for ${label}:`, err);
      }
    } else {
      imagesSheet.getCell(sectionRow + 4, col + 1).value = '(no image uploaded)';
    }

    if (i % 2 === 1) imageRow += 14;
  }

  void imageIds;

  // Sheet 5: Gels
  const gelsSheet = workbook.addWorksheet('Gels');
  gelsSheet.mergeCells('A1:G1');
  gelsSheet.getCell('A1').value = 'Gel Scoring Details';
  gelsSheet.getCell('A1').font = { bold: true, size: 14 };
  gelsSheet.columns = [
    { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 18 },
  ];

  let gelSectionRow = 3;
  GEL_KEYS.forEach(({ key, label }) => {
    const gel = gels[key];
    const positive = colonies.filter((c) => c[key] === 1).length;

    gelsSheet.getCell(gelSectionRow, 1).value = `${label} Gel`;
    gelsSheet.getCell(gelSectionRow, 1).font = { bold: true, size: 12 };
    gelsSheet.getCell(gelSectionRow + 1, 1).value = `File: ${gel.name || '—'}`;
    gelsSheet.getCell(gelSectionRow + 1, 3).value = `Positive colonies: ${positive}/${colonyCount}`;
    gelsSheet.getCell(gelSectionRow + 1, 5).value = `Brightness: ${gel.brightness}%  Rotation: ${gel.rotation}°`;

    if (gel.src) {
      try {
        const imageId = workbook.addImage({
          base64: getBase64FromDataUrl(gel.src),
          extension: getImageExtension(gel.src),
        });
        gelsSheet.addImage(imageId, {
          tl: { col: 0, row: gelSectionRow + 2 },
          ext: { width: 320, height: 200 },
        });
      } catch (err) {
        console.warn(`Gel image embed failed for ${label}:`, err);
      }
    }

    const scoreHeader = gelsSheet.addRow([]);
    scoreHeader.getCell(1).value = 'Colony';
    scoreHeader.getCell(2).value = 'Score';
    scoreHeader.getCell(3).value = 'Category';
    scoreHeader.getCell(4).value = 'Repair Product';
    styleHeaderRow(scoreHeader);

    colonies.forEach((colony) => {
      const { categoryId, repairProduct } = classifyColony(colony);
      const row = gelsSheet.addRow([
        colony.id,
        colony[key] === 1 ? '✓' : '−',
        categoryId || '?',
        repairProduct,
      ]);
      row.eachCell((c) => { c.alignment = { horizontal: 'center' }; });
    });

    gelSectionRow = gelsSheet.lastRow.number + 3;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const finalBuffer = await injectCharts(buffer, classifiedCounts, categoryCounts);

  const blob = new Blob([finalBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${strainName || 'endpoint'}_analysis.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
