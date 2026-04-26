import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startCloudKv } from "./lib/cloudKv";

startCloudKv();

createRoot(document.getElementById("root")!).render(<App />);
