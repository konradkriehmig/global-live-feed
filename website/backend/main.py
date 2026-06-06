from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import binance, earthquakes, thinkcentre

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(binance.router)
app.include_router(earthquakes.router)
app.include_router(thinkcentre.router)

@app.get("/health")
def health():
    return {"status": "ok"}