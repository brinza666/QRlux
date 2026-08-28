import { createRoot } from "react-dom/client";
import "../src/styles.css";
import "./mobile.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(<App />);
