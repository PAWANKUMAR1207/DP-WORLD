#!/usr/bin/env python3
import sys
from collections import Counter

from ai import AIExplainer
from demo import SCENARIOS
from engines import (
    BehaviorEngine,
    DocumentEngine,
    NetworkEngine,
    PhysicsEngine,
    ScoringEngine,
)
from model import MODEL_PATH, predict


def analyze_shipment(shipment, all_shipments=None):
    physics = PhysicsEngine()
    document = DocumentEngine()
    behavior = BehaviorEngine()
    network = NetworkEngine()
    scoring = ScoringEngine()

    results = {
        "physics": physics.check(shipment),
        "document": document.check(shipment),
        "behavior": behavior.check(shipment),
        "network": network.check(shipment, all_shipments),
    }

    try:
        ml_prob = predict(shipment)
    except Exception:
        ml_prob = None

    final = scoring.calculate(results, ml_prob)

    explainer = AIExplainer()
    explanation = explainer.explain(results, final["risk_score"])

    return {
        "shipment_id": shipment.get("shipment_id"),
        "risk_score": final["risk_score"],
        "classification": final["classification"],
        "action": final["recommended_action"],
        "engine_scores": final["engine_breakdown"],
        "explanation": explanation,
        "details": {k: v["details"] for k, v in results.items() if v["details"]},
    }


def summarize_shipments(shipments):
    if not shipments:
        raise ValueError("No shipments provided for analysis")

    results = [analyze_shipment(shipment, shipments) for shipment in shipments]
    counts = Counter(result["classification"] for result in results)
    top_result = max(results, key=lambda item: item["risk_score"])
    top_shipment = next(
        (shipment for shipment in shipments if shipment.get("shipment_id") == top_result["shipment_id"]),
        shipments[0],
    )

    return {
        "summary": {
            "total_shipments": len(shipments),
            "high_risk_alerts": counts.get("HIGH", 0),
            "medium_risk": counts.get("MEDIUM", 0),
            "cleared_shipments": counts.get("LOW", 0),
        },
        "top_result": {
            "risk_score": top_result["risk_score"],
            "status": top_result["classification"],
            "recommended_action": top_result["action"],
            "engine_breakdown": {
                key.capitalize(): value for key, value in top_result["engine_scores"].items()
            },
            "explanation": top_result["explanation"],
            "shipment_details": {
                "commodity": top_shipment.get("commodity", "Unknown"),
                "origin": top_shipment.get("declared_origin_country")
                or top_shipment.get("actual_origin_country")
                or "Unknown",
                "quantity": top_shipment.get("invoice_quantity")
                or top_shipment.get("bol_quantity")
                or top_shipment.get("igm_quantity")
                or "Unknown",
                "value": top_shipment.get("invoice_value")
                or top_shipment.get("declared_value_usd")
                or top_shipment.get("igm_value")
                or "Unknown",
                "shipment_id": top_shipment.get("shipment_id", "N/A"),
            },
        },
        "results": results,
    }


def run_demo():
    print("=" * 70)
    print("GHOSTSHIP - PORT INTELLIGENCE SYSTEM")
    print("   DP World Hackathon Demo")
    print("=" * 70)

    print("\nRUNNING 5 DEMO SCENARIOS\n")

    for i, scenario in enumerate(SCENARIOS, 1):
        print(f"{'-' * 70}")
        print(f"SCENARIO {i}: {scenario['name']}")
        print(f"Description: {scenario['description']}")
        print(f"{'-' * 70}")

        result = analyze_shipment(scenario["data"], [s["data"] for s in SCENARIOS])

        status = (
            "FRAUD"
            if result["classification"] == "HIGH"
            else "MEDIUM"
            if result["classification"] == "MEDIUM"
            else "LOW"
        )

        print(f"\nRisk Score: {result['risk_score']}/100 {status}")
        print(f"Action: {result['action']}")
        print(f"\nAI Explanation: {result['explanation']}")

        print("\nEngine Breakdown:")
        for engine, score in result["engine_scores"].items():
            bar = "#" * int(score * 20) + "." * (20 - int(score * 20))
            print(f"  {engine:12} [{bar}] {score:.2f}")

        if result["details"]:
            print("\nDetected Anomalies:")
            for engine, details in result["details"].items():
                for _key, value in details.items():
                    print(f"  * {engine}: {value}")
        print()


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--train":
        import train

        train.train()
    elif len(sys.argv) > 1 and sys.argv[1] == "--demo":
        if not MODEL_PATH.exists():
            print("Model not found. Running demo with rule-based scoring only.\n")
        run_demo()
    else:
        print("GhostShip Fraud Detection")
        print("Usage:")
        print("  python main.py --train    # Train model")
        print("  python main.py --demo     # Run demo")


if __name__ == "__main__":
    main()
