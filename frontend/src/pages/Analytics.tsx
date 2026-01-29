import { Card } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

const DATA_DETECT = [
    { name: "Phishing", value: 400 },
    { name: "Malware", value: 300 },
    { name: "Fraud", value: 300 },
    { name: "Leak", value: 200 },
];
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Threat Analytics</h1>
                <p className="text-muted-foreground">Global insights and detection trends.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Threat Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={DATA_DETECT}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {DATA_DETECT.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Detection Velocity (24h)</h3>
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Chart Placeholder (Coming Soon)
                    </div>
                </Card>
            </div>
        </div>
    );
}
