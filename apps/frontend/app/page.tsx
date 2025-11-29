'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Server, Clock, FileText, Flame, Search } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { HoneycombGrid } from '../components/Honeycomb';
import { SimpleChart } from '../components/Charts';
// import { ThemeToggle } from '../components/ThemeToggle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Types matching API response
interface Summary {
  active_services: number;
  error_rate: number;
  avg_latency: number;
  log_volume: number;
}

interface InfraHealth {
  pod: string;
  cpu_pressure: number;
  mem_pressure: number;
  oom_kills: number;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

interface ServicePerformance {
  service_name: string;
  p95_latency: number;
}

interface LogVolume {
  level: string;
  count: number;
}

interface SlowTrace {
  service_name: string;
  trace_id: string;
  duration: number;
}

interface LogPattern {
  sample: string;
  level: string;
  count: number;
}

interface InfraHotspot {
  pod: string;
  metric: string;
  value: number;
  resource: string;
}

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [health, setHealth] = useState<InfraHealth[]>([]);
  const [performance, setPerformance] = useState<ServicePerformance[]>([]);
  const [logs, setLogs] = useState<LogVolume[]>([]);
  const [traces, setTraces] = useState<SlowTrace[]>([]);
  const [patterns, setPatterns] = useState<LogPattern[]>([]);
  const [hotspots, setHotspots] = useState<InfraHotspot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

