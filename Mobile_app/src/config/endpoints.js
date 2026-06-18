// Central place for backend endpoints.
// Swap these between local dev and the deployed Render instances.
//
// Local dev (with `adb reverse tcp:3000 tcp:3000` / `tcp:8000 tcp:8000`):
//   EXPRESS_BASE_URL = "http://localhost:3000"
//   FASTAPI_URL      = "http://localhost:8000"

// Express server (Node) deployed on Render
export const EXPRESS_BASE_URL = "https://mindscope-express.onrender.com";
export const EXPRESS_API_URL = `${EXPRESS_BASE_URL}/api`;

// FastAPI AI microservice deployed on Render
export const FASTAPI_URL = "https://mindscope-fastapi.onrender.com";
