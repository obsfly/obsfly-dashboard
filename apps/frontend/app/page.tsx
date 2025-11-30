'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, Server, Clock, FileText, Flame, Search, TrendingUp, Database, Zap, Cpu, MemoryStick, Network, Gauge as GaugeIcon, Timer } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { HoneycombGrid } from '../components/Honeycomb';
import { SimpleChart } from '../components/Charts';
import { TimeFilter } from '../components/TimeFilter';
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
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [health, setHealth] = useState<InfraHealth[]>([]);
  const [performance, setPerformance] = useState<ServicePerformance[]>([]);
  const [logs, setLogs] = useState<LogVolume[]>([]);
  const [traces, setTraces] = useState<SlowTrace[]>([]);
  const [patterns, setPatterns] = useState<LogPattern[]>([]);
  const [hotspots, setHotspots] = useState<InfraHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRangeMinutes, setTimeRangeMinutes] = useState(15); // Default 15 minutes

  const fetchData = async () => {
    try {
      // Use centralized dummy data
      const { dummyDataService } = await import('../lib/dummyData');

      // Get summary metrics
      const summaryData = dummyDataService.getSummary();
      setSummary(summaryData);

      // Get infrastructure health (convert nodes to health format)
      const nodes = dummyDataService.getNodes();
      const healthData = nodes.slice(0, 100).map(node => ({
        pod: node.hostname,
        cpu_pressure: node.cpu_usage / 10, // Normalize to 0-10 scale
        mem_pressure: node.memory_usage_percent / 10,
        oom_kills: node.status === 'RED' ? 1 : 0,
        status: node.status
      }));
      setHealth(healthData);

      // Get service performance
      const servicesData = dummyDataService.getServices();
      setPerformance(servicesData);

      // Get logs (simulated distribution)
      setLogs([
        { level: 'INFO', count: 45000 },
        { level: 'WARN', count: 8500 },
        { level: 'ERROR', count: 2100 },
        { level: 'DEBUG', count: 12000 }
      ]);

      // Get traces
      const tracesData = dummyDataService.getTraces();
      setTraces(tracesData);

      // Patterns  
      setPatterns([
        { sample: 'Database connection timeout', level: 'ERROR', count: 145 },
        { sample: 'Cache miss for key', level: 'WARN', count: 892 },
        { sample: 'API rate limit exceeded', level: 'WARN', count: 234 },
        { sample: 'Successful user login', level: 'INFO', count: 5421 }
      ]);

      // Hotspots
      setHotspots([
        { pod: 'prod-db-001', metric: 'CPU Usage', value: 0.89, resource: 'CPU' },
        { pod: 'prod-api-045', metric: 'Memory RSS', value: 7.2, resource: 'MEM' },
        { pod: 'prod-worker-012', metric: 'CPU Usage', value: 0.92, resource: 'CPU' }
      ]);

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [timeRangeMinutes]);

  // Transform data for charts with proper units
  const perfData = performance.map(p => ({
    name: p.service_name,
    value: Math.round(p.p95_latency) // Already in milliseconds
  }));
  const logData = logs.map(l => ({ name: l.level, value: l.count }));

  // Generate latency trend data using centralized service
  const generateTrendData = async () => {
    const { dummyDataService } = await import('../lib/dummyData');
    return dummyDataService.generateTimeSeriesData(summary?.avg_latency || 150, 30, 12);
  };

  const latencyTrendData = [
    { name: '12m', value: 142 },
    { name: '11m', value: 155 },
    { name: '10m', value: 145 },
    { name: '9m', value: 152 },
    { name: '8m', value: 138 },
    { name: '7m', value: 165 },
    { name: '6m', value: 148 },
    { name: '5m', value: 142 },
    { name: '4m', value: 155 },
    { name: '3m', value: 149 },
    { name: '2m', value: 147 },
    { name: 'now', value: Math.round(summary?.avg_latency || 150) },
  ];

  // Transform data for Honeycomb
  const honeycombCells = health.map(h => ({
    id: h.pod,
    label: h.pod,
    status: h.status,
    tooltip: `${h.pod}\nCPU: ${h.cpu_pressure.toFixed(1)}% | Mem: ${h.mem_pressure.toFixed(1)}% | OOM: ${h.oom_kills}`
  }));


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4">
      <header className="mb-3 flex justify-between items-center bg-white dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Global Dashboard
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs, traces, hosts..."
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
          <TimeFilter
            selectedMinutes={timeRangeMinutes}
            onTimeRangeChange={setTimeRangeMinutes}
          />
          <div className="flex items-center space-x-2">
            <button onClick={fetchData} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-700">
              <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            {/* <ThemeToggle /> */}
          </div>
        </div>
      </header>

      <main className="space-y-3">
        {/* Top Summary - 6 columns for more compact layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
          <MetricCard
            title="Throughput"
            value="2.4k"
            icon={TrendingUp}
            change="+8%"
            changeType="positive"
          />
          <MetricCard
            title="Data Ingested"
            value="12.3 GB"
            icon={Database}
            change="+2.1 GB"
            changeType="positive"
          />
        </div>

        {/* Node Metrics Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Node Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              title="CPU Usage"
              value="45%"
              icon={Cpu}
              change="+2%"
              changeType="negative"
            />
            <MetricCard
              title="Memory"
              value="2.1 GB"
              icon={MemoryStick}
              change="+128 MB"
              changeType="positive"
            />
            <MetricCard
              title="Network I/O"
              value="128 MB/s"
              icon={Network}
              change="+12 MB/s"
              changeType="positive"
            />
            <MetricCard
              title="GPU Util"
              value="67%"
              icon={GaugeIcon}
              change="+5%"
              changeType="positive"
            />
            <MetricCard
              title="Uptime"
              value="15d 4h"
              icon={Timer}
              change="100%"
              changeType="positive"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Infrastructure Health (Honeycomb) */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
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
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Service Performance (P95)</h2>
            <div className="h-[250px]">
              <SimpleChart
                data={perfData}
                type="bar"
                color="#8b5cf6"
                onItemClick={(item) => router.push(`/apm/${encodeURIComponent(item.name)}`)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
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

          {/* Recent Slow Traces - moved here to fill gap */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Recent Slow Traces</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-gray-600 dark:text-gray-500 uppercase text-xs border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Service</th>
                    <th className="px-3 py-2 text-left">Operation</th>
                    <th className="px-3 py-2 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {traces.slice(0, 5).map((t, i) => (
                    <tr
                      key={i}
                      onClick={() => router.push(`/apm/${encodeURIComponent(t.service_name)}`)}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 text-xs">{t.service_name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{t.trace_id.substring(0, 8)}...</td>
                      <td className="px-3 py-2 text-right font-medium text-amber-500 text-xs">{(t.duration * 1000).toFixed(0)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Performance Metrics */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
              <Zap className="w-4 h-4 mr-2 text-yellow-500" />
              System Performance
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">45%</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">2.1 GB</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Network I/O</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">128 MB/s</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
                <span className="text-sm text-gray-600 dark:text-gray-400">Disk Usage</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">67%</span>
              </div>
            </div>
          </div>

          {/* Top Log Patterns */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-200">Top Log Patterns</h2>
            <div className="space-y-3">
              {patterns.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">No patterns detected</div>
              ) : patterns.map((p, i) => (
                <div key={i} className="flex items-start justify-between p-3 bg-gray-100 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                  <div className="flex-1 mr-3">
                    <div className="text-sm font-mono font-semibold text-blue-500 dark:text-blue-400 mb-2">{p.level}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{p.sample}</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[3rem] text-right">{p.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Infra Hotspots */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold mb-3 flex items-center text-gray-900 dark:text-gray-200">
            <Flame className="w-4 h-4 mr-2 text-orange-500" />
            Infrastructure Hotspots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hotspots.length === 0 ? (
              <div className="col-span-3 text-center text-gray-500 py-6 text-xs">No hotspots detected</div>
            ) : hotspots.map((h, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{h.pod}</div>
                  <div className="flex items-baseline space-x-2">
                    <div className="text-xs font-medium text-gray-500 uppercase">{h.metric}</div>
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
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
