import { useEffect, useState } from "react";
import "./App.css";
import {
  Activity,
  Battery,
  Clock,
  Power,
  Radio,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import mqtt from "mqtt";
import { limitToLast, onValue, query, ref } from "firebase/database";
import { database } from "./utils/firebase";

function App() {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);

  const [lampStates, setLampStates] = useState(Array(20).fill(false));

  // Define data type
  interface SensorData {
    time: string;
    voltage: number;
    current: number;
    power: number;
    energy: number;
    frequency: number;
    powerFactor: number;
  }

  interface FirebaseEntry {
    voltage: number;
    current: number;
    power: number;
    energy: number;
    frequency: number;
    powerfactor: number;
  }

  const [data, setData] = useState<SensorData[]>([]);

  const currentData = data[data.length - 1] || {
    time: new Date().toISOString(),
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    frequency: 0,
    powerFactor: 0,
  };

  const metrics = [
    {
      key: "voltage",
      label: "Voltage",
      emoji: "⚡",
      value: currentData?.voltage.toFixed(2),
      lastUpdated: currentData?.time,
      unit: "V",
      color: "#3B82F6",
      icon: Zap,
      gradient: "from-blue-500 to-blue-600",
      topic: "LCS/sensorLCS/PM/voltage",
    },
    {
      key: "current",
      label: "Current",
      emoji: "🔋",
      value: currentData?.current.toFixed(2),
      lastUpdated: currentData?.time,
      unit: "A",
      color: "#10B981",
      icon: Activity,
      gradient: "from-emerald-500 to-emerald-600",
      topic: "LCS/sensorLCS/PM/current",
    },
    {
      key: "power",
      label: "Power",
      emoji: "💡",
      value: currentData?.power.toFixed(2),
      lastUpdated: currentData?.time,
      unit: "W",
      color: "#F59E0B",
      icon: Power,
      gradient: "from-amber-500 to-amber-600",
      topic: "LCS/sensorLCS/PM/power",
    },
    {
      key: "energy",
      label: "Energy",
      emoji: "🔌",
      value: currentData?.energy.toFixed(2),
      lastUpdated: currentData?.time,
      unit: "kWh",
      color: "#EF4444",
      icon: Battery,
      gradient: "from-red-500 to-red-600",
      topic: "LCS/sensorLCS/PM/energy",
    },
    {
      key: "frequency",
      label: "Frequency",
      emoji: "📡",
      value: currentData?.frequency.toFixed(2),
      lastUpdated: currentData?.time,
      unit: "Hz",
      color: "#8B5CF6",
      icon: Radio,
      gradient: "from-purple-500 to-purple-600",
      topic: "LCS/sensorLCS/PM/frequency",
    },
    {
      key: "powerFactor",
      label: "Power Factor",
      emoji: "📊",
      value: currentData?.powerFactor.toFixed(2),
      lastUpdated: currentData?.time,
      unit: "",
      color: "#06B6D4",
      icon: TrendingUp,
      gradient: "from-cyan-500 to-cyan-600",
      topic: "LCS/sensorLCS/PM/powerfactor",
    },
  ];

  // Simulate real-time data updates
  useEffect(() => {
    const client = mqtt.connect(
      "wss://5fee0bbd48cc456fb4365291207b4a6e.s1.eu.hivemq.cloud:8884/mqtt",
      {
        username: "adminLCS",
        password: "adminLCS123",
      }
    );

    setClient(client);

    client.on("connect", () => {
      client.subscribe(`LCS/relayLCS/mode/command`, (err) => {
        if (err) {
          console.log("error", err);
        }
      });

      client.subscribe(`LCS/relayLCS/control`, (err) => {
        if (err) {
          console.log("error", err);
        }
      });

      lampStates.forEach((_, index) => {
        client.subscribe(`LCS/relayLCS/status/${index}`, (err) => {
          if (err) {
            console.log("error", err);
          }
        });
      });

      metrics.forEach(({ topic }) => {
        client.subscribe(topic, (err) => {
          if (err) {
            console.log("error", err);
          }
        });
      });
    });

    client.on("error", (err) => console.log(err));

    client.on("message", (topic, message) => {
      if (topic === "LCS/relayLCS/mode/command") {
        setIsAutoMode(message.toString() === "AUTO");
      }

      if (topic.includes("LCS/relayLCS/status")) {
        console.log(`Received status for lamp ${topic}: ${message.toString()}`);

        setLampStates((prev) => {
          return prev.map((item, index) => {
            if (topic.includes(`LCS/relayLCS/status/${index}`)) {
              return message.toString() === "ON";
            }
            return item;
          });
        });
      }
    });

    const fetchData = async () => {
      const dataRef = query(ref(database, "/sensor_data"), limitToLast(20));
      try {
        onValue(dataRef, (snapshot) => {
          const data = snapshot.val();

          if (data) {
            const processedData: SensorData[] = [];
            Object.entries(data).forEach(([key, entry]) => {
              const firebaseEntry = entry as FirebaseEntry;
              processedData.push({
                time: key,
                voltage: firebaseEntry.voltage || 0,
                current: firebaseEntry.current || 0,
                energy: firebaseEntry.energy || 0,
                frequency: firebaseEntry.frequency || 0,
                power: firebaseEntry.power || 0,
                powerFactor: firebaseEntry.powerfactor || 0,
              });
            });
            setData(processedData);
          }

          // Calculate average
          // const avgValue = metricData.length > 0
          //   ? (metricData.reduce((a, b) => a + b, 0) / metricData.length).toFixed(1)
          //   : 0;
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleIsAutoModeChange = () => {
    client?.publish(
      `LCS/relayLCS/mode/command`,
      !isAutoMode ? "AUTO" : "MANUAL",
      { retain: true },
      (err) => {
        if (err) {
          console.log("error", err);
        }
      }
    );

    setIsAutoMode(!isAutoMode);
  };

  const toggleLamp = (index: number) => {
    if (!isAutoMode) {
      // Only allow toggling in manual mode
      const status = lampStates[index];

      setLampStates((prev) => {
        const newStates = [...prev];
        newStates[index] = !newStates[index];
        return newStates;
      });

      client?.publish(
        `LCS/relayLCS/control`,
        !status ? `RELAY_${index}:ON` : `RELAY_${index}:OFF`,
        { retain: true },
        (err) => {
          if (err) {
            console.log("error", err);
          }
        }
      );

      client?.publish(
        `LCS/relayLCS/status/${index}`,
        !status ? `ON` : `OFF`,
        { retain: true },
        (err) => {
          if (err) {
            console.log("error", err);
          }
        }
      );
    }
  };

  return (
    <div className="min-h-screen  text-white sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            LCS Monitoring Dashboard
          </h1>
          <p className="text-gray-400">Real-time IoT monitoring</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {metrics.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <div
                key={metric.key}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className="flex flex-col gap-4 items-center justify-between mb-4 sm:flex-row sm:gap-0 sm:items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-r ${metric.gradient} shadow-lg`}
                    >
                      <IconComponent size={24} className="text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{metric.emoji}</span>
                      <p className="text-gray-400 text-sm font-medium">
                        {metric.label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 sm:flex-col sm:items-end">
                    <p
                      className="text-3xl font-bold"
                      style={{ color: metric.color }}
                    >
                      {metric.value}
                    </p>
                    <p className="text-lg text-gray-400">{metric.unit}</p>
                  </div>
                </div>

                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${metric.gradient} rounded-full transition-all duration-500`}
                    style={{
                      width: `${Math.min(
                        100,
                        (parseFloat(metric.value) /
                          (metric.key === "voltage"
                            ? 270
                            : metric.key === "current"
                            ? 7
                            : metric.key === "power"
                            ? 1500
                            : metric.key === "energy"
                            ? 150
                            : metric.key === "frequency"
                            ? 51
                            : 1)) *
                          100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center flex-wrap gap-2 mb-4 justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full bg-gradient-to-r ${metric.gradient}`}
                  ></div>
                  {metric.label} Chart
                </h3>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                  <Clock className="w-3" /> last update: {metric.lastUpdated}
                </p>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metric.key}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={{ fill: metric.color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: metric.color }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Mode */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500"></div>
              <span>🎛️ Control Mode</span>
            </h3>

            <div className="relative">
              {/* Toggle Switch */}
              <div className="flex items-center justify-center mb-4">
                <button
                  onClick={handleIsAutoModeChange}
                  className={`relative inline-flex h-16 w-32 items-center rounded-full p-1 transition-all duration-500 transform hover:scale-105 ${
                    isAutoMode
                      ? "bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 shadow-lg shadow-green-500/30"
                      : "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-lg shadow-amber-500/30"
                  }`}
                >
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center transform rounded-full bg-white shadow-xl transition-all duration-500 ${
                      isAutoMode ? "translate-x-16" : "translate-x-1.5"
                    }`}
                  >
                    <span className="text-2xl">{isAutoMode ? "🤖" : "👤"}</span>
                  </span>
                </button>
              </div>

              {/* Labels */}
              <div className="flex justify-between text-center">
                <div
                  className={`flex-1 transition-all duration-300 ${
                    !isAutoMode ? "text-orange-400 font-bold" : "text-gray-400"
                  }`}
                >
                  <div className="text-lg">👤</div>
                  <div className="text-sm font-medium">Manual</div>
                </div>
                <div
                  className={`flex-1 transition-all duration-300 ${
                    isAutoMode ? "text-green-400 font-bold" : "text-gray-400"
                  }`}
                >
                  <div className="text-lg">🤖</div>
                  <div className="text-sm font-medium">Auto</div>
                </div>
              </div>
            </div>

            {/* Status Display */}
            <div
              className={`mt-6 p-4 rounded-xl border-2 transition-all duration-300 ${
                isAutoMode
                  ? "border-green-400/30 bg-green-400/10 text-green-400"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-400"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">{isAutoMode ? "🤖" : "🎯"}</span>
                <span className="font-semibold">
                  {isAutoMode
                    ? "Automatic Control Active"
                    : "Manual Control Active"}
                </span>
              </div>
              <p className="text-center text-sm mt-1 opacity-80">
                {isAutoMode
                  ? "System managing all devices"
                  : "Manual control enabled"}
              </p>
            </div>
          </div>

          {/* Lamp Controls */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"></div>
              <span>💡 Lamp Controls</span>
            </h3>

            {/* Auto Mode Overlay Message */}
            {isAutoMode && (
              <div className="mb-4 p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 text-blue-400 font-semibold">
                  <span className="text-xl">🔒</span>
                  <span>Auto Mode Active - Manual control disabled</span>
                </div>
                <p className="text-sm text-blue-300 mt-1">
                  Switch to Manual mode to control lamps
                </p>
              </div>
            )}

            <div
              className={`grid grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3 transition-all duration-300 ${
                isAutoMode ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {lampStates.map((isOn, index) => (
                <button
                  key={index}
                  onClick={() => toggleLamp(index)}
                  disabled={isAutoMode}
                  className={`relative p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                    isOn
                      ? "border-yellow-400 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 shadow-lg shadow-yellow-400/20"
                      : "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                  } ${isAutoMode ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Power
                    size={16}
                    className={`mx-auto transition-colors duration-300 ${
                      isOn ? "text-yellow-400" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`block text-xs mt-1 font-medium ${
                      isOn ? "text-yellow-400" : "text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {isOn && (
                    <div className="absolute inset-0 rounded-xl bg-yellow-400/10 animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Lamps On:</span>
                <span className="font-bold text-yellow-400">
                  {lampStates.filter(Boolean).length}/20
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`font-bold ${
                    lampStates.filter(Boolean).length > 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {lampStates.filter(Boolean).length > 0
                    ? "🟢 Active"
                    : "🔴 Standby"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
