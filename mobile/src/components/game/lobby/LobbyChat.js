import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { WsUserSendMsgRoom } from '../../../api/wsEmitters';
import {
  buttonStyles,
  colors,
  dividerStyle,
  fonts,
  inputStyle,
  spacing,
  typography,
} from '../../../styles/theme';

const ChatMessage = memo(function ChatMessage({ text }) {
  return <Text style={styles.message}>• {text}</Text>;
});

const LobbyChat = memo(function LobbyChat({ messages = [] }) {
  const [draft, setDraft] = useState('');
  const flatListRef = useRef(null);

  const normalized = useMemo(() => {
    return (messages || []).map((m, idx) => ({ id: `${idx}_${String(m).slice(0, 20)}`, text: String(m) }));
  }, [messages]);

  // Auto-scroll to newest message when messages change
  useEffect(() => {
    if (normalized.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [normalized.length]);

  const send = useCallback(() => {
    const msg = draft.trim();
    if (!msg) return;
    WsUserSendMsgRoom(msg);
    setDraft('');
  }, [draft]);

  const renderItem = useCallback(({ item }) => <ChatMessage text={item.text} />, []);
  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Room Chat</Text>

      <View style={styles.chatBox}>
        {normalized.length ? (
          <FlatList
            ref={flatListRef}
            data={normalized}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <Text style={styles.empty}>No messages yet.</Text>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Send a message"
          placeholderTextColor={colors.creamMuted}
          maxLength={300}
        />
        <Pressable style={[buttonStyles.base, buttonStyles.primary, buttonStyles.small, !draft.trim() && buttonStyles.disabled]} onPress={send}>
          <Text style={[buttonStyles.primaryText, buttonStyles.smallText]}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
});

export default LobbyChat;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 13,
  },
  chatBox: {
    ...inputStyle,
    borderRadius: 10,
    minHeight: 96,
    maxHeight: 180,
    padding: spacing.sm,
  },
  empty: {
    ...typography.captionSmall,
    fontFamily: fonts.body,
    color: colors.creamMuted,
  },
  message: {
    fontFamily: fonts.body,
    color: colors.cream,
    fontSize: 13,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...inputStyle,
    borderRadius: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
