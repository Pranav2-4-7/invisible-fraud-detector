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
            print("✅ Gemini API initialized successfully")
        except Exception as e:
            print(f"⚠️  Gemini API initialization failed: {e}")
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
                print(f"⚠️  Gemini explanation failed: {e}")

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
                    f"  • {conn.entity_type} '{conn.entity_id}' "
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
                    f"  • [{anomaly.severity.upper()}] {anomaly.anomaly_type}: "
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
        Fallback template-based explanation when Gemini is unavailable.
        Generates a reasonable 2-sentence explanation from the data.
        """
        # Determine prefix
        if risk_score >= 0.5:
            prefix = "Flagged"
        elif risk_score >= 0.2:
            prefix = "Advisory"
        else:
            prefix = "Cleared"

        # Build first sentence (primary risk)
        primary_reasons = []

        if graph_report.is_in_fraud_ring:
            primary_reasons.append(
                f"device linked to a fraud ring of {graph_report.cluster_size} entities"
            )
        elif graph_report.shared_device_count > 0:
            primary_reasons.append(
                f"device shared with {graph_report.shared_device_count} flagged account(s)"
            )
        elif graph_report.shared_ip_count > 0:
            primary_reasons.append(
                f"IP address shared with {graph_report.shared_ip_count} flagged account(s)"
            )

        for anomaly in behavioral_report.anomalies:
            if anomaly.severity in ("critical", "high"):
                primary_reasons.append(anomaly.description.lower().rstrip("."))

        if not primary_reasons:
            if risk_score < 0.2:
                sentence1 = f"{prefix}: Transaction passed all fraud detection checks with a low risk score of {risk_score:.0%}."
            else:
                sentence1 = f"{prefix}: Transaction flagged with a composite risk score of {risk_score:.0%} based on contextual analysis."
        else:
            sentence1 = f"{prefix}: {primary_reasons[0].capitalize()}."

        # Build second sentence (supporting)
        secondary = []
        if len(primary_reasons) > 1:
            secondary.append(primary_reasons[1].capitalize())
        elif graph_report.flagged_connections:
            conn = graph_report.flagged_connections[0]
            secondary.append(
                f"{conn.connection_type.replace('_', ' ').title()} connection "
                f"to {conn.entity_id} ({conn.flagged_reason})"
            )
        elif behavioral_report.anomalies:
            for a in behavioral_report.anomalies:
                if a.severity in ("medium", "low"):
                    secondary.append(a.description.rstrip("."))
                    break

        if secondary:
            sentence2 = f"{secondary[0]}."
        else:
            sentence2 = f"Composite risk score: {risk_score:.0%}."

        return f"{sentence1} {sentence2}"
