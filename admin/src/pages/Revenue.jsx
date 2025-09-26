import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Revenue = () => {
  const data = {
    labels: ["5 days ago", "4 days ago", "3 days ago", "2 days ago", "Yesterday"],
    datasets: [
      {
        label: "Transaction Amount",
        data: [2, 4, 2, 2, 5],
        borderColor: "rgba(59, 130, 246, 1)", // blue-500 from tailwind
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Transaction Amount Over Last 5 Days" },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Revenue</h1>


      <div className="mt-8 max-w-xl">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default Revenue;
