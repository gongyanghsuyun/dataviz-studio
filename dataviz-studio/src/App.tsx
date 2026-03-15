import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng, toSvg } from 'html-to-image';
import * as XLSX from 'xlsx';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label
} from 'recharts';
import { Plus, Trash2, BarChart2, LineChart as LineChartIcon, Save, FilePlus, Check, LayoutDashboard, Download, Upload, MessageSquare, ChevronUp } from 'lucide-react';

type DataPoint = {
  id: string;
  x: string;
  y: number | string;
  remark?: string;
  remarkTitle?: string;
  remarkColor?: 'gray' | 'green' | 'red' | 'yellow' | 'blue';
};

const REMARK_COLORS = [
  { id: 'gray', class: 'bg-gray-400', label: '灰色' },
  { id: 'green', class: 'bg-emerald-400', label: '浅绿色' },
  { id: 'red', class: 'bg-rose-400', label: '浅红色' },
  { id: 'yellow', class: 'bg-amber-400', label: '浅黄色' },
  { id: 'blue', class: 'bg-blue-400', label: '浅蓝色' },
];

const getRemarkColorClasses = (color?: string) => {
  switch (color) {
    case 'green': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'red': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'yellow': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'gray':
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getCardBorderClass = (color?: string) => {
  switch (color) {
    case 'green': return 'border-l-emerald-400';
    case 'red': return 'border-l-rose-400';
    case 'yellow': return 'border-l-amber-400';
    case 'blue': return 'border-l-blue-400';
    case 'gray':
    default: return 'border-l-gray-400';
  }
};

type Panel = {
  id: string;
  name: string;
  chartType: 'line' | 'bar';
  xAxisLabel: string;
  yAxisLabel: string;
  data: DataPoint[];
};

const CustomTooltip = ({ active, payload, label, xAxisLabel, yAxisLabel }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-neutral-100 text-sm min-w-[120px] pointer-events-none">
        <div className="mb-1.5 flex justify-between items-center gap-4">
          <span className="font-medium text-neutral-500">{xAxisLabel}</span>
          <span className="font-semibold text-neutral-900">{label}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="font-medium text-neutral-500">{yAxisLabel}</span>
          <span className="font-semibold text-indigo-600">{payload[0].value}</span>
        </div>
        {(dataPoint.remarkTitle || dataPoint.remark) && (
          <div className="mt-2 pt-2 border-t border-neutral-100">
            {dataPoint.remarkTitle && (
              <div className="font-bold text-neutral-800 text-xs mb-1">{dataPoint.remarkTitle}</div>
            )}
            {dataPoint.remark && (
              <div className="text-neutral-600 text-xs whitespace-pre-wrap">
                {dataPoint.remark}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function App() {
  // Export Ref
  const chartRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved Panels State
  const [panels, setPanels] = useState<Panel[]>(() => {
    const saved = localStorage.getItem('dataviz_panels');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });
  const [isSaved, setIsSaved] = useState(false);

  // Active Workspace State
  const [showRemarks, setShowRemarks] = useState<Record<string, boolean>>({});

  const toggleRemark = (id: string) => {
    setShowRemarks(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem('dataviz_activeId') || 'default-1');
  const [panelName, setPanelName] = useState(() => localStorage.getItem('dataviz_panelName') || '我的数据面板');
  const [chartType, setChartType] = useState<'line' | 'bar'>(() => (localStorage.getItem('dataviz_chartType') as 'line' | 'bar') || 'line');
  const [xAxisLabel, setXAxisLabel] = useState(() => localStorage.getItem('dataviz_xAxisLabel') || '月份');
  const [yAxisLabel, setYAxisLabel] = useState(() => localStorage.getItem('dataviz_yAxisLabel') || '收入 (¥)');
  const [data, setData] = useState<DataPoint[]>(() => {
    const saved = localStorage.getItem('dataviz_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: '1', x: '一月', y: 4000 },
      { id: '2', x: '二月', y: 3000 },
      { id: '3', x: '三月', y: 2000 },
      { id: '4', x: '四月', y: 2780 },
      { id: '5', x: '五月', y: 1890 },
      { id: '6', x: '六月', y: 2390 },
    ];
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('dataviz_panels', JSON.stringify(panels));
  }, [panels]);

  useEffect(() => {
    localStorage.setItem('dataviz_activeId', activeId);
    localStorage.setItem('dataviz_panelName', panelName);
    localStorage.setItem('dataviz_chartType', chartType);
    localStorage.setItem('dataviz_xAxisLabel', xAxisLabel);
    localStorage.setItem('dataviz_yAxisLabel', yAxisLabel);
    localStorage.setItem('dataviz_data', JSON.stringify(data));
  }, [activeId, panelName, chartType, xAxisLabel, yAxisLabel, data]);

  const handleAddDataPoint = () => {
    setData([...data, { id: Date.now().toString(), x: `数据点 ${data.length + 1}`, y: 0 }]);
  };

  const handleRemoveDataPoint = (id: string) => {
    setData(data.filter(d => d.id !== id));
  };

  const handleDataChange = (id: string, field: 'x' | 'y' | 'remark' | 'remarkColor' | 'remarkTitle', value: string) => {
    setData(data.map(d => {
      if (d.id === id) {
        return { ...d, [field]: field === 'y' ? (value === '' ? '' : Number(value)) : value };
      }
      return d;
    }));
  };

  const handleSave = () => {
    const newPanel: Panel = {
      id: activeId,
      name: panelName || '未命名面板',
      chartType,
      xAxisLabel,
      yAxisLabel,
      data: [...data]
    };

    const existingIndex = panels.findIndex(p => p.id === activeId);
    if (existingIndex >= 0) {
      const updated = [...panels];
      updated[existingIndex] = newPanel;
      setPanels(updated);
    } else {
      setPanels([newPanel, ...panels]);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleNew = () => {
    setActiveId(Date.now().toString());
    setPanelName('新数据面板');
    setChartType('line');
    setXAxisLabel('横坐标');
    setYAxisLabel('纵坐标');
    setData([
      { id: Date.now().toString() + '1', x: 'A', y: 100 },
      { id: Date.now().toString() + '2', x: 'B', y: 200 },
      { id: Date.now().toString() + '3', x: 'C', y: 300 },
    ]);
  };

  const loadPanel = (panel: Panel) => {
    setActiveId(panel.id);
    setPanelName(panel.name);
    setChartType(panel.chartType);
    setXAxisLabel(panel.xAxisLabel);
    setYAxisLabel(panel.yAxisLabel);
    setData(panel.data);
  };

  const deletePanel = (id: string) => {
    const updated = panels.filter(p => p.id !== id);
    setPanels(updated);
    if (id === activeId) {
      if (updated.length > 0) {
        loadPanel(updated[0]);
      } else {
        handleNew();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        if (parsedData.length > 0) {
          // Assume first row is headers if it contains strings, otherwise it's data
          const firstRow = parsedData[0];
          const hasHeaders = typeof firstRow[0] === 'string' && isNaN(Number(firstRow[0]));
          
          let startIndex = hasHeaders ? 1 : 0;
          
          if (hasHeaders) {
            setXAxisLabel(String(firstRow[0] || 'X轴'));
            setYAxisLabel(String(firstRow[1] || 'Y轴'));
          } else {
            setXAxisLabel('X轴');
            setYAxisLabel('Y轴');
          }

          const newData: DataPoint[] = [];
          for (let i = startIndex; i < parsedData.length; i++) {
            const row = parsedData[i];
            if (row && row.length > 0 && row[0] !== undefined) {
              newData.push({
                id: Date.now().toString() + i,
                x: String(row[0]),
                y: row[1] !== undefined && row[1] !== '' ? Number(row[1]) : 0
              });
            }
          }

          if (newData.length > 0) {
            setData(newData);
          } else {
            alert("未在文件中找到有效数据行。");
          }
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        alert("文件解析失败，请确保上传的是有效的 Excel 或 CSV 文件。");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = useCallback((format: 'png' | 'svg') => {
    if (chartRef.current === null) return;
    
    const filter = (node: HTMLElement) => {
      if (node?.classList?.contains('recharts-tooltip-wrapper')) return false;
      return true;
    };

    const exportFunc = format === 'png' ? toPng : toSvg;
    
    exportFunc(chartRef.current, { filter, backgroundColor: '#ffffff', pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `${panelName || 'chart'}.${format}`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('导出失败:', err);
      });
  }, [panelName]);

  const chartData = data.map(d => ({
    ...d,
    y: typeof d.y === 'number' ? d.y : 0
  }));

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-white border-r border-neutral-200 p-6 flex flex-col h-screen overflow-y-auto shadow-sm z-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            数据可视化
          </h1>
        </div>

        {/* Panel Management */}
        <div className="mb-8 pb-6 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-neutral-900">当前面板</label>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className={`text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200 font-medium ${
                  isSaved
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {isSaved ? '已保存' : '保存'}
              </button>
              <button
                onClick={handleNew}
                className="text-xs flex items-center gap-1.5 bg-neutral-100 text-neutral-600 px-2.5 py-1.5 rounded-md hover:bg-neutral-200 transition-colors font-medium"
              >
                <FilePlus className="w-3.5 h-3.5" /> 新建
              </button>
            </div>
          </div>
          <input
            type="text"
            value={panelName}
            onChange={(e) => setPanelName(e.target.value)}
            placeholder="输入面板名称..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
          />

          {panels.length > 0 && (
            <motion.div layout className="space-y-1 mt-5">
              <label className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">已保存的面板</label>
              <AnimatePresence mode="popLayout">
                {panels.map(p => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${
                      activeId === p.id 
                        ? 'bg-indigo-50 border border-indigo-200 shadow-sm' 
                        : 'hover:bg-neutral-50 border border-transparent'
                    }`}
                    onClick={() => loadPanel(p)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {p.chartType === 'line' ? (
                        <LineChartIcon className={`w-4 h-4 shrink-0 ${activeId === p.id ? 'text-indigo-600' : 'text-neutral-400'}`} />
                      ) : (
                        <BarChart2 className={`w-4 h-4 shrink-0 ${activeId === p.id ? 'text-indigo-600' : 'text-neutral-400'}`} />
                      )}
                      <span className={`text-sm truncate font-medium ${activeId === p.id ? 'text-indigo-900' : 'text-neutral-600 group-hover:text-neutral-900'}`}>
                        {p.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePanel(p.id); }}
                      className={`p-1.5 rounded-md transition-colors ${
                        activeId === p.id 
                          ? 'text-indigo-400 hover:text-red-500 hover:bg-indigo-100' 
                          : 'text-neutral-300 hover:text-red-500 hover:bg-neutral-200 opacity-0 group-hover:opacity-100'
                      }`}
                      title="删除面板"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Chart Type Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-neutral-900 mb-2">图表类型</label>
          <div className="flex bg-neutral-100 p-1 rounded-lg relative">
            <button
              onClick={() => setChartType('line')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors relative z-10 ${chartType === 'line' ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <LineChartIcon className="w-4 h-4" /> 折线图
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors relative z-10 ${chartType === 'bar' ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <BarChart2 className="w-4 h-4" /> 柱状图
            </button>
            {/* Animated background pill */}
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-sm"
              animate={{ left: chartType === 'line' ? '4px' : 'calc(50% + 0px)' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>

        {/* Axis Labels */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-1">横坐标 (X轴) 标题</label>
            <input
              type="text"
              value={xAxisLabel}
              onChange={(e) => setXAxisLabel(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-1">纵坐标 (Y轴) 标题</label>
            <input
              type="text"
              value={yAxisLabel}
              onChange={(e) => setYAxisLabel(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
            />
          </div>
        </div>

        {/* Data Points */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-neutral-900">数据设置</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors"
                title="支持上传 Excel (.xlsx, .xls) 或 CSV 文件"
              >
                <Upload className="w-3 h-3" /> 导入 Excel
              </button>
              <button
                onClick={handleAddDataPoint}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3 h-3" /> 添加行
              </button>
            </div>
          </div>
          
          <div className="space-y-2 pb-8">
            <div className="flex gap-2 px-1 mb-2">
              <span className="flex-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">X 坐标</span>
              <span className="flex-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Y 数值</span>
              <span className="w-8"></span>
            </div>
            <AnimatePresence mode="popLayout">
              {data.map((point) => (
                <motion.div
                  key={point.id}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="flex flex-col gap-2 group bg-white rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={point.x}
                      onChange={(e) => handleDataChange(point.id, 'x', e.target.value)}
                      placeholder="标签"
                      className="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                    />
                    <input
                      type="number"
                      value={point.y}
                      onChange={(e) => handleDataChange(point.id, 'y', e.target.value)}
                      placeholder="数值"
                      className="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                    />
                    <button
                      onClick={() => toggleRemark(point.id)}
                      className={`p-2 rounded-lg transition-colors ${point.remark || point.remarkTitle || showRemarks[point.id] ? 'text-indigo-600 bg-indigo-50' : 'text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                      title={showRemarks[point.id] ? "收起备注" : "展开/编辑备注"}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveDataPoint(point.id)}
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除行"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {showRemarks[point.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between px-1 pt-1">
                          <span className="text-xs font-bold text-neutral-500">备注与样式</span>
                          <button 
                            onClick={() => toggleRemark(point.id)}
                            className="text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1 transition-colors"
                          >
                            收起 <ChevronUp className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={point.remarkTitle || ''}
                          onChange={(e) => handleDataChange(point.id, 'remarkTitle', e.target.value)}
                          placeholder="卡片标题 (可选)"
                          className="w-full px-3 py-2 text-sm font-medium border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                        <textarea
                          value={point.remark || ''}
                          onChange={(e) => handleDataChange(point.id, 'remark', e.target.value)}
                          placeholder="输入关于此数据点的备注内容..."
                          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                          rows={2}
                        />
                        <div className="flex items-center gap-2 px-1 pb-1">
                          <span className="text-xs text-neutral-500">标签颜色:</span>
                          {REMARK_COLORS.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleDataChange(point.id, 'remarkColor', c.id)}
                              className={`w-4 h-4 rounded-full ${c.class} ${point.remarkColor === c.id || (!point.remarkColor && c.id === 'gray') ? 'ring-2 ring-offset-1 ring-neutral-400' : 'opacity-40 hover:opacity-100'} transition-all`}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
            {data.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-8 text-sm text-neutral-500 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50"
              >
                暂无数据。请添加一行数据以开始。
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto bg-neutral-50/50 flex flex-col gap-6">
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 border border-neutral-200 p-8 flex flex-col relative shrink-0" style={{ minHeight: '500px', height: '70vh' }}>
          <div className="mb-8 flex justify-between items-start">
            <div>
              <motion.h2 
                key={panelName}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-neutral-900 tracking-tight"
              >
                {panelName}
              </motion.h2>
              <p className="text-sm text-neutral-500 mt-1">您的数据已可视化为{chartType === 'line' ? '折线图' : '柱状图'}。</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('png')}
                className="text-xs flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-50 hover:text-indigo-600 transition-colors font-medium shadow-sm"
              >
                <Download className="w-4 h-4" /> 导出 PNG
              </button>
              <button
                onClick={() => handleExport('svg')}
                className="text-xs flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-700 px-3 py-2 rounded-lg hover:bg-neutral-50 hover:text-indigo-600 transition-colors font-medium shadow-sm"
              >
                <Download className="w-4 h-4" /> 导出 SVG
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 w-full relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeId + chartType}
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full h-full"
              >
                <div ref={chartRef} className="w-full h-full bg-white pb-6 pr-6">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      <LineChart data={chartData} margin={{ top: 30, right: 40, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                        <XAxis 
                          dataKey="x" 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          tickMargin={16}
                        >
                          <Label value={xAxisLabel} offset={20} position="bottom" style={{ fill: '#666', fontSize: 14, fontWeight: 600 }} />
                        </XAxis>
                        <YAxis 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          tickMargin={16}
                        >
                          <Label value={yAxisLabel} angle={-90} position="left" offset={20} style={{ textAnchor: 'middle', fill: '#666', fontSize: 14, fontWeight: 600 }} />
                        </YAxis>
                      <Tooltip 
                        content={<CustomTooltip xAxisLabel={xAxisLabel} yAxisLabel={yAxisLabel} />}
                        cursor={{ stroke: '#e5e5e5', strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="y" 
                        name={yAxisLabel || '数值'}
                        stroke="#4f46e5" 
                        strokeWidth={4}
                        dot={{ r: 5, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }}
                        activeDot={{ r: 8, fill: '#4f46e5', strokeWidth: 0 }}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 30, right: 40, left: 40, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                      <XAxis 
                        dataKey="x" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickMargin={16}
                      >
                        <Label value={xAxisLabel} offset={20} position="bottom" style={{ fill: '#666', fontSize: 14, fontWeight: 600 }} />
                      </XAxis>
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickMargin={16}
                      >
                        <Label value={yAxisLabel} angle={-90} position="left" offset={20} style={{ textAnchor: 'middle', fill: '#666', fontSize: 14, fontWeight: 600 }} />
                      </YAxis>
                      <Tooltip 
                        content={<CustomTooltip xAxisLabel={xAxisLabel} yAxisLabel={yAxisLabel} />}
                        cursor={{ fill: '#f3f4f6' }}
                        isAnimationActive={false}
                      />
                      <Bar 
                        dataKey="y" 
                        name={yAxisLabel || '数值'}
                        fill="#4f46e5" 
                        radius={[6, 6, 0, 0]}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Remarks Cards Area */}
        {data.some(d => d.remark && d.remark.trim() !== '') && (
          <div className="shrink-0 pb-8">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              数据备注
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {data.filter(d => d.remark && d.remark.trim() !== '').map(d => (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 ${getCardBorderClass(d.remarkColor)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getRemarkColorClasses(d.remarkColor)}`}>
                        {xAxisLabel}: {d.x}
                      </span>
                      <span className="text-sm font-bold text-neutral-700">
                        {yAxisLabel}: {d.y}
                      </span>
                    </div>
                    {d.remarkTitle && (
                      <h4 className="text-base font-bold text-neutral-900 mb-1.5">{d.remarkTitle}</h4>
                    )}
                    <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {d.remark}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
