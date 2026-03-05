import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type SpinnerProps = {
  text?: string;
};

const Spinner: React.FC<SpinnerProps> = ({ text = "Loading" }) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.screen}>
      <style>{css}</style>

      <div style={styles.container}>
        <div className="orbit-ring" />

        <div className="pin-wrapper">
          <svg width="52" height="62" viewBox="0 0 52 62">
            <ellipse cx="26" cy="57" rx="10" ry="4" fill="rgba(0,0,0,0.2)" />
            <path
              d="M26 2C14.954 2 6 10.954 6 22C6 35.5 26 56 26 56C26 56 46 35.5 46 22C46 10.954 37.046 2 26 2Z"
              fill="#cb552d"
            />
            <path
              d="M26 14 L32 18 L32 26 L26 30 L20 26 L20 18 Z"
              fill="#ffffff"
            />
            <defs>
              <linearGradient id="pinGradient" x1="6" y1="2" x2="46" y2="56">
                <stop offset="0%" stopColor="#FF6B2B" />
                <stop offset="50%" stopColor="#E8440A" />
                <stop offset="100%" stopColor="#B83200" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="ripple ripple-1" />
        <div className="ripple ripple-2" />
        <div className="ripple ripple-3" />
      </div>

      <div style={styles.brand}>
        <span style={styles.haz}>Haz</span>
        <span style={styles.spot}>Spot</span>
      </div>

      <p style={styles.loadingText}>
        {text}
        <span style={styles.dots}>{dots}</span>
      </p>
    </div>
  );
};

const css = `
.orbit-ring {
  position:absolute;
  width:110px;
  height:110px;
  border-radius:50%;
  border:2px solid transparent;
  border-top-color:#35417f;
  border-right-color:rgba(53,65,127,0.3);
  animation:orbit 1.4s infinite;
}

.pin-wrapper {
  position:relative;
  z-index:2;
  animation:bounce 1.4s infinite;
}

.ripple{
  position:absolute;
  bottom:-12px;
  left:50%;
  transform:translateX(-50%);
  border-radius:50%;
  background:rgba(53,65,127,0.18);
  animation:ripple 1.8s infinite;
}

.ripple-1{width:40px;height:14px;}
.ripple-2{width:70px;height:20px;animation-delay:.3s;}
.ripple-3{width:100px;height:28px;animation-delay:.6s;}

@keyframes orbit{
0%{transform:rotate(0)}
100%{transform:rotate(360deg)}
}

@keyframes bounce{
0%,100%{transform:translateY(0)}
50%{transform:translateY(-14px)}
}

@keyframes ripple{
0%{opacity:.7;transform:translateX(-50%) scale(.6)}
100%{opacity:0;transform:translateX(-50%) scale(1.4)}
}
`;

const styles: { [key: string]: CSSProperties } = {
  screen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#ffffff",
    gap: "20px",
  },
  container: {
    position: "relative",
    width: "120px",
    height: "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: "28px",
    fontWeight: "800",
  },
  haz: {
    color: "#cb552d",
  },
  spot: {
    color: "#35417f",
  },
  loadingText: {
    color: "#35417f",
    fontSize: "13px",
    letterSpacing: "0.08em",
  },
  dots: {
    display: "inline-block",
    width: "18px",
  },
};

export default Spinner;