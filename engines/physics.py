class PhysicsEngine:
    def check(self, shipment):
        scores = []
        details = {}

        temp = shipment.get("temperature_celsius", 20)
        commodity = str(shipment.get("commodity", "")).lower()

        if "banana" in commodity and temp < 10:
            scores.append(0.95)
            details["temperature_anomaly"] = f"Bananas at {temp}C"

        weight = shipment.get("weight_kg", 0)
        volume = shipment.get("volume_cbm", 1)
        density = weight / volume if volume > 0 else 0

        if density > 2000:
            scores.append(0.85)
            details["density_anomaly"] = f"Density {density:.1f} kg/m^3"

        return {"score": max(scores) if scores else 0, "details": details}
