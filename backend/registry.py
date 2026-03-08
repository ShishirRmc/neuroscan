import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class ModelRegistry:
    def __init__(self, registry_file="models/registry.json"):
        self.registry_file = Path(registry_file)
        self.registry_data = self._load()

    def _load(self) -> dict:
        if not self.registry_file.exists():
            return {"current_prod": "v0.1.0"}
        try:
            with open(self.registry_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load registry: {e}")
            return {"current_prod": "v0.1.0"}

    def get_production_version(self) -> str:
        return self.registry_data.get("current_prod", "v0.1.0")

registry = ModelRegistry()
