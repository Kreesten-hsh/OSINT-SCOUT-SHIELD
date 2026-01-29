import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; // Need to create this or mock it
import { Shield, Plus } from "lucide-react";

export default function RulesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Detection Rules</h1>
                    <p className="text-muted-foreground">Manage NLP patterns and scraping triggers.</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" /> New Rule
                </Button>
            </div>

            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Keyword Monitor: "Confidential"</h3>
                                <p className="text-xs text-muted-foreground">Triggers on dark web forums.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline">NLP-ENGINE-V2</Badge>
                            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
