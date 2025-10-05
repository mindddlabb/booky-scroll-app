import { useState, useEffect } from "react";
import { MessageCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ConversationCard from "@/components/ConversationCard";

interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  apartmentId?: string;
  apartmentThumbnail?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const Inbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(full_name, profile_picture),
          receiver:profiles!messages_receiver_id_fkey(full_name, profile_picture),
          apartment:apartments(media)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("sent_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation_id
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((message: any) => {
        const convId = message.conversation_id;
        
        if (!conversationMap.has(convId)) {
          const isUserSender = message.sender_id === user.id;
          const otherUser = isUserSender ? message.receiver : message.sender;
          const apartmentMedia = message.apartment?.media?.[0];

          conversationMap.set(convId, {
            conversationId: convId,
            otherUserId: isUserSender ? message.receiver_id : message.sender_id,
            otherUserName: otherUser?.full_name || "User",
            otherUserAvatar: otherUser?.profile_picture,
            apartmentId: message.apartment_id,
            apartmentThumbnail: apartmentMedia?.url,
            lastMessage: message.content,
            lastMessageTime: message.sent_at,
            unreadCount: 0,
          });
        }
      });

      // Count unread messages for each conversation
      for (const [convId, conv] of conversationMap) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("receiver_id", user.id)
          .eq("read_status", false);

        conv.unreadCount = count || 0;
      }

      const conversationsList = Array.from(conversationMap.values());
      setConversations(conversationsList);
      setFilteredConversations(conversationsList);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter((conv) =>
        conv.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleConversationClick = (conversation: Conversation) => {
    navigate(`/chat/${conversation.conversationId}`, {
      state: {
        otherUserId: conversation.otherUserId,
        otherUserName: conversation.otherUserName,
        apartmentId: conversation.apartmentId,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        <h1 className="text-3xl font-bold">Messages</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 h-20 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "No conversations found" : "No messages yet"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try a different search term"
                : "Your conversations with hosts will appear here"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {refreshing && (
              <div className="text-center text-sm text-muted-foreground py-2">
                Refreshing...
              </div>
            )}
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.conversationId}
                listerName={conversation.otherUserName}
                listerAvatar={conversation.otherUserAvatar}
                apartmentThumbnail={conversation.apartmentThumbnail}
                lastMessage={conversation.lastMessage}
                timestamp={conversation.lastMessageTime}
                unreadCount={conversation.unreadCount}
                onClick={() => handleConversationClick(conversation)}
              />
            ))}
          </div>
        )}

        {!loading && filteredConversations.length > 0 && (
          <button
            onClick={handleRefresh}
            className="w-full text-center text-sm text-primary hover:underline py-2"
            disabled={refreshing}
          >
            Pull to refresh
          </button>
        )}
      </div>
    </div>
  );
};

export default Inbox;