      const [summaryRes, healthRes, perfRes, logsRes, tracesRes, patternsRes, hotspotsRes] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard/summary`),
        fetch(`${apiUrl}/api/dashboard/health`),
        fetch(`${apiUrl}/api/dashboard/performance`),
        fetch(`${apiUrl}/api/dashboard/logs`),
        fetch(`${apiUrl}/api/dashboard/traces`),
        fetch(`${apiUrl}/api/dashboard/patterns`),
        fetch(`${apiUrl}/api/dashboard/hotspots`)
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
      if (perfRes.ok) setPerformance(await perfRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (tracesRes.ok) setTraces(await tracesRes.json());
      if (patternsRes.ok) setPatterns(await patternsRes.json());
      if (hotspotsRes.ok) setHotspots(await hotspotsRes.json());

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Transform data for charts
  const perfData = performance.map(p => ({ name: p.service_name, value: Math.round(p.p95_latency * 1000) }));
  const logData = logs.map(l => ({ name: l.level, value: l.count }));

  // Transform data for Honeycomb
  const honeycombCells = health.map(h => ({
    id: h.pod,
    label: h.pod,
    status: h.status,
    tooltip: `CPU: ${h.cpu_pressure.toFixed(2)} | Mem: ${h.mem_pressure.toFixed(2)} | OOM: ${h.oom_kills}`
  }));

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 light:bg-gray-50 text-white dark:text-white light:text-gray-900 p-4">
      <header className="mb-4 flex justify-between items-center bg-gray-900/50 dark:bg-gray-900/50 light:bg-white p-4 rounded-lg border border-gray-800 dark:border-gray-800 light:border-gray-200 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-white light:text-gray-900">
            Global Dashboard
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs, traces, hosts..."
              className="bg-gray-800 dark:bg-gray-800 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 dark:text-gray-300 light:text-gray-700 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Last 15 min
          </button>
          <button onClick={fetchData} className="p-2 bg-gray-800 dark:bg-gray-800 light:bg-gray-200 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-gray-300 transition-colors border border-gray-700 dark:border-gray-700 light:border-gray-300">
            <Activity className="w-4 h-4 text-gray-400 dark:text-gray-400 light:text-gray-600" />
          </button>
          {/* <ThemeToggle /> */}
        </div>
      </header>

      <main className="space-y-4">
        {/* Top Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Services"
            value={summary?.active_services || 0}
            icon={Server}
            change="+5%"
            changeType="positive"
          />
          <MetricCard
            title="Error Rate"
            value={`${((summary?.error_rate || 0) * 100).toFixed(2)}%`}
            icon={AlertTriangle}
            change="-0.05%"
            changeType="positive"
          />
          <MetricCard
            title="API Latency"
            value={`${(summary?.avg_latency || 0).toFixed(0)}ms`}
            icon={Clock}
            change="-12ms"
            changeType="positive"
          />
          <MetricCard
            title="Log Volume"
            value={`${((summary?.log_volume || 0) / 1000).toFixed(1)}k`}
            icon={FileText}
            change="+1.2k/hr"
            changeType="positive"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Infrastructure Health (Honeycomb) */}
          <div className="lg:col-span-2 bg-gray-900 dark:bg-gray-900 light:bg-white rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
            <h2 className="text-base font-semibold mb-4 flex items-center text-gray-200 dark:text-gray-200 light:text-gray-900">
              Infrastructure Health
            </h2>
            <div className="flex items-center justify-center min-h-[250px]">
              {loading ? (
                <div className="text-gray-500 animate-pulse text-sm">Scanning infrastructure...</div>
              ) : (
                <HoneycombGrid cells={honeycombCells} />
              )}
            </div>
          </div>

          {/* Service Performance Chart */}
          <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
            <h2 className="text-base font-semibold mb-4 text-gray-200 dark:text-gray-200 light:text-gray-900">Service Performance (P95)</h2>
            <div className="h-[250px]">
              <SimpleChart data={perfData} type="bar" color="#8b5cf6" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Log Volume Chart */}
          <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
            <h2 className="text-base font-semibold mb-4 text-gray-200 dark:text-gray-200 light:text-gray-900">Log Volume</h2>
            <div className="h-[200px]">
              <SimpleChart data={logData} type="bar" color="#3b82f6" />
            </div>
          </div>

          {/* Recent Slow Traces */}
          <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
            <h2 className="text-base font-semibold mb-4 text-gray-200 dark:text-gray-200 light:text-gray-900">Recent Slow Traces</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-gray-500 dark:text-gray-500 light:text-gray-600 uppercase text-xs border-b border-gray-800 dark:border-gray-800 light:border-gray-200">
                  <tr>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Trace ID</th>
                    <th className="px-3 py-2 font-medium text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 dark:divide-gray-800 light:divide-gray-200">
                  {traces.length === 0 ? (
                    <tr><td colSpan={3} className="p-3 text-center text-gray-500 text-xs">No slow traces</td></tr>
                  ) : traces.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-800/50 dark:hover:bg-gray-800/50 light:hover:bg-gray-100 transition-colors">
                      <td className="px-3 py-2 text-gray-300 dark:text-gray-300 light:text-gray-700 text-xs">{t.service_name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{t.trace_id.substring(0, 8)}...</td>
                      <td className="px-3 py-2 text-right font-medium text-amber-500 text-xs">{(t.duration * 1000).toFixed(0)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Log Patterns */}
          <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
            <h2 className="text-base font-semibold mb-4 text-gray-200 dark:text-gray-200 light:text-gray-900">Top Log Patterns</h2>
            <div className="space-y-3">
              {patterns.length === 0 ? (
                <div className="text-center text-gray-500 text-xs">No patterns detected</div>
              ) : patterns.map((p, i) => (
                <div key={i} className="flex items-start justify-between p-2 bg-gray-800/30 dark:bg-gray-800/30 light:bg-gray-100 rounded-lg border border-gray-800 dark:border-gray-800 light:border-gray-200 hover:border-gray-700 dark:hover:border-gray-700 light:hover:border-gray-300 transition-colors">
                  <div className="flex-1 mr-3">
                    <div className="text-xs text-red-400 font-mono mb-1">{p.level}</div>
                    <div className="text-xs text-gray-300 dark:text-gray-300 light:text-gray-700 line-clamp-2">{p.sample}</div>
                  </div>
                  <div className="text-base font-bold text-gray-500">{p.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Infra Hotspots */}
        <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
          <h2 className="text-base font-semibold mb-4 flex items-center text-gray-200 dark:text-gray-200 light:text-gray-900">
            <Flame className="w-4 h-4 mr-2 text-orange-500" />
            Infrastructure Hotspots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hotspots.length === 0 ? (
              <div className="col-span-3 text-center text-gray-500 py-6 text-xs">No hotspots detected</div>
            ) : hotspots.map((h, i) => (
              <div key={i} className="bg-gray-800/50 dark:bg-gray-800/50 light:bg-gray-100 rounded-lg p-3 border border-gray-800 dark:border-gray-800 light:border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 mb-1">{h.pod}</div>
                  <div className="text-xs font-medium text-gray-500 uppercase">{h.metric}</div>
                </div>
                <div className="text-lg font-bold text-white dark:text-white light:text-gray-900">
                  {h.resource === 'MEM' ? `${(h.value / 1024 / 1024).toFixed(0)} MB` : h.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
