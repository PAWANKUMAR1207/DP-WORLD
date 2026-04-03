from config import LOW_RISK, MEDIUM_RISK, WEIGHTS


class ScoringEngine:
    def calculate(self, engine_results, ml_probability=None):
        rule_score = sum(
            result["score"] * WEIGHTS.get(engine, 0.20)
            for engine, result in engine_results.items()
        )

        if ml_probability is not None:
            max_rule_score = max(
                (result["score"] for result in engine_results.values()),
                default=0,
            )
            if max_rule_score >= 0.9:
                final_score = int((0.2 * ml_probability + 0.8 * rule_score) * 100)
            elif max_rule_score > 0.7:
                final_score = int((0.4 * ml_probability + 0.6 * rule_score) * 100)
            else:
                final_score = int((0.6 * ml_probability + 0.4 * rule_score) * 100)
        else:
            final_score = int(rule_score * 100)

        if final_score <= LOW_RISK:
            classification, action = "LOW", "Direct clearance"
        elif final_score <= MEDIUM_RISK:
            classification, action = "MEDIUM", "Secondary inspection"
        else:
            classification, action = "HIGH", "Full inspection"

        return {
            "risk_score": final_score,
            "classification": classification,
            "recommended_action": action,
            "engine_breakdown": {k: v["score"] for k, v in engine_results.items()},
        }
