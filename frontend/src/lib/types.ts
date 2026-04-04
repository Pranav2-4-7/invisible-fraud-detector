/**
 * TypeScript type definitions for the fraud detection system.
 * Mirrors the Python Pydantic models.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface FlaggedConnection {
  entity_type: string;
  entity_id: string;
  connection_type: string;
  flagged_reason: string;
  hop_distance: number;
}

export interface GraphRiskReport {
  graph_risk_score: number;
  flagged_connections: FlaggedConnection[];
  shared_device_count: number;
  shared_ip_count: number;
  cluster_size: number;
  is_in_fraud_ring: boolean;
  subgraph_nodes: GraphNode[];
  subgraph_edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  flagged?: boolean;
  reason?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface BehavioralAnomaly {
  anomaly_type: string;
  description: string;
  severity: string;
  data_points?: Record<string, unknown>;
}

export interface BehavioralReport {
  behavioral_risk_score: number;
  anomalies: BehavioralAnomaly[];
  is_anomalous: boolean;
}

export interface Transaction {
  transaction_id: string;
  user_id: string;
  amount: number;
  ip_address: string;
  device_id: string;
  timestamp: string;
  merchant: string;
  currency: string;
  status?: string;
  risk_score?: number;
  created_at?: string;
  analyzed_at?: string;
}

export interface FraudAlert {
  transaction_id: string;
  user_id: string;
  amount: number;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  is_fraud: boolean;
  explanation: string;
  
  // Graph data
  graph_risk_score: number;
  is_in_fraud_ring: boolean;
  shared_device_count: number;
  shared_ip_count: number;
  cluster_size: number;
  flagged_connections: FlaggedConnection[];
  
  // Behavioral data
  behavioral_risk_score: number;
  anomalies: BehavioralAnomaly[];
  
  // Graph visualization
  subgraph_nodes: GraphNode[];
  subgraph_edges: GraphEdge[];
  
  // Metadata
  processing_time_ms: number;
  created_at: string;
}

export interface FraudAnalysisResult {
  transaction_id: string;
  user_id: string;
  amount: number;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  is_fraud: boolean;
  graph_report: GraphRiskReport;
  behavioral_report: BehavioralReport;
  explanation: string;
  processing_time_ms: number;
  analyzed_at: string;
}
