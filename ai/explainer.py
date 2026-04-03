class AIExplainer:
    def explain(self, engine_results, final_score):
        explanations = []

        translations = {
            "temperature_anomaly": "Impossible cargo condition",
            "density_anomaly": "Physical impossibility",
            "quantity_mismatch": "Document inconsistency",
            "value_mismatch": "Financial discrepancy",
            "origin_fraud": "Origin fraud detected",
            "burst_activity": "Suspicious behavior pattern",
            "off_hours": "Timing anomaly",
            "new_account_high_value": "High-risk profile",
            "low_trust": "Untrusted entity",
            "unverified_kyc": "Unverified identity",
            "linked_company": "Network connection",
            "shared_director": "Shared director detected",
            "linked_to_fraud": "Linked to known fraud",
        }

        for _engine, result in engine_results.items():
            if result["score"] > 0.3:
                for key in result.get("details", {}):
                    if key in translations:
                        explanations.append(translations[key])

        if not explanations:
            return "No significant anomalies detected. Shipment appears normal."

        summary = f"Risk Score: {final_score}/100. "
        summary += "Key concerns: " + "; ".join(explanations[:3])
        return summary
