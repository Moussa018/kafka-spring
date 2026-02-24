import { useEffect, useRef, useState } from "react";
import "./Analytics.css";

const PAGES = ["P1", "P2"];
const COLORS = {
  P1: { stroke: "rgba(0, 255, 170, 1)", fill: "rgba(0, 255, 170, 0.15)" },
  P2: { stroke: "rgba(255, 80, 120, 1)", fill: "rgba(255, 80, 120, 0.15)" },
};

export default function Analytics() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const [connected, setConnected] = useState(false);
  const [lastValues, setLastValues] = useState({ P1: 0, P2: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/smoothie/1.34.0/smoothie.min.js";
    script.async = true;
    script.onload = () => {
      if (canvasRef.current) initChart();
    };
    document.head.appendChild(script);

    return () => {
      if (chartRef.current) chartRef.current.stop();
      document.head.removeChild(script);
    };
  }, []);

  const initChart = () => {
    const chart = new window.SmoothieChart({
      responsive: true,
      millisPerPixel: 60,
      grid: {
        fillStyle: "transparent",
        strokeStyle: "rgba(255,255,255,0.05)",
        verticalSections: 5,
        borderVisible: false,
      },
      labels: {
        fillStyle: "rgba(255,255,255,0.35)",
        fontSize: 11,
        fontFamily: "'Courier New', monospace",
      },
      tooltip: true,
      maxValueScale: 1.2,
      minValue: 0,
    });

    PAGES.forEach((page) => {
      const series = new window.TimeSeries();
      seriesRef.current[page] = series;
      chart.addTimeSeries(series, {
        strokeStyle: COLORS[page].stroke,
        fillStyle: COLORS[page].fill,
        lineWidth: 2.5,
      });
    });

    chart.streamTo(canvasRef.current, 1000);
    chartRef.current = chart;
  };

  useEffect(() => {
    const evtSource = new EventSource("/analytics");

    evtSource.onmessage = (event) => {
      setConnected(true);
      setError(null);
      const data = JSON.parse(event.data);
      const now = new Date().getTime();

      const newVals = {};
      PAGES.forEach((page) => {
        const val = data[page] ?? 0;
        newVals[page] = val;
        if (seriesRef.current[page]) {
          seriesRef.current[page].append(now, val);
        }
      });
      setLastValues(newVals);
    };

    evtSource.onerror = () => {
      setConnected(false);
      setError("Connexion perdue. Vérifiez que le backend tourne sur :8081");
    };

    return () => evtSource.close();
  }, []);

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <p className="analytics-subtitle">Kafka Streams</p>
        <h1 className="analytics-title">Page Analytics</h1>
        <div className="analytics-status">
          <span className={`status-dot ${connected ? "status-live" : "status-off"}`} />
          <span className={`status-label ${connected ? "status-live" : "status-off"}`}>
            {connected ? "LIVE" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      <div className="analytics-cards">
        {PAGES.map((page) => (
          <div
            key={page}
            className="analytics-card"
            style={{ borderColor: COLORS[page].stroke, background: COLORS[page].fill }}
          >
            <p className="card-label" style={{ color: COLORS[page].stroke }}>{page}</p>
            <p className="card-value" style={{ color: COLORS[page].stroke }}>{lastValues[page]}</p>
            <p className="card-unit">events / window</p>
          </div>
        ))}
      </div>

      <div className="analytics-chart-wrapper">
        <div className="chart-legend">
          {PAGES.map((page) => (
            <div key={page} className="legend-item">
              <div
                className="legend-line"
                style={{ background: COLORS[page].stroke, boxShadow: `0 0 6px ${COLORS[page].stroke}` }}
              />
              <span className="legend-label">{page}</span>
            </div>
          ))}
        </div>
        <canvas ref={canvasRef} width={750} height={300} className="analytics-canvas" />
      </div>

      {error && <div className="analytics-error">⚠ {error}</div>}
    </div>
  );
}