class AIExplainer:
    def explain(self, engine_results, final_score):
        explanations = []

        translations = {
            "temperature_anomaly": "Cargo condition anomaly",
            "density_anomaly": "Physical inconsistency",
            "quantity_mismatch": "Document inconsistency",
            "value_mismatch": "Declared value variance",
            "origin_fraud": "Origin inconsistency detected",
            "burst_activity": "Submission pattern alert",
            "off_hours": "Timing anomaly",
            "new_account_high_value": "Entity profile alert",
            "low_trust": "Entity verification alert",
            "unverified_kyc": "Unverified identity",
            "linked_company": "Relationship signal",
            "shared_director": "Shared director detected",
            "linked_to_fraud": "Linked to prior discrepancies",
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
