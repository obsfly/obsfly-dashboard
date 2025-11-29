package generator

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/namlabs/obsfly/backend/internal/store"
)

type ServiceProfile struct {
	Name      string
	Pods      []string
	BaseError float64 // 0.0 to 1.0
	Load      float64 // 0.0 to 1.0 (affects CPU/Latency)
}

func StartGenerating(ctx context.Context, s *store.Store) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// Define services with different profiles
	services := []ServiceProfile{
		{Name: "checkout-service", Pods: []string{"checkout-1", "checkout-2", "checkout-3"}, BaseError: 0.01, Load: 0.4},
		{Name: "payment-processor", Pods: []string{"payment-1", "payment-2"}, BaseError: 0.05, Load: 0.8}, // High load/error
		{Name: "user-service", Pods: []string{"user-1", "user-2", "user-3", "user-4"}, BaseError: 0.001, Load: 0.2},
		{Name: "api-gateway", Pods: []string{"gateway-1", "gateway-2"}, BaseError: 0.02, Load: 0.6},
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			var batch []store.Metric
			timestamp := time.Now()

			for _, svc := range services {
				for _, pod := range svc.Pods {
					// Simulate fluctuations
					currentLoad := svc.Load + (rand.Float64()*0.2 - 0.1) // +/- 10%
					if currentLoad < 0 {
						currentLoad = 0
					}
					if currentLoad > 1 {
						currentLoad = 1
					}

					// 1. Container Info (Active)
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_info", MetricType: "gauge", Value: 1,
					})

					// 2. HTTP Requests & Errors
					reqCount := 10 + rand.Float64()*100*currentLoad
					errRate := svc.BaseError
					if currentLoad > 0.8 {
						errRate *= 2
					} // Higher errors under load

					errCount := reqCount * errRate

					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_http_requests_total", MetricType: "counter", Value: reqCount,
						Labels: map[string]string{"status": "200"},
					})
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_http_requests_total", MetricType: "counter", Value: errCount,
						Labels: map[string]string{"status": "500"},
					})

					// 3. Latency (P95 simulation)
					latency := 0.1 + (currentLoad * 0.5) // Base 100ms + up to 500ms load
					if rand.Float64() < 0.05 {
						latency += 1.0
					} // Occasional spikes

					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_http_requests_duration_seconds_total", MetricType: "histogram", Value: latency,
					})

					// 4. Log Volume
					logVol := reqCount * 0.5
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_log_messages_total", MetricType: "counter", Value: logVol,
						Labels: map[string]string{"level": "INFO"},
					})
					if errCount > 0 {
						batch = append(batch, store.Metric{
							Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
							MetricName: "container_log_messages_total", MetricType: "counter", Value: errCount,
							Labels: map[string]string{"level": "ERROR"},
						})
					}

					// 5. Infrastructure Health (Pressure)
					// CPU Pressure
					cpuPressure := 0.0
					if currentLoad > 0.7 {
						cpuPressure = (currentLoad - 0.7) * 10
					} // Spike pressure if load > 70%
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_resources_cpu_pressure_waiting_seconds_total", MetricType: "gauge", Value: cpuPressure,
					})

					// Memory Pressure
					memPressure := 0.0
					if svc.Name == "payment-processor" && rand.Float64() < 0.3 {
						memPressure = 5.0
					} // Simulate mem leak
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_resources_memory_pressure_waiting_seconds_total", MetricType: "gauge", Value: memPressure,
					})

					// OOM Kills
					oom := 0.0
					if memPressure > 4.0 && rand.Float64() < 0.1 {
						oom = 1
					}
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_oom_kills_total", MetricType: "counter", Value: oom,
					})
					// 6. Traces (Slow Traces)
					if rand.Float64() < 0.05 { // 5% of requests are traced
						duration := 0.1 + rand.Float64()*2.0 // 100ms to 2.1s
						traceId := fmt.Sprintf("%x", rand.Int63())
						batch = append(batch, store.Metric{
							Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
							MetricName: "container_http_requests_duration_seconds_total", MetricType: "histogram", Value: duration,
							Labels: map[string]string{"trace_id": traceId},
						})
					}

					// 7. Log Patterns
					if rand.Float64() < 0.1 {
						patterns := []string{"Connection timeout", "Invalid credentials", "Payment declined", "Null pointer exception"}
						pattern := patterns[rand.Intn(len(patterns))]
						batch = append(batch, store.Metric{
							Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
							MetricName: "container_log_messages_total", MetricType: "counter", Value: 1,
							Labels: map[string]string{"pattern_hash": fmt.Sprintf("%x", len(pattern)), "sample": pattern, "level": "ERROR"},
						})
					}

					// 8. Infra Hotspots
					// CPU Usage
					cpuUsage := 0.1 + currentLoad
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_resources_cpu_usage_seconds_total", MetricType: "counter", Value: cpuUsage,
					})

					// Memory RSS
					memRss := 100*1024*1024 + (currentLoad * 500 * 1024 * 1024) // 100MB base + up to 500MB load
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_resources_memory_rss_bytes", MetricType: "gauge", Value: memRss,
					})

					// Disk Delay
					diskDelay := 0.0
					if currentLoad > 0.9 {
						diskDelay = rand.Float64() * 0.5
					}
					batch = append(batch, store.Metric{
						Timestamp: timestamp, AccountId: 1, ServiceName: svc.Name, Pod: pod,
						MetricName: "container_resources_disk_delay_seconds_total", MetricType: "counter", Value: diskDelay,
					})
				}
			}

			if err := s.InsertMetrics(ctx, batch); err != nil {
				fmt.Printf("Error inserting metrics: %v\n", err)
			} else {
				fmt.Printf("Generated %d metrics\n", len(batch))
			}
		}
	}
}
