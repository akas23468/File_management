import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Sparkles, 
  Search, 
  BookOpen, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight, 
  Layers, 
  Filter, 
  ShieldCheck, 
  ArrowUpRight,
  HelpCircle,
  BarChart3
} from 'lucide-react';

export const AiInsights: React.FC = () => {
  const { 
    topicInsights, 
    topicTrends, 
    queries, 
    setActiveView, 
    setActiveTopicFilter,
    setActiveCitationForModal,
    addQueryRecord,
    chunks,
    setToastMessage
  } = useApp();

  const handleTopicClick = (topicName: string) => {
    setActiveTopicFilter(topicName);
    setActiveView('knowledge');
  };

  const handleRerunStaleQuery = async (q: any) => {
    setToastMessage({ type: 'info', text: `Re-validating query "${q.questionText.slice(0, 40)}..." against latest approved knowledge chunks...` });
    
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.questionText,
          approvedChunks: chunks.filter(c => c.isApproved),
        }),
      });
      const data = await res.json();
      addQueryRecord({
        questionText: q.questionText,
        foundInKnowledgeBase: data.foundInKnowledgeBase,
        answerText: data.answer,
        aiSummary: data.aiSummary,
        confidence: data.confidence,
        citations: data.citations || [],
      });
      setToastMessage({ type: 'success', text: `Query re-validated! Refreshed answer added to active history.` });
      setActiveView('ai-assistant');
    } catch (err) {
      console.error(err);
    }
  };

  // Prepare data for Topic Coverage Bar Chart
  const coverageData = topicInsights.map((t) => ({
    topic: t.topic.length > 18 ? `${t.topic.slice(0, 16)}…` : t.topic,
    fullTopic: t.topic,
    occurrences: t.occurrences,
    confidence: t.confidence
  }));

  return (
    <div id="ai-insights-view" className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#141C2B] text-white border border-[#1E293B] rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C8892E] font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-[#C8892E]" />
            <span>Semantic Intelligence & Knowledge Topology</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-white">
            AI Insights & Topic Coverage
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Real-time keyword clusters, temporal exploration trends, and knowledge staleness monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#CBD5E1] bg-[#192234] px-3.5 py-2 rounded-lg border border-[#334155]">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>Active Ontology: {topicInsights.length} Technical Clusters</span>
        </div>
      </div>

      {/* Topic Coverage Bar Chart with Overflow Visible & High Z-Index Tooltips */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4 relative z-10 overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EFEBE2] gap-2">
          <div>
            <h3 className="font-serif font-bold text-base text-[#141C2B] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#C8892E]" />
              <span>Topic Coverage & Frequency Across Approved Records</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Quantified citations and extraction density across all statutory filings in the CMPDI repository.
            </p>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            Interactive Distribution
          </span>
        </div>

        <div className="h-64 w-full pt-2 relative z-20 overflow-visible">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={coverageData} 
              margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const topic = data.activePayload[0].payload.fullTopic;
                  handleTopicClick(topic);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E0D6" vertical={false} />
              <XAxis 
                dataKey="topic" 
                stroke="#64748B" 
                fontSize={10} 
                fontFamily="monospace" 
                tickLine={false}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} />
              <Tooltip 
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#141C2B] text-white p-3 rounded-lg shadow-xl border border-[#334155] text-xs font-mono z-50 pointer-events-none">
                        <div className="font-bold text-[#C8892E] mb-1">{d.fullTopic}</div>
                        <div className="text-[#E2E8F0]">Occurrences: <span className="font-bold text-white">{d.occurrences}</span> references</div>
                        <div className="text-[#94A3B8]">Extraction Confidence: <span className="font-bold text-[#22C55E]">{d.confidence}%</span></div>
                        <div className="text-[10px] text-[#94A3B8] mt-1.5 pt-1.5 border-t border-[#334155]">Click bar to filter Knowledge Center</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="occurrences" fill="#C8892E" radius={[4, 4, 0, 0]} className="cursor-pointer hover:opacity-85">
                {coverageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#C8892E' : '#141C2B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Keyword Cluster Cloud */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs relative z-0">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE2] mb-4">
          <h3 className="font-serif font-bold text-base text-[#141C2B]">
            Topic Cluster Cloud
          </h3>
          <span className="text-[11px] text-[#64748B]">Click to filter catalog</span>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center justify-center p-6 bg-[#FAF8F3] rounded-xl border border-[#E4E0D6] min-h-[180px]">
          {topicInsights.map((t, idx) => {
            const scaleClasses = [
              'text-base font-bold bg-[#141C2B] text-[#C8892E] px-3 py-1.5 shadow-xs',
              'text-sm font-bold bg-white text-[#141C2B] border border-[#C8892E] px-2.5 py-1',
              'text-xs font-semibold bg-[#EFEBE2] text-[#141C2B] px-2.5 py-1',
              'text-xs font-medium bg-white text-[#475569] border border-[#E4E0D6] px-2 py-0.5',
            ];
            const styleClass = scaleClasses[Math.min(idx, 3)];

            return (
              <button
                key={t.topic}
                onClick={() => handleTopicClick(t.topic)}
                className={`rounded-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ${styleClass}`}
                title={`${t.occurrences} references across approved records`}
              >
                <span>{t.topic}</span>
                <span className="text-[10px] opacity-70 ml-1.5 font-mono">({t.occurrences})</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-[#EFEBE2] flex items-center justify-between text-xs text-[#64748B]">
          <span>Algorithm: TF-IDF + Embeddings</span>
          <span className="font-mono text-[#141C2B]">100% Grounded</span>
        </div>
      </div>

      {/* Temporal Trends Over Time (Recharts) */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4 relative z-0 overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EFEBE2] gap-2">
          <div>
            <h3 className="font-serif font-bold text-base text-[#141C2B] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C8892E]" />
              <span>Topic Ingestion & Exploration Frequency (Monthly Aggregation: Apr 2025 – Feb 2026)</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Compiled continuously on the 1st of every month from technical search logs, repository uploads, and DGMS compliance reviews.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <span className="text-[11px] font-mono bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded border border-[#FDE68A] font-semibold">
              Seasonal Inundation Anomaly Detected (Sep 2025)
            </span>
          </div>
        </div>

        <div className="h-80 w-full min-h-[300px] pt-2 relative z-10 overflow-visible">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={topicTrends} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E0D6" vertical={false} />
              <XAxis dataKey="month" stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} fontFamily="monospace" tickLine={false} axisLine={false} />
              <Tooltip 
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 100 }}
                contentStyle={{ 
                  backgroundColor: '#141C2B', 
                  borderColor: '#334155', 
                  borderRadius: '10px', 
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }} 
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '16px' }} 
              />
              <Line type="monotone" dataKey="boreholeData" name="Borehole Data" stroke="#C8892E" strokeWidth={3} dot={{ r: 4, fill: '#C8892E' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="slopeStability" name="Slope Stability" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3.5, fill: '#2563EB' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="groundwater" name="Groundwater Seepage" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3.5, fill: '#16A34A' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="dgmsCompliance" name="DGMS Compliance" stroke="#9333EA" strokeWidth={2.5} dot={{ r: 3.5, fill: '#9333EA' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Frequently Asked Panel with Staleness Detection */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE2]">
          <div>
            <h3 className="font-serif font-bold text-base text-[#141C2B] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#C8892E]" />
              <span>Frequently Asked Inquiries & Stale-Answer Detection</span>
            </h3>
            <p className="text-xs text-[#64748B]">
              Queries automatically flag when cited documents have newer approved revisions in the repository.
            </p>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            Automated Revalidation Protocol
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {queries.map((q) => (
            <div 
              key={q.id}
              className={`p-4 rounded-xl border transition-all ${
                q.isStale 
                  ? 'bg-[#FFFBFB] border-[#FECACA]' 
                  : 'bg-[#FAF8F3] border-[#E4E0D6]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-[#141C2B] line-clamp-2">
                  Q: {q.questionText}
                </span>

                {q.isStale ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded border border-[#FECACA] flex-shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Source Updated</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded border border-[#BBF7D0] flex-shrink-0">
                    ✓ Fresh
                  </span>
                )}
              </div>

              <p className="text-xs text-[#475569] leading-relaxed bg-white p-3 rounded-lg border border-[#E4E0D6]/70 mb-3">
                {q.answerText}
              </p>

              {q.isStale ? (
                <div className="p-2.5 bg-[#FEF2F2] rounded-lg border border-[#FECACA] flex items-center justify-between gap-2 text-xs text-[#991B1B]">
                  <span className="text-[11px] font-medium">
                    ⚠️ {q.staleReason || 'Source document revised. Revalidation required.'}
                  </span>
                  <button
                    onClick={() => handleRerunStaleQuery(q)}
                    className="px-2.5 py-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded text-[11px] font-bold flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-run Query</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                  <span>Confidence: {q.confidence.toFixed(1)}%</span>
                  {q.citations[0] && (
                    <button
                      onClick={() => setActiveCitationForModal(q.citations[0])}
                      className="text-[#C8892E] hover:underline cursor-pointer"
                    >
                      View Source: {q.citations[0].documentCode} →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
