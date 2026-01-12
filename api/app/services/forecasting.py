from __future__ import annotations
import pandas as pd
from typing import Any, Dict

def run_forecast_from_dataframe(
    df: pd.DataFrame,
    mapping: dict,
    horizon_days: int,
) -> Dict[str, Any]:
    """
    Must return the SAME shape your frontend expects:
    {
      "mode": "per_product",
      "results": {
         "<item>": {"forecast": [{"ds": "...", "yhat": ..., "yhat_lower": ..., "yhat_upper": ...}, ...]}
      }
    }
    """
    # TODO: replace this body with the exact logic currently inside app/routers/forecast.py
    # This file is just the shared wrapper.

    raise NotImplementedError("Move logic from forecast.py into this function")