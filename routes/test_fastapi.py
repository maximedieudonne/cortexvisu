from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class PackageRequest(BaseModel):
    package_name: str

@app.post("/import-package/")
def import_package(payload: PackageRequest):
    return {"received": payload.package_name}