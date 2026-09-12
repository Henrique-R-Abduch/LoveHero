import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AgeGate } from "./components/AgeGate";
import { Landing } from "./routes/Landing";
import { Room } from "./routes/Room";
import { Terms } from "./routes/Terms";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/terms" element={<Terms />} />
        <Route
          path="/*"
          element={
            <AgeGate>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/r/:roomId" element={<Room />} />
              </Routes>
            </AgeGate>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
