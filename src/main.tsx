import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { vstanovytyLovcaPomylok } from "./lib/zhurnaly";
import "./index.css";

// Тиждень 5: ловимо помилки «в тіні» і пишемо в лог (панель моніторингу)
vstanovytyLovcaPomylok();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
