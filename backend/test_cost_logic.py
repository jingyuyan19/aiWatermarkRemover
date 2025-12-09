import models
from schemas import JobCreate

# Mock data
hq_job = JobCreate(quality="e2fgvi_hq")
fast_job = JobCreate(quality="lama")
unknown_job = JobCreate(quality="super_ultra_4k")

print(f"HQ Cost: {models.CREDIT_COSTS.get(hq_job.quality, 1)}")
print(f"Fast Cost: {models.CREDIT_COSTS.get(fast_job.quality, 1)}")
print(f"Unknown Cost: {models.CREDIT_COSTS.get(unknown_job.quality, 1)}")
