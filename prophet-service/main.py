from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, List
import pandas as pd
from prophet import Prophet

app = FastAPI()

class Point(BaseModel):
    ds: str
    y: float

class ForecastRequest(BaseModel):
    horizon_days: int
    items: Dict[str, List[Point]]
    timezone: str | None = None


@app.post("/forecast")
def forecast(req: ForecastRequest):
    out = {"results": {}}

    for item, series in req.items.items():
        if not series:
            out["results"][item] = {"forecast": []}
            continue

        df = pd.DataFrame([{"ds": p.ds, "y": p.y} for p in series])
        df["ds"] = pd.to_datetime(df["ds"])

        m = Prophet()
        m.fit(df)

        future = m.make_future_dataframe(periods=req.horizon_days, freq="D")
        fcst = m.predict(future).tail(req.horizon_days)

        out["results"][item] = {
            "forecast": [
                {
                    "ds": row["ds"].strftime("%Y-%m-%d"),
                    "yhat": float(row["yhat"]),
                    "yhat_lower": float(row["yhat_lower"]),
                    "yhat_upper": float(row["yhat_upper"]),
                }
                for _, row in fcst.iterrows()
            ]
        }

    return out
@app.post("/forecast_hourly")
def forecast_hourly(req: ForecastRequest):
    out = {"results": {}}

    for item, series in req.items.items():
        if not series:
            out["results"][item] = {"forecast": []}
            continue

        df = pd.DataFrame([{"ds": p.ds, "y": p.y} for p in series])
        df["ds"] = pd.to_datetime(df["ds"], utc=True).dt.tz_localize(None)

        m = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False
        )
        m.fit(df)

        hours = req.horizon_days * 24
        future = m.make_future_dataframe(periods=hours, freq="H")
        fcst = m.predict(future).tail(hours)


        out["results"][item] = {
            "forecast": [
                {
                    "ds": row["ds"].isoformat(),
                    "yhat": float(row["yhat"]),
                    "yhat_lower": float(row["yhat_lower"]),
                    "yhat_upper": float(row["yhat_upper"]),
                }
                for _, row in fcst.iterrows()
            ]
        }

    return out
