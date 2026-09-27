import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, Bot, LifeBuoy, RotateCcw, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/colors';
import { backgrounds, fontSize, fontWeight, screenHeader } from '../theme/theme';
import {
  askSupportAssistant,
  SupportAssistantMessage,
} from '../api/support.service';

interface ChatMessage extends SupportAssistantMessage {
  id: string;
  sources?: string[];
  welcome?: boolean;
}

interface SupportAssistantChatScreenProps {
  onBack: () => void;
  onContactSupport: () => void;
}

const QUICK_PROMPTS = [
  'How do I create a trip?',
  'How do I add an expense?',
  'Where can I see payment history?',
];

export const SupportAssistantChatScreen: React.FC<SupportAssistantChatScreenProps> = ({
  onBack,
  onContactSupport,
}) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I can help with trips, expenses, payments, and account settings. What would you like to know?',
      welcome: true,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, sending, error]);

  const sendQuestion = async (question: string, alreadyAdded = false) => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || sending) return;

    const nextMessages = alreadyAdded
      ? messages
      : [
          ...messages,
          { id: `user-${Date.now()}`, role: 'user' as const, content: normalizedQuestion },
        ];

    if (!alreadyAdded) setMessages(nextMessages);
    setDraft('');
    setSending(true);
    setError('');
    setFailedQuestion('');

    try {
      const conversation = nextMessages
        .filter((message) => !message.welcome)
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));
      const reply = await askSupportAssistant(conversation);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply.answer,
          sources: reply.sources,
        },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reach the assistant. Please try again.');
      setFailedQuestion(normalizedQuestion);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    void sendQuestion(draft);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 0) + screenHeader.topPadding }]}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityLabel="Back to Help Center">
          <ArrowLeft size={21} color={colors.slate900} />
        </Pressable>
        <View style={styles.headerIcon}>
          <Bot size={21} color={colors.primary600} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Ask Triptual</Text>
          <Text style={styles.headerSubtitle}>Help with trips, expenses & your account</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.conversation}
        contentContainerStyle={styles.conversationContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <View key={message.id} style={[styles.messageRow, isUser && styles.userMessageRow]}>
              {!isUser && <View style={styles.botAvatar}><Bot size={16} color={colors.primary700} /></View>}
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.content}</Text>
                {!!message.sources?.length && (
                  <Text style={styles.sourceText}>Help topics: {message.sources.join(', ')}</Text>
                )}
              </View>
            </View>
          );
        })}

        {messages.length === 1 && (
          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable key={prompt} style={styles.quickPrompt} onPress={() => void sendQuestion(prompt)}>
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {sending && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary600} />
            <Text style={styles.loadingText}>Looking that up...</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void sendQuestion(failedQuestion, true)}>
              <RotateCcw size={15} color={colors.primary700} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.contactButton} onPress={onContactSupport}>
        <LifeBuoy size={17} color={colors.primary700} />
        <Text style={styles.contactButtonText}>Contact support team</Text>
      </Pressable>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask a question..."
          placeholderTextColor={colors.slate400}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
          editable={!sending}
        />
        <Pressable
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          accessibilityLabel="Send question"
        >
          <Send size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: backgrounds.screen },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: screenHeader.bottomPadding,
    backgroundColor: backgrounds.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    gap: 10,
  },
  backButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { color: colors.slate900, fontSize: fontSize.sectionTitle, fontWeight: fontWeight.bold },
  headerSubtitle: { color: colors.slate500, fontSize: fontSize.caption, marginTop: 2 },
  conversation: { flex: 1 },
  conversationContent: { padding: 16, paddingBottom: 24, gap: 14 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '94%' },
  userMessageRow: { alignSelf: 'flex-end' },
  botAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 11, maxWidth: '100%' },
  assistantBubble: { backgroundColor: backgrounds.card, borderWidth: 1, borderColor: colors.slate200, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: colors.primary600, borderBottomRightRadius: 4 },
  messageText: { color: colors.slate800, fontSize: fontSize.inputText, lineHeight: 21 },
  userMessageText: { color: '#FFFFFF' },
  sourceText: { color: colors.slate500, fontSize: fontSize.caption, marginTop: 8, lineHeight: 16 },
  quickPrompts: { gap: 8, marginLeft: 36, marginTop: 2 },
  quickPrompt: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: backgrounds.card, borderWidth: 1, borderColor: colors.primary200, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 9 },
  quickPromptText: { color: colors.primary700, fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 36 },
  loadingText: { color: colors.slate500, fontSize: fontSize.caption },
  errorBox: { alignSelf: 'stretch', padding: 12, backgroundColor: '#FEF2F2', borderRadius: radii.md, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#991B1B', fontSize: fontSize.caption, lineHeight: 18 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingTop: 10 },
  retryText: { color: colors.primary700, fontSize: fontSize.caption, fontWeight: fontWeight.bold },
  contactButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10, backgroundColor: backgrounds.card, borderTopWidth: 1, borderTopColor: colors.slate200 },
  contactButtonText: { color: colors.primary700, fontSize: fontSize.caption, fontWeight: fontWeight.bold },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 10, backgroundColor: backgrounds.card, borderTopWidth: 1, borderTopColor: colors.slate200 },
  input: { flex: 1, maxHeight: 110, minHeight: 44, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, borderWidth: 1, borderColor: colors.slate300, borderRadius: radii.lg, color: colors.slate900, fontSize: fontSize.inputText, backgroundColor: backgrounds.card },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary600 },
  sendButtonDisabled: { opacity: 0.45 },
});