import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ridesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { rideId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    
    // Connect to Ride WebSocket
    const ws = new WebSocket(`ws://10.0.2.2:8000/ws/ride/`); // Adjust for your env
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join_ride',
        ride_id: Number(rideId)
      }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'chat_message' && data.ride_id === Number(rideId)) {
        setMessages(prev => {
          // Check if message already exists (to avoid double display if user sent it)
          if (prev.find(m => m.id === data.id || (m.content === data.content && m.sender_id === data.sender_id))) {
             return prev;
          }
          return [...prev, {
            id: Date.now(), // Temp ID
            sender: data.sender_id,
            sender_name: data.sender_name,
            content: data.content,
            created_at: data.created_at
          }];
        });
      }
    };

    return () => ws.close();
  }, [rideId]);

  const loadMessages = async () => {
    try {
      const resp = await ridesAPI.getChatHistory(Number(rideId));
      setMessages(resp.data);
    } catch (e) {
      console.log('Chat load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    const content = inputText.trim();
    setInputText('');

    try {
      await ridesAPI.sendMessage(Number(rideId), content);
      // The message will come back via WebSocket, no need to loadMessages()
    } catch (e) {
      Alert.alert('Xatolik', 'Xabar yuborilmadi');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === user?.id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}
        <Text style={[styles.messageText, isMe && { color: '#000' }]}>{item.content}</Text>
        <Text style={[styles.messageTime, isMe && { color: 'rgba(0,0,0,0.5)' }]}>
           {new Date(item.created_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={28} color="#FFB800" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Xabarlar</Text>
            <View style={{ width: 40 }} />
        </View>

        {loading ? (
            <ActivityIndicator style={{ flex: 1 }} color="#FFB800" />
        ) : (
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />
        )}

        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
                <TextInput
                    style={styles.input}
                    placeholder="Xabar yozing..."
                    placeholderTextColor="#666"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
                    onPress={handleSend}
                    disabled={!inputText.trim() || sending}
                >
                    <Ionicons name="send" size={20} color="#000" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#1A1A1A'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  listContent: { padding: 20 },
  messageBubble: { 
    maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 15,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2
  },
  myMessage: { 
    alignSelf: 'flex-end', backgroundColor: '#FFB800', 
    borderBottomRightRadius: 4 
  },
  theirMessage: { 
    alignSelf: 'flex-start', backgroundColor: '#1A1A1A', 
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#333' 
  },
  senderName: { fontSize: 11, fontWeight: '700', color: '#FFB800', marginBottom: 4, textTransform: 'uppercase' },
  messageText: { fontSize: 15, color: '#E2E8F0', lineHeight: 20 },
  messageTime: { fontSize: 10, color: '#666', alignSelf: 'flex-end', marginTop: 4 },
  inputRow: { 
    flexDirection: 'row', alignItems: 'flex-end', padding: 15, gap: 10,
    borderTopWidth: 1, borderTopColor: '#1A1A1A', backgroundColor: '#0A0A0A'
  },
  input: { 
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 20,
    paddingVertical: 10, maxHeight: 100, color: '#FFF', fontSize: 15,
    borderWidth: 1, borderColor: '#333'
  },
  sendBtn: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFB800',
    justifyContent: 'center', alignItems: 'center' 
  }
});
