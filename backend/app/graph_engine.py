"""
NetworkX-based Fraud Graph Engine.

Maintains a graph of entities (users, devices, IPs) and their relationships.
Detects fraud rings, shared infrastructure, and suspicious connection patterns.
"""

import networkx as nx
from datetime import datetime
from typing import Optional
from app.models import GraphRiskReport, FlaggedConnection


class FraudGraph:
    """
    A multi-relational graph tracking users, devices, IP addresses,
    and their transactional connections. Used to detect fraud rings
    and shared-infrastructure attacks.
    """

    def __init__(self):
        self.G = nx.Graph()
        self._flagged_entities: set[str] = set()

        # Seed with some known fraudulent entities for demo
        self._seed_known_fraud()

    def _seed_known_fraud(self):
        """Pre-populate graph with known fraudulent entities for realistic demo."""
        # Known fraudulent users
        fraud_users = [
            ("user_fraud_01", {"type": "user", "flagged": True, "reason": "Previous chargeback fraud"}),
            ("user_fraud_02", {"type": "user", "flagged": True, "reason": "Identity theft ring member"}),
            ("user_fraud_03", {"type": "user", "flagged": True, "reason": "Money laundering suspect"}),
        ]

        # Devices and IPs used by fraudsters
        fraud_devices = [
            ("dev_abc123", {"type": "device", "flagged": True, "reason": "Used in 12 fraud cases"}),
            ("dev_xyz789", {"type": "device", "flagged": True, "reason": "Spoofed device fingerprint"}),
        ]

        fraud_ips = [
            ("ip_185.220.101.45", {"type": "ip", "flagged": True, "reason": "Known Tor exit node"}),
            ("ip_91.219.237.22", {"type": "ip", "flagged": True, "reason": "Proxy service IP"}),
            ("ip_23.129.64.100", {"type": "ip", "flagged": True, "reason": "VPN endpoint, high fraud rate"}),
        ]

        # Add nodes
        for node_id, attrs in fraud_users + fraud_devices + fraud_ips:
            self.G.add_node(node_id, **attrs)
            self._flagged_entities.add(node_id)

        # Create connections (the fraud ring)
        self.G.add_edge("user_fraud_01", "dev_abc123", relation="uses_device")
        self.G.add_edge("user_fraud_02", "dev_abc123", relation="uses_device")  # shared device!
        self.G.add_edge("user_fraud_01", "ip_185.220.101.45", relation="from_ip")
        self.G.add_edge("user_fraud_02", "ip_185.220.101.45", relation="from_ip")  # shared IP!
        self.G.add_edge("user_fraud_03", "dev_xyz789", relation="uses_device")
        self.G.add_edge("user_fraud_03", "ip_91.219.237.22", relation="from_ip")
        self.G.add_edge("user_fraud_02", "ip_23.129.64.100", relation="from_ip")

    def flag_entity(self, entity_id: str, reason: str = "Manually flagged"):
        """Mark an entity as fraudulent."""
        self._flagged_entities.add(entity_id)
        if self.G.has_node(entity_id):
            self.G.nodes[entity_id]["flagged"] = True
            self.G.nodes[entity_id]["reason"] = reason

    def add_transaction(
        self,
        transaction_id: str,
        user_id: str,
        device_id: str,
        ip_address: str,
        amount: float,
        timestamp: datetime,
    ):
        """
        Register a transaction in the graph.
        Creates/updates nodes for user, device, IP and links them.
        """
        # Normalize IP to node ID
        ip_node = f"ip_{ip_address}"

        # Add/update user node
        if not self.G.has_node(user_id):
            self.G.add_node(user_id, type="user", flagged=False, tx_count=0, total_amount=0.0)
        self.G.nodes[user_id]["tx_count"] = self.G.nodes[user_id].get("tx_count", 0) + 1
        self.G.nodes[user_id]["total_amount"] = self.G.nodes[user_id].get("total_amount", 0.0) + amount
        self.G.nodes[user_id]["last_seen"] = timestamp.isoformat()

        # Add/update device node
        if not self.G.has_node(device_id):
            self.G.add_node(device_id, type="device", flagged=(device_id in self._flagged_entities))
        self.G.nodes[device_id]["last_seen"] = timestamp.isoformat()

        # Add/update IP node
        if not self.G.has_node(ip_node):
            self.G.add_node(ip_node, type="ip", flagged=(ip_node in self._flagged_entities))
        self.G.nodes[ip_node]["last_seen"] = timestamp.isoformat()

        # Add transaction node
        tx_node = f"tx_{transaction_id}"
        self.G.add_node(tx_node, type="transaction", amount=amount,
                        timestamp=timestamp.isoformat(), user=user_id)

        # Create edges
        self.G.add_edge(user_id, device_id, relation="uses_device")
        self.G.add_edge(user_id, ip_node, relation="from_ip")
        self.G.add_edge(user_id, tx_node, relation="made_transaction")

    def check_device_links(self, device_id: str) -> list[FlaggedConnection]:
        """Find flagged accounts that share this device."""
        connections = []
        if not self.G.has_node(device_id):
            return connections

        for neighbor in self.G.neighbors(device_id):
            node_data = self.G.nodes[neighbor]
            if node_data.get("flagged", False):
                connections.append(FlaggedConnection(
                    entity_type=node_data.get("type", "unknown"),
                    entity_id=neighbor,
                    connection_type="shared_device",
                    flagged_reason=node_data.get("reason", "Previously flagged"),
                    hop_distance=1,
                ))

        return connections

    def check_ip_links(self, ip_address: str) -> list[FlaggedConnection]:
        """Find flagged accounts that share this IP."""
        connections = []
        ip_node = f"ip_{ip_address}"
        if not self.G.has_node(ip_node):
            return connections

        for neighbor in self.G.neighbors(ip_node):
            node_data = self.G.nodes[neighbor]
            if node_data.get("flagged", False):
                connections.append(FlaggedConnection(
                    entity_type=node_data.get("type", "unknown"),
                    entity_id=neighbor,
                    connection_type="shared_ip",
                    flagged_reason=node_data.get("reason", "Previously flagged"),
                    hop_distance=1,
                ))

        return connections

    def check_second_hop(self, user_id: str) -> list[FlaggedConnection]:
        """
        Check 2-hop neighborhood for flagged entities.
        This catches fraud rings where users share devices/IPs with
        other users who are themselves connected to flagged entities.
        """
        connections = []
        if not self.G.has_node(user_id):
            return connections

        # BFS up to depth 2
        visited = set()
        for neighbor in self.G.neighbors(user_id):
            visited.add(neighbor)
            for second_hop in self.G.neighbors(neighbor):
                if second_hop == user_id or second_hop in visited:
                    continue
                visited.add(second_hop)
                node_data = self.G.nodes[second_hop]
                if node_data.get("flagged", False):
                    connections.append(FlaggedConnection(
                        entity_type=node_data.get("type", "unknown"),
                        entity_id=second_hop,
                        connection_type="indirect",
                        flagged_reason=node_data.get("reason", "2-hop connection to flagged entity"),
                        hop_distance=2,
                    ))

        return connections

    def get_cluster_size(self, entity_id: str) -> int:
        """Get the size of the connected component containing this entity."""
        if not self.G.has_node(entity_id):
            return 1
        component = nx.node_connected_component(self.G, entity_id)
        return len(component)

    def get_subgraph_data(self, entity_id: str, depth: int = 2) -> tuple[list[dict], list[dict]]:
        """
        Extract the local subgraph around an entity for visualization.
        Returns (nodes, edges) suitable for JSON serialization.
        """
        if not self.G.has_node(entity_id):
            return [], []

        # BFS to collect nodes within depth
        nodes_in_subgraph = set()
        queue = [(entity_id, 0)]
        while queue:
            node, d = queue.pop(0)
            if d > depth or node in nodes_in_subgraph:
                continue
            nodes_in_subgraph.add(node)
            if d < depth:
                for neighbor in self.G.neighbors(node):
                    queue.append((neighbor, d + 1))

        # Build serializable output
        nodes = []
        for n in nodes_in_subgraph:
            data = dict(self.G.nodes[n])
            data["id"] = n
            # Don't serialize non-serializable types
            for k, v in list(data.items()):
                if not isinstance(v, (str, int, float, bool, type(None))):
                    data[k] = str(v)
            nodes.append(data)

        edges = []
        for u, v, data in self.G.edges(data=True):
            if u in nodes_in_subgraph and v in nodes_in_subgraph:
                edges.append({
                    "source": u,
                    "target": v,
                    "relation": data.get("relation", "connected"),
                })

        return nodes, edges

    def analyze_transaction(
        self,
        transaction_id: str,
        user_id: str,
        device_id: str,
        ip_address: str,
        amount: float,
        timestamp: datetime,
    ) -> GraphRiskReport:
        """
        Full graph analysis for a transaction.
        Registers the transaction, checks all connections, and returns a risk report.
        """
        # Register the transaction in the graph
        self.add_transaction(transaction_id, user_id, device_id, ip_address, amount, timestamp)

        # Check direct connections
        device_flags = self.check_device_links(device_id)
        ip_flags = self.check_ip_links(ip_address)
        second_hop_flags = self.check_second_hop(user_id)

        all_flags = device_flags + ip_flags + second_hop_flags

        # Remove duplicate flags
        seen = set()
        unique_flags = []
        for f in all_flags:
            key = (f.entity_id, f.connection_type)
            if key not in seen:
                seen.add(key)
                unique_flags.append(f)

        # Calculate graph risk score
        risk_score = 0.0

        # Direct device sharing with flagged entities: +0.35 each
        shared_device_count = len(device_flags)
        risk_score += shared_device_count * 0.35

        # Direct IP sharing with flagged entities: +0.25 each
        shared_ip_count = len(ip_flags)
        risk_score += shared_ip_count * 0.25

        # Second-hop connections: +0.15 each
        risk_score += len(second_hop_flags) * 0.15

        # Cluster size penalty (large clusters = suspicious)
        cluster_size = self.get_cluster_size(user_id)
        if cluster_size > 5:
            risk_score += 0.10

        # Is this device itself flagged?
        if device_id in self._flagged_entities:
            risk_score += 0.30

        # Is this IP itself flagged?
        ip_node = f"ip_{ip_address}"
        if ip_node in self._flagged_entities:
            risk_score += 0.25

        risk_score = min(1.0, risk_score)

        # Subgraph for visualization
        nodes, edges = self.get_subgraph_data(user_id, depth=2)

        return GraphRiskReport(
            graph_risk_score=round(risk_score, 4),
            flagged_connections=unique_flags,
            shared_device_count=shared_device_count,
            shared_ip_count=shared_ip_count,
            cluster_size=cluster_size,
            is_in_fraud_ring=risk_score >= 0.5,
            subgraph_nodes=nodes,
            subgraph_edges=edges,
        )

    def get_stats(self) -> dict:
        """Return overall graph statistics."""
        node_types = {}
        for _, data in self.G.nodes(data=True):
            t = data.get("type", "unknown")
            node_types[t] = node_types.get(t, 0) + 1

        return {
            "total_nodes": self.G.number_of_nodes(),
            "total_edges": self.G.number_of_edges(),
            "node_types": node_types,
            "flagged_entities": len(self._flagged_entities),
            "connected_components": nx.number_connected_components(self.G),
        }
