import { useMemo, useState } from 'react';
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

export default function LobbyChat({ messages = [] }) {
  const [draft, setDraft] = useState('');

  const normalized = useMemo(() => {
    return (messages || []).map((m, idx) => ({ id: `${idx}_${String(m).slice(0, 20)}`, text: String(m) }));
  }, [messages]);

  const send = () => {
    const msg = draft.trim();
    if (!msg) return;
    WsUserSendMsgRoom(msg);
    setDraft('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Room Chat</Text>

      <View style={styles.chatBox}>
        {normalized.length ? (
          <FlatList
            data={normalized}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Text style={styles.message}>• {item.text}</Text>}
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
}

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
