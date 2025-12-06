'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, Server, Clock, FileText, Flame, Search, TrendingUp, Database, Cpu, MemoryStick, Network, GaugeIcon, HardDrive, Zap } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { HoneycombGrid } from '../components/Honeycomb';
import { SimpleChart } from '../components/Charts';
import { TimeFilter } from '../components/TimeFilter';
import { api, Summary, InfraHealth, ServicePerformance, LogVolume, SlowTrace, LogPattern, SystemPerformance, Hotspot } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(15); // Default 15 minutes
  const [summary, setSummary] = useState<Summary | null>(null);
  const [health, setHealth] = useState<InfraHealth[]>([]);
  const [perfData, setPerfData] = useState<{ name: string; value: number }[]>([]);
  const [logData, setLogData] = useState<{ name: string; value: number }[]>([]);
  const [traces, setTraces] = useState<SlowTrace[]>([]);
  const [patterns, setPatterns] = useState<LogPattern[]>([]);
  const [systemPerf, setSystemPerf] = useState<SystemPerformance | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  // Derived state for honeycomb
  const honeycombCells = health.map(h => ({
    id: h.hostname,
    label: h.hostname,  // Show full hostname
    status: h.status,
    tooltip: `${h.hostname}\nCPU: ${h.cpu_pressure.toFixed(1)}%\nMemory: ${h.mem_pressure.toFixed(1)}%`
  }));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Parallel data fetching using shared API
      const [
        summaryData,
        healthData,
        perfDataRes,
        logDataRes,
        tracesData,
        patternsData,
        sysData,
        hotspotsData
      ] = await Promise.all([
        api.getSummary(timeRange).catch(() => null),
        api.getInfraHealth(timeRange).catch(() => []),
        api.getServicePerformance(timeRange).catch(() => []),
        api.getLogVolume(timeRange).catch(() => []),
        api.getSlowTraces(timeRange).catch(() => []),
        api.getLogPatterns(timeRange).catch(() => []),
        api.getSystemPerformance(timeRange).catch(() => null),
        api.getHotspots(timeRange).catch(() => [])
      ]);

      if (summaryData) setSummary(summaryData);
      if (healthData) setHealth(healthData);
      if (perfDataRes) setPerfData(perfDataRes.map(d => ({ name: d.service_name, value: d.p95_latency })));
      if (logDataRes) setLogData(logDataRes.map(d => ({ name: d.level, value: d.count })));
      if (tracesData) setTraces(tracesData);
      if (patternsData) setPatterns(patternsData);
      if (sysData) setSystemPerf(sysData);
      if (hotspotsData) setHotspots(hotspotsData);

    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Mock data for latency trend (since we don't have an endpoint for it yet)
  const latencyTrendData = Array.from({ length: 20 }, (_, i) => ({
    name: `${i}m`,
    value: 100 + Math.random() * 50
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Top Navigation Bar */}
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              ObsFly
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search services, traces..."
                className="pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
              />
            </div>
            <TimeFilter selectedMinutes={timeRange} onTimeRangeChange={setTimeRange} />
            {/* <ThemeToggle /> */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-white dark:border-gray-800 shadow-sm"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1920px] mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Infrastructure Health (Honeycomb) - Increased height */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 h-[500px] flex flex-col">
            <h2 className="text-base font-semibold mb-3 flex items-center justify-between text-gray-900 dark:text-gray-200">
              <span className="flex items-center">Infrastructure Health</span>
              <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {health.length} Nodes
              </span>
            </h2>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {loading && health.length === 0 ? (
                <div className="text-gray-500 animate-pulse text-sm">Scanning infrastructure...</div>
              ) : (
                <HoneycombGrid cells={honeycombCells} />
              )}
            </div>
          </div>

          {/* Service Performance Chart - Increased height */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 h-[500px] flex flex-col">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Service Performance (P95)</h2>
            <div className="flex-1">
              <SimpleChart
                data={perfData}
                type="bar"
                color="#8b5cf6"
                onItemClick={(item) => router.push(`/apm/${encodeURIComponent(item.name)}`)}
              />
            </div>
          </div>
        </div>

        {/* Top Summary - 6 columns for more compact layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            title="Active Services"
            value={summary?.active_services || 0}
            icon={Server}
            loading={loading}
            change={summary?.active_services_change ? `${summary.active_services_change > 0 ? '+' : ''}${summary.active_services_change.toFixed(1)}%` : undefined}
            changeType="neutral"
          />
          <MetricCard
            title="Error Rate"
            value={`${((summary?.error_rate || 0) * 100).toFixed(2)}%`}
            icon={AlertTriangle}
            loading={loading}
            change={summary?.error_rate_change ? `${summary.error_rate_change > 0 ? '+' : ''}${summary.error_rate_change.toFixed(1)}%` : undefined}
            changeType={summary?.error_rate_change ? (summary.error_rate_change > 0 ? 'negative' : 'positive') : 'neutral'}
          />
          <MetricCard
            title="API Latency"
            value={`${(summary?.avg_latency || 0).toFixed(0)}ms`}
            icon={Clock}
            loading={loading}
            change={summary?.avg_latency_change ? `${summary.avg_latency_change > 0 ? '+' : ''}${summary.avg_latency_change.toFixed(1)}%` : undefined}
            changeType={summary?.avg_latency_change ? (summary.avg_latency_change > 0 ? 'negative' : 'positive') : 'neutral'}
          />
          <MetricCard
            title="Log Volume"
            value={`${((summary?.log_volume || 0) / 1000).toFixed(1)}k`}
            icon={FileText}
            loading={loading}
            change={summary?.log_volume_change ? `${summary.log_volume_change > 0 ? '+' : ''}${summary.log_volume_change.toFixed(1)}%` : undefined}
            changeType="neutral"
          />
          <MetricCard
            title="Throughput"
            value={`${(summary?.throughput || 0).toFixed(1)}/s`}
            icon={TrendingUp}
            loading={loading}
            change={summary?.throughput_change ? `${summary.throughput_change > 0 ? '+' : ''}${summary.throughput_change.toFixed(1)}%` : undefined}
            changeType={summary?.throughput_change ? (summary.throughput_change > 0 ? 'positive' : 'negative') : 'neutral'}
          />
          <MetricCard
            title="Data Ingested"
            value={`${(summary?.data_ingested || 0).toFixed(2)} GB`}
            icon={Database}
            loading={loading}
            change={summary?.data_ingested_change ? `${summary.data_ingested_change > 0 ? '+' : ''}${summary.data_ingested_change.toFixed(1)}%` : undefined}
            changeType="neutral"
          />
        </div>

        {/* Node Metrics Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">System Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              title="Avg CPU Usage"
              value={`${(systemPerf?.cpu_usage || 0).toFixed(1)}%`}
              icon={Cpu}
              loading={loading}
              change={(systemPerf?.cpu_usage_change || 0).toFixed(1)}
              changeType={(systemPerf?.cpu_usage_change || 0) < 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              title="Total Memory"
              value={`${(systemPerf?.memory_usage || 0).toFixed(1)} GB`}
              icon={MemoryStick}
              loading={loading}
              change={(systemPerf?.memory_usage_change || 0).toFixed(1)}
              changeType={(systemPerf?.memory_usage_change || 0) < 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              title="Network I/O"
              value={`${(systemPerf?.network_io || 0).toFixed(1)} MB/s`}
              icon={Network}
              loading={loading}
              change={(systemPerf?.network_io_change || 0).toFixed(1)}
              changeType="neutral"
            />
            <MetricCard
              title="Avg Disk Usage"
              value={`${(systemPerf?.disk_usage || 0).toFixed(1)}%`}
              icon={GaugeIcon}
              loading={loading}
              change={(systemPerf?.disk_usage_change || 0).toFixed(1)}
              changeType={(systemPerf?.disk_usage_change || 0) < 0 ? 'positive' : 'negative'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Latency Trend Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Latency Trend</h2>
            <div className="h-[200px]">
              <SimpleChart data={latencyTrendData} type="area" color="#10b981" />
            </div>
          </div>

          {/* Log Volume Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Log Volume by Level</h2>
            <div className="h-[200px]">
              <SimpleChart data={logData} type="bar" color="#3b82f6" />
            </div>
          </div>

          {/* Top Log Patterns - Moved here to fill the row */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 h-[256px] overflow-y-auto">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Top Log Patterns</h2>
            <div className="space-y-3">
              {patterns.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">No patterns detected</div>
              ) : patterns.map((p: LogPattern, i) => (
                <div key={i} className="flex items-start justify-between p-2 bg-gray-100 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                  <div className="flex-1 mr-2 min-w-0">
                    <div className="text-xs font-mono font-semibold text-blue-500 dark:text-blue-400 mb-1">{p.level}</div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 truncate" title={p.sample}>{p.sample}</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Slow Traces - Full width */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Recent Slow Traces</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Service</th>
                  <th className="px-3 py-2 text-left">Operation</th>
                  <th className="px-3 py-2 text-left">Trace ID</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {traces.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500 text-sm">No slow traces found</td>
                  </tr>
                ) : (
                  traces.slice(0, 5).map((t, i) => (
                    <tr
                      key={i}
                      onClick={() => router.push(`/apm/${encodeURIComponent(t.service_name)}`)}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 text-xs font-medium">{t.service_name}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{t.operation || 'unknown'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{t.trace_id.substring(0, 8)}...</td>
                      <td className="px-3 py-2 text-right font-medium text-amber-500 text-xs">{(t.duration * 1000).toFixed(0)}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infra Hotspots - Expanded to show all resource types */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
            <Flame className="w-4 h-4 mr-2 text-orange-500" />
            Infrastructure Hotspots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {hotspots.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-6 text-xs">No hotspots detected</div>
            ) : hotspots.map((h, i) => {
              // Determine icon and color based on resource type
              const getResourceIcon = (resource: string) => {
                switch (resource) {
                  case 'CPU': return <Cpu className="w-4 h-4 text-blue-500" />;
                  case 'MEM': return <MemoryStick className="w-4 h-4 text-purple-500" />;
                  case 'DISK': return <HardDrive className="w-4 h-4 text-yellow-500" />;
                  case 'NET': return <Network className="w-4 h-4 text-green-500" />;
                  case 'GPU': return <Zap className="w-4 h-4 text-orange-500" />;
                  default: return <Activity className="w-4 h-4 text-gray-500" />;
                }
              };

              return (
                <div
                  key={i}
                  onClick={() => router.push(`/infrastructure?node=${encodeURIComponent(h.hostname)}`)}
                  className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    {getResourceIcon(h.resource)}
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {h.resource === 'NET' ? `${h.value.toFixed(0)} MB/s` : `${h.value.toFixed(1)}%`}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate" title={h.hostname}>
                    {h.hostname}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xs font-medium text-gray-500 uppercase">{h.metric}</div>
                    {h.change !== undefined && h.change !== 0 && (
                      <span className={`text-xs font-medium ${h.change < 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {h.change > 0 ? '↑' : '↓'}{Math.abs(h.change).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main >
    </div >
  );
}
