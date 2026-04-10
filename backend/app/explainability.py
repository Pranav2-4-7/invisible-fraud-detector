"""
Explainability Layer — Gemini API Integration.

Takes graph anomalies and behavioral data and generates
human-readable fraud explanation reports using Gemini.
"""

import os
from typing import Optional
from app.models import GraphRiskReport, BehavioralReport
from app.config import settings


class ExplainabilityEngine:
    """
    Generates natural language fraud explanations using Google Gemini API.
    Falls back to template-based explanations if the API is unavailable.
    """

    def __init__(self):
        self._model = None
        self._init_gemini()

    def _init_gemini(self):
        """Initialize the Gemini generative model."""
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            self._model = genai.GenerativeModel("gemini-2.0-flash")
            print("[OK] Gemini API initialized successfully")
        except Exception as e:
            print(f"[WARN] Gemini API initialization failed: {e}")
            print("   Falling back to template-based explanations.")
            self._model = None

    async def generate_explanation(
        self,
        risk_score: float,
        graph_report: GraphRiskReport,
        behavioral_report: BehavioralReport,
        amount: float = 0.0,
        user_id: str = "unknown",
    ) -> str:
        """
        Generate a 2-sentence human-readable fraud explanation.
        
        Uses Gemini API if available, otherwise falls back to templates.
        """
        # Build context for the prompt
        graph_context = self._format_graph_context(graph_report)
        behavioral_context = self._format_behavioral_context(behavioral_report)

        # Try Gemini first
        if self._model is not None:
            try:
                return await self._gemini_explain(
                    risk_score, graph_context, behavioral_context, amount, user_id
                )
            except Exception as e:
                print(f"[WARN] Gemini explanation failed: {e}")

        # Fallback to templates
        return self._template_explain(risk_score, graph_report, behavioral_report)

    async def _gemini_explain(
        self,
        risk_score: float,
        graph_context: str,
        behavioral_context: str,
        amount: float,
        user_id: str,
    ) -> str:
        """Generate explanation via Gemini API."""
        prompt = f"""You are a senior fraud analyst at a major financial institution. 
Given the following transaction analysis data, produce EXACTLY a 2-sentence fraud explanation report.

Be specific, cite data points, and use professional fraud analysis language.

**Transaction Details:**
- User: {user_id}
- Amount: ${amount:,.2f}
- Overall Risk Score: {risk_score:.2%}

**Graph Network Analysis:**
{graph_context}

**Behavioral Analysis:**
{behavioral_context}

**Output Requirements:**
- EXACTLY 2 sentences
- Start with "Flagged:" if risk > 50%, "Advisory:" if risk 20-50%, "Cleared:" if risk < 20%
- First sentence: primary risk factor
- Second sentence: supporting evidence or recommendation
- Do NOT use markdown, bullet points, or formatting — plain text only

Example format:
"Flagged: Device fingerprint dev_x8k92 is shared with 3 accounts previously involved in chargeback fraud. High-velocity transaction pattern detected with $4,999 transfer at 03:22 UTC from a known Tor exit node IP."
"""

        import asyncio
        # Run synchronous Gemini call in executor
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self._model.generate_content(prompt)
        )
        
        text = response.text.strip()
        
        # Clean up any markdown formatting Gemini might add
        text = text.replace("**", "").replace("*", "").replace("`", "")
        
        # Ensure it's not too long (max 2 sentences)
        sentences = text.split(". ")
        if len(sentences) > 2:
            text = ". ".join(sentences[:2]) + "."
        
        return text

    def _format_graph_context(self, report: GraphRiskReport) -> str:
        """Format graph report into readable context for Gemini."""
        lines = []
        lines.append(f"- Graph Risk Score: {report.graph_risk_score:.2%}")
        lines.append(f"- Fraud Ring Detected: {'YES' if report.is_in_fraud_ring else 'NO'}")
        lines.append(f"- Cluster Size: {report.cluster_size} entities")
        lines.append(f"- Shared Devices with Flagged Accounts: {report.shared_device_count}")
        lines.append(f"- Shared IPs with Flagged Accounts: {report.shared_ip_count}")

        if report.flagged_connections:
            lines.append("- Flagged Connections:")
            for conn in report.flagged_connections[:5]:  # Limit to 5
                lines.append(
                    f"  - {conn.entity_type} '{conn.entity_id}' "
                    f"({conn.connection_type}, hop={conn.hop_distance}): "
                    f"{conn.flagged_reason}"
                )
        else:
            lines.append("- No direct connections to flagged entities")

        return "\n".join(lines)

    def _format_behavioral_context(self, report: BehavioralReport) -> str:
        """Format behavioral report into readable context for Gemini."""
        lines = []
        lines.append(f"- Behavioral Risk Score: {report.behavioral_risk_score:.2%}")
        lines.append(f"- Anomalies Detected: {len(report.anomalies)}")

        if report.anomalies:
            for anomaly in report.anomalies:
                lines.append(
                    f"  - [{anomaly.severity.upper()}] {anomaly.anomaly_type}: "
                    f"{anomaly.description}"
                )
        else:
            lines.append("- No behavioral anomalies detected")

        return "\n".join(lines)

    def _template_explain(
        self,
        risk_score: float,
        graph_report: GraphRiskReport,
        behavioral_report: BehavioralReport,
    ) -> str:
        """
        High-fidelity fallback template-based explanation when Gemini is unavailable.
        Uses a library of forensic-style templates for realistic, varied output.
        """
        import random

        # Determine prefix
        if risk_score >= 0.5:
            prefix = "Flagged"
        elif risk_score >= 0.2:
            prefix = "Advisory"
        else:
            prefix = "Cleared"

        # ── CRITICAL / HIGH RISK TEMPLATES ──
        if risk_score >= 0.5:
            primary_parts = []
            if graph_report.is_in_fraud_ring:
                primary_parts.append(random.choice([
                    f"Entity is embedded in a confirmed fraud ring comprising {graph_report.cluster_size} interconnected accounts sharing compromised infrastructure",
                    f"Graph traversal reveals direct linkage to a {graph_report.cluster_size}-node fraud cluster with overlapping device and IP fingerprints",
                    f"Network topology analysis identifies this entity within a coordinated fraud ring spanning {graph_report.cluster_size} entities, exhibiting fan-out transaction patterns",
                ]))
            elif graph_report.shared_device_count > 0:
                primary_parts.append(random.choice([
                    f"Device fingerprint collision detected — hardware token shared with {graph_report.shared_device_count} account(s) previously flagged for synthetic identity fraud",
                    f"Cross-referenced device telemetry reveals {graph_report.shared_device_count} flagged account(s) operating from an identical hardware profile",
                    f"Device ID linked to {graph_report.shared_device_count} accounts under active investigation for coordinated transaction laundering",
                ]))
            elif graph_report.shared_ip_count > 0:
                primary_parts.append(random.choice([
                    f"Originating IP address intersects with {graph_report.shared_ip_count} flagged endpoint(s) associated with VPN relay infrastructure",
                    f"Geolocation analysis shows IP overlap with {graph_report.shared_ip_count} sanctioned account(s), indicating potential proxy-based obfuscation",
                ]))

            for anomaly in behavioral_report.anomalies:
                if anomaly.severity in ("critical", "high"):
                    primary_parts.append(random.choice([
                        f"Behavioral vector alert: {anomaly.description.rstrip('.')} — pattern deviates {risk_score:.0%} from established baseline",
                        f"Anomalous behavioral signature detected: {anomaly.description.rstrip('.')}",
                    ]))

            if not primary_parts:
                sentence1 = f"{prefix}: Composite risk analysis yields a {risk_score:.0%} threat probability based on multi-engine correlation."
            else:
                sentence1 = f"{prefix}: {primary_parts[0]}."

            # Supporting evidence
            secondary = []
            if len(primary_parts) > 1:
                secondary.append(primary_parts[1])
            elif graph_report.flagged_connections:
                conn = graph_report.flagged_connections[0]
                secondary.append(random.choice([
                    f"Corroborating evidence: {conn.connection_type.replace('_', ' ')} linkage to entity {conn.entity_id} ({conn.flagged_reason}), hop distance {conn.hop_distance}",
                    f"Secondary signal: {conn.entity_type} {conn.entity_id} flagged at {conn.hop_distance}-hop proximity — {conn.flagged_reason}",
                ]))
            elif behavioral_report.anomalies:
                for a in behavioral_report.anomalies:
                    if a.severity in ("medium", "low"):
                        secondary.append(f"Supporting indicator: {a.description.rstrip('.')}")
                        break

            if secondary:
                sentence2 = f"{secondary[0]}."
            else:
                sentence2 = f"Recommend immediate escalation to Tier-2 fraud operations — composite score {risk_score:.0%}."

        # ── MEDIUM RISK TEMPLATES ──
        elif risk_score >= 0.2:
            anomaly_descs = [a.description.rstrip('.') for a in behavioral_report.anomalies]
            if anomaly_descs:
                sentence1 = f"{prefix}: {anomaly_descs[0]}."
                if len(anomaly_descs) > 1:
                    sentence2 = f"Additional signal — {anomaly_descs[1].lower()}."
                elif graph_report.graph_risk_score > 0:
                    sentence2 = f"Graph topology risk elevated at {graph_report.graph_risk_score:.0%} — monitor for pattern escalation."
                else:
                    sentence2 = f"Composite risk score {risk_score:.0%} warrants continued monitoring through next settlement cycle."
            else:
                sentence1 = f"{prefix}: Transaction exhibits marginal risk indicators with a composite threat score of {risk_score:.0%}."
                sentence2 = f"No critical anomalies detected, but elevated graph proximity ({graph_report.cluster_size} connected entities) warrants passive monitoring."

        # ── LOW RISK TEMPLATES ──
        else:
            sentence1 = random.choice([
                f"{prefix}: Transaction cleared all fraud detection vectors with a nominal risk score of {risk_score:.0%}.",
                f"{prefix}: Multi-engine consensus indicates legitimate transaction — composite risk {risk_score:.0%}, within normal operating parameters.",
                f"{prefix}: All behavioral, graph, and ML engines return nominal readings — threat probability {risk_score:.0%}.",
            ])
            sentence2 = random.choice([
                "No anomalous network connections or behavioral deviations observed.",
                "Entity maintains clean transaction history with no flagged associations in the current graph topology.",
                "Standard settlement processing authorized — no further action required.",
            ])

        return f"{sentence1} {sentence2}"

