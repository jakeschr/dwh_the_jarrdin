from dotenv import load_dotenv
from app.config.settings import settings
import uvicorn

load_dotenv()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
