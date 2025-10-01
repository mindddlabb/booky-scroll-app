import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const Inbox = () => {
  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        <h1 className="text-3xl font-bold">Messages</h1>

        <Card className="p-12 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
          <p className="text-muted-foreground">
            Your conversations with hosts will appear here
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Inbox;
