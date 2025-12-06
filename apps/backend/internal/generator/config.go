package generator

import (
	"fmt"
	"math/rand"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Nodes struct {
		Total         int `yaml:"total"`
		AwsEc2Count   int `yaml:"aws_ec2_count"`
		AwsCloudCount int `yaml:"aws_cloud_count"`
	} `yaml:"nodes"`

	Services struct {
		MinPerNode int      `yaml:"min_per_node"`
		MaxPerNode int      `yaml:"max_per_node"`
		Languages  []string `yaml:"languages"`
	} `yaml:"services"`

	Generation struct {
		IntervalSeconds int `yaml:"interval_seconds"`
		AccountID       int `yaml:"account_id"`
		RetentionDays   int `yaml:"retention_days"`
	} `yaml:"generation"`

	Metrics struct {
		CPURange     [2]int `yaml:"cpu_range"`
		MemoryRange  [2]int `yaml:"memory_range"`
		DiskRange    [2]int `yaml:"disk_range"`
		NetworkRange [2]int `yaml:"network_range"`
	} `yaml:"metrics"`

	Traces struct {
		SlowThresholdMs int      `yaml:"slow_threshold_ms"`
		ErrorRate       float64  `yaml:"error_rate"`
		Operations      []string `yaml:"operations"`
	} `yaml:"traces"`

	ClickHouse struct {
		Host     string `yaml:"host"`
		Port     int    `yaml:"port"`
		Database string `yaml:"database"`
		Username string `yaml:"username"`
		Password string `yaml:"password"`
	} `yaml:"clickhouse"`
}

type Node struct {
	ID          string
	Hostname    string
	IP          string
	Type        string // "aws_ec2" or "aws_cloud"
	Arch        string
	Cluster     string
	Services    []Service
	CPUUsage    float64
	MemoryUsage float64
	DiskUsage   float64
	NetworkMB   float64
}

type Service struct {
	Name     string
	Language string
	Version  string
	Port     int
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config YAML: %w", err)
	}

	return &cfg, nil
}

func GenerateNodes(cfg *Config) []Node {
	nodes := make([]Node, 0, cfg.Nodes.Total)

	cloudProviders := []string{"aws", "gcp", "azure"}
	regions := []string{"us-east-1", "us-west-2", "eu-central-1", "ap-south-1"}
	datacenters := []string{"dc-nyc", "dc-lon", "dc-sin", "dc-mum"}
	archs := []string{"x86_64", "arm64"}

	for i := 0; i < cfg.Nodes.Total; i++ {
		isCloud := rand.Float64() < 0.7 // 70% cloud
		arch := archs[rand.Intn(len(archs))]

		var node Node
		if isCloud {
			provider := cloudProviders[rand.Intn(len(cloudProviders))]
			region := regions[rand.Intn(len(regions))]
			instanceTypes := []string{"t3.medium", "m5.large", "c5.xlarge", "r5.2xlarge"}
			instanceType := instanceTypes[rand.Intn(len(instanceTypes))]

			node = Node{
				ID:       fmt.Sprintf("i-%016x", rand.Int63()),
				Hostname: fmt.Sprintf("%s-%s-%s-%03d", provider, region, instanceType, i),
				IP:       fmt.Sprintf("10.%d.%d.%d", rand.Intn(255), rand.Intn(255), rand.Intn(255)),
				Type:     "cloud", // "coloberative cloud"
				Arch:     arch,
				Cluster:  fmt.Sprintf("%s-%s", provider, region),
			}
		} else {
			dc := datacenters[rand.Intn(len(datacenters))]
			rack := rand.Intn(50) + 1
			unit := rand.Intn(42) + 1

			node = Node{
				ID:       fmt.Sprintf("node-%016x", rand.Int63()),
				Hostname: fmt.Sprintf("%s-r%d-u%d", dc, rack, unit),
				IP:       fmt.Sprintf("192.168.%d.%d", rand.Intn(255), rand.Intn(255)),
				Type:     "selfhost",
				Arch:     arch,
				Cluster:  dc,
			}
		}

		// Initialize base resource usage
		node.CPUUsage = float64(cfg.Metrics.CPURange[0] + rand.Intn(cfg.Metrics.CPURange[1]-cfg.Metrics.CPURange[0]))
		node.MemoryUsage = float64(cfg.Metrics.MemoryRange[0] + rand.Intn(cfg.Metrics.MemoryRange[1]-cfg.Metrics.MemoryRange[0]))
		node.DiskUsage = float64(cfg.Metrics.DiskRange[0] + rand.Intn(cfg.Metrics.DiskRange[1]-cfg.Metrics.DiskRange[0]))
		node.NetworkMB = float64(cfg.Metrics.NetworkRange[0] + rand.Intn(cfg.Metrics.NetworkRange[1]-cfg.Metrics.NetworkRange[0]))

		node.Services = generateServicesForNode(cfg, node.Hostname)
		nodes = append(nodes, node)
	}

	return nodes
}

func generateServicesForNode(cfg *Config, hostname string) []Service {
	// Random number of services between MinPerNode and MaxPerNode
	count := cfg.Services.MinPerNode + rand.Intn(cfg.Services.MaxPerNode-cfg.Services.MinPerNode+1)
	services := make([]Service, 0, count)

	serviceTemplates := []string{
		"api-gateway", "auth-service", "user-service", "order-service",
		"payment-service", "notification-service", "analytics-service",
		"search-service", "recommendation-engine", "cache-service",
		"worker-service", "scheduler-service", "webhook-service",
		"reporting-service", "audit-service", "inventory-service",
		"shipping-service", "billing-service", "email-service",
	}

	versions := map[string]string{
		"go":     "1.22.0",
		"python": "3.11",
		"nodejs": "20.10",
		"java":   "21",
		"rust":   "1.75",
		"dotnet": "8.0",
		"ruby":   "3.2",
		"php":    "8.3",
	}

	basePort := 8000

	// Shuffle templates to pick random unique services
	perm := rand.Perm(len(serviceTemplates))

	for i := 0; i < count; i++ {
		template := serviceTemplates[perm[i%len(serviceTemplates)]]
		lang := cfg.Services.Languages[i%len(cfg.Services.Languages)]

		service := Service{
			Name:     fmt.Sprintf("%s-%s", template, hostname),
			Language: lang,
			Version:  versions[lang],
			Port:     basePort + i,
		}

		services = append(services, service)
	}

	return services
}
